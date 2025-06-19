const { exec } = require('child_process');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { SpeechClient } = require('@google-cloud/speech');
const dbPool = require('../config/dbPool');
const config = require('../config');

const speechClient = new SpeechClient();

function runCommand(command) {
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
}

function getLrcFromGoogleStreaming(vocalsPath) {
    return new Promise((resolve, reject) => {
        let lrcContent = '';
        const recognizeStream = speechClient.streamingRecognize({
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
}

async function checkFile(filePath, stepName) {
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
}

async function processSong(jobId, originalFilePath, originalFileName) {
    console.log(`[+] 開始處理歌曲: jobId=${jobId}, 文件=${originalFilePath}`);
    
    try {
        // 更新任務狀態
        await dbPool.query('UPDATE jobs SET status = ?, message = ?, progress = ? WHERE id = ?', 
            ['processing', '開始處理歌曲', 5, jobId]);
        
        // 檢查文件是否存在
        const fileExists = await checkFile(originalFilePath, '原始文件');
        if (!fileExists) {
            throw new Error('找不到上傳的文件');
        }
        
        // 創建輸出目錄
        const songName = path.basename(originalFileName, path.extname(originalFileName))
            .replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        const outputDir = path.join('public', 'songs', songName);
        
        console.log(`[+] 創建輸出目錄: ${outputDir}`);
        await fsp.mkdir(outputDir, { recursive: true });
        
        // 複製原始 MP3 到輸出目錄
        const mp3Path = path.join(outputDir, 'original.mp3');
        console.log(`[+] 複製 MP3 文件: ${originalFilePath} -> ${mp3Path}`);
        await fsp.copyFile(originalFilePath, mp3Path);
        
        // 更新任務進度
        await dbPool.query('UPDATE jobs SET progress = ?, message = ? WHERE id = ?', 
            [10, '文件準備完成', jobId]);
        
        // 呼叫 AI 分析服務
        console.log(`[+] 呼叫 AI 分析服務...`);
        await dbPool.query('UPDATE jobs SET progress = ?, message = ? WHERE id = ?', 
            [20, '正在分析音頻特性', jobId]);
        
        // 這裡添加實際的 AI 處理代碼
        // ...
        
        // 模擬處理完成
        await dbPool.query('UPDATE jobs SET status = ?, message = ?, progress = ? WHERE id = ?', 
            ['completed', '處理完成', 100, jobId]);
        
        console.log(`[✓] 歌曲處理完成: ${jobId}`);
        return {
            success: true,
            songPath: `/songs/${songName}/original.mp3`
        };
    } catch (error) {
        console.error(`[-] 處理歌曲時發生錯誤: ${error.message}`);
        // 更新任務狀態為失敗
        await dbPool.query('UPDATE jobs SET status = ?, message = ? WHERE id = ?', 
            ['failed', `處理失敗: ${error.message}`, jobId])
            .catch(dbErr => {
                console.error(`[-] 更新任務狀態失敗: ${dbErr.message}`);
            });
        throw error;
    }
}

module.exports = { runCommand, getLrcFromGoogleStreaming, checkFile, processSong }; 
