// ==========================================================
// AI 音準資源製作器 - 後端 v5.1 (環境變數優化版本)
// ==========================================================
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const { exec } = require('child_process');
const { SpeechClient } = require('@google-cloud/speech');
// 使用從中間件導入的 performanceMonitor
const { performanceMonitor } = require('./middleware/performanceMonitor');
const { errorHandler } = require('./middleware/errorHandler');
// 從新的配置結構導入
const configModule = require('./config');
const { validateConfig } = require('./config/init');

const app = express();
const PORT = configModule.server.port;

let speechClient = new SpeechClient();

// 使用從配置導入的設定
app.use(express.static(path.join(__dirname, 'public')));
app.use(performanceMonitor);

// 檔案驗證中間件
const validateFile = (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({ error: '沒有上傳檔案' });
    }
    
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a'];
    if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ error: '不支援的檔案格式，請上傳 MP3、WAV 或 M4A 檔案' });
    }
    
    const maxSize = configModule.limits.maxFileSize;
    if (req.file.size > maxSize) {
        return res.status(400).json({ error: `檔案過大，請上傳小於 ${maxSize / 1024 / 1024}MB 的檔案` });
    }
    
    next();
};

// 簡單的速率限制
const rateLimit = new Map();
const RATE_LIMIT_WINDOW = configModule.limits.rateLimitWindow;
const RATE_LIMIT_MAX = configModule.limits.rateLimitMax;

const uploadLimiter = (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!rateLimit.has(clientIP)) {
        rateLimit.set(clientIP, { count: 0, resetTime: now + RATE_LIMIT_WINDOW });
    }
    
    const limit = rateLimit.get(clientIP);
    
    if (now > limit.resetTime) {
        limit.count = 0;
        limit.resetTime = now + RATE_LIMIT_WINDOW;
    }
    
    if (limit.count >= RATE_LIMIT_MAX) {
        return res.status(429).json({ error: '上傳次數過多，請稍後再試' });
    }
    
    limit.count++;
    next();
};

// 配置 multer
const upload = multer({ 
    dest: 'uploads/',
    limits: {
        fileSize: configModule.limits.maxFileSize,
        files: 1
    }
});

const runCommand = (command) => {
    console.log(`[+] 準備執行命令: ${command}`);
    return new Promise((resolve, reject) => {
        exec(command, { timeout: 600000 }, (error, stdout, stderr) => {
            if (error) {
                console.error(`[-] 命令執行錯誤: ${stderr}`);
                return reject(new Error(stderr));
            }
            console.log(`[✓] 命令執行成功: ${command}`);
            resolve(stdout);
        });
    });
};

const getLrcFromGoogleStreaming = (vocalsPath) => {
    return new Promise((resolve, reject) => {
        let lrcContent = '';
        const recognizeStream = speechClient.streamingRecognize({
            // 【修改】將取樣率改回 44100 Hz
            config: { encoding: 'LINEAR16', sampleRateHertz: 44100, languageCode: 'cmn-TW', enableWordTimeOffsets: true },
            interimResults: false,
        })
        .on('error', err => reject(new Error(`Google Speech Stream Error: ${err.message}`)))
        .on('data', data => {
            const result = data.results[0];
            if (result?.alternatives?.[0]?.words?.length > 0) {
                const alt = result.alternatives[0];
                const startTime = parseFloat(alt.words[0].startTime.seconds) + (alt.words[0].startTime.nanos || 0) / 1e9;
                const minutes = Math.floor(startTime / 60).toString().padStart(2, '0');
                const seconds = (startTime % 60).toFixed(2).padStart(5, '0');
                lrcContent += `[${minutes}:${seconds}]${alt.transcript}\n`;
            }
        })
        .on('end', () => {
            console.log("[✓] Google Speech Stream 處理結束。");
            resolve(lrcContent);
        });
        fs.createReadStream(vocalsPath).pipe(recognizeStream);
    });
};

const checkFile = async (filePath, stepName) => {
    try {
        const stats = await fsp.stat(filePath);
        if (stats.size > 100) {
            console.log(`[✓] ${stepName} 檔案檢查通過: ${filePath}`);
            return true;
        } else {
            console.warn(`[!] ${stepName} 檔案檢查警告: 檔案為空或過小。 (${filePath})`);
            return false;
        }
    } catch (error) {
        console.error(`[-] ${stepName} 檔案檢查失敗: 找不到檔案。 (${filePath})`);
        console.error(`[-] 錯誤詳細資訊: ${error.message}`);
        return false;
    }
};


async function processSong(jobId, originalFilePath, originalFileName) {
    console.log(`\n[===== 開始處理任務: ${jobId} | 檔案: ${originalFileName} =====]`);
    const userVisibleSongName = path.parse(originalFileName).name.replace(/[\\/:*?"<>|]/g, '-');
    const tempFileBaseName = path.parse(originalFilePath).name;
    const outputDir = path.join(__dirname, 'temp_processing', jobId);
    const finalDir = path.join(__dirname, 'public/songs', userVisibleSongName);

    try {
        console.log(`[+] 檢查是否存在同名歌曲: ${userVisibleSongName}`);
        const [existingSongs] = await configModule.dbPool.query('SELECT id FROM songs WHERE name = ?', [userVisibleSongName]);
        if (existingSongs.length > 0) {
            console.warn(`[!] 發現同名歌曲，將進行覆蓋處理。`);
            const existingSongId = existingSongs[0].id;
            await configModule.dbPool.query('DELETE FROM jobs WHERE song_id = ?', [existingSongId]);
            await configModule.dbPool.query('DELETE FROM songs WHERE id = ?', [existingSongId]);
            if (fs.existsSync(finalDir)) {
                await fsp.rm(finalDir, { recursive: true, force: true });
                console.log(`[✓] 已刪除舊的歌曲資料夾: ${finalDir}`);
            }
        }
        
        await fsp.mkdir(outputDir, { recursive: true });

        // 步驟 1: 人聲分離
        await configModule.dbPool.query('UPDATE jobs SET status = ?, progress = ?, message = ? WHERE id = ?', ['processing', 25, '正在分離人聲與伴奏(標準模型)...', jobId]);
        // 【修改】使用標準的 2stems 模型，輸出 44.1kHz 音訊
        await runCommand(`${configModule.ai.spleeterPath} separate -p spleeter:2stems -o "${outputDir}" "${originalFilePath}"`);
        const vocalsPath = path.join(outputDir, tempFileBaseName, 'vocals.wav');
        const accompanimentPath = path.join(outputDir, tempFileBaseName, 'accompaniment.wav');
        if (!await checkFile(vocalsPath, "人聲分離(人聲)")) throw new Error("人聲分離後，人聲檔案(vocals.wav)不存在或為空。");
        if (!await checkFile(accompanimentPath, "人聲分離(伴奏)")) throw new Error("人聲分離後，伴奏檔案(accompaniment.wav)不存在或為空。");
        console.log(`[✓] 步驟 1/5: 人聲分離完成。`);

        // 步驟 2: 旋律提取
        await configModule.dbPool.query('UPDATE jobs SET status = ?, progress = ?, message = ? WHERE id = ?', ['processing', 50, '正在從人聲擷取旋律 (MIDI)...', jobId]);
        const midiOutputDir = path.join(outputDir, 'midi');
        await fsp.mkdir(midiOutputDir, { recursive: true });
        await runCommand(`conda run -n ${configModule.ai.basicpitchEnv} basic-pitch "${midiOutputDir}" "${vocalsPath}"`);
        const midiPath = path.join(midiOutputDir, `vocals_basic_pitch.mid`);
        if (!await checkFile(midiPath, "旋律提取")) throw new Error("旋律提取後，MIDI 檔案不存在或為空。");
        console.log(`[✓] 步驟 2/5: 旋律提取完成。`);

        // 步驟 3: 歌詞產生
        await configModule.dbPool.query('UPDATE jobs SET status = ?, progress = ?, message = ? WHERE id = ?', ['processing', 75, '正在從人聲產生歌詞 (LRC)...', jobId]);
        const lrcContent = await getLrcFromGoogleStreaming(vocalsPath);
        console.log(`[✓] 步驟 3/5: 歌詞產生完成。 (共 ${lrcContent.split('\n').filter(Boolean).length} 行)`);

        // 步驟 4: 整理檔案
        await configModule.dbPool.query('UPDATE jobs SET status = ?, progress = ?, message = ? WHERE id = ?', ['processing', 95, '正在整理與轉檔...', jobId]);
        await fsp.mkdir(finalDir, { recursive: true });
        const finalMp3Path = path.join(finalDir, 'audio.mp3');
        const finalMidiPath = path.join(finalDir, 'melody.mid');
        const finalLrcPath = path.join(finalDir, 'lyrics.lrc');
        await runCommand(`${configModule.ai.ffmpegPath} -i "${accompanimentPath}" -ab 192k -y "${finalMp3Path}"`);
        await fsp.rename(midiPath, finalMidiPath);
        await fsp.writeFile(finalLrcPath, lrcContent || '[00:00.00]AI 未能產生歌詞');
        console.log(`[✓] 步驟 4/5: 檔案整理完成。`);

        // 步驟 5: 更新資料庫
        const [songResult] = await configModule.dbPool.query('INSERT INTO songs (name, mp3_path, midi_path, lrc_path) VALUES (?, ?, ?, ?)', [userVisibleSongName, `songs/${userVisibleSongName}/audio.mp3`, `songs/${userVisibleSongName}/melody.mid`, `songs/${userVisibleSongName}/lyrics.lrc`]);
        await configModule.dbPool.query('UPDATE jobs SET status = ?, progress = ?, message = ?, song_id = ? WHERE id = ?', ['completed', 100, '處理完成！', songResult.insertId, jobId]);
        console.log(`[✓] 步驟 5/5: 資料庫更新完成。`);
        console.log(`[===== 任務 ${jobId} 已成功完成 =====]`);
    } catch (error) {
        console.error(`[-] 任務 ${jobId} 失敗:`, error);
        await configModule.dbPool.query('UPDATE jobs SET status = ?, message = ? WHERE id = ?', ['failed', error.message, jobId]);
    } finally {
        console.log(`[+] 正在清理任務 ${jobId} 的暫存檔案...`);
        // 【修改】暫時註解掉清理指令，以供偵錯
        // if (fs.existsSync(originalFilePath)) fs.unlinkSync(originalFilePath);
        // if (fs.existsSync(outputDir)) fs.rmSync(outputDir, { recursive: true, force: true });
        console.log(`[!] 清理功能已暫停。請記得手動清理 temp_processing 資料夾。`);
    }
}

// --- API 端點 ---
app.use('/', require('./routes/root'));
app.use('/songs', require('./routes/songs'));
app.use('/upload', require('./routes/upload'));
app.use('/status', require('./routes/status'));
app.use('/health', require('./routes/health'));

app.use(errorHandler);

async function startServer() {
    try {
        console.log('[+] 開始啟動 AI 音準資源製作器...');
        // 驗證配置
        if (!validateConfig()) {
            console.error('[-] 配置驗證失敗，無法啟動伺服器');
            process.exit(1);
        }
        
        console.log('[+] 正在建立 MySQL 資料庫連線池...');
        // 不需要再創建 dbPool，因為已經從配置導入
        
        const connection = await configModule.dbPool.getConnection();
        await connection.ping();
        connection.release();
        console.log('[✓] MySQL 資料庫連接成功！');
        
        // --- 關鍵：啟動 HTTP 服務 ---
        app.listen(PORT, () => {
            console.log(`✅ Server running on port ${PORT}`);
            console.log(`[✓] AI 資源製作器後端已啟動於 http://localhost:${PORT}`);
            console.log(`[✓] 環境: ${configModule.server.env}`);
            console.log(`[✓] 檔案大小限制: ${configModule.limits.maxFileSize / 1024 / 1024}MB`);
            console.log(`[✓] 速率限制: ${configModule.limits.rateLimitMax} 次/${configModule.limits.rateLimitWindow / 1000 / 60} 分鐘`);
        });
    } catch (error) {
        console.error('[-] 伺服器啟動失敗:', error);
        process.exit(1);
    }
}
startServer();
