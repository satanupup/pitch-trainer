const dbPool = require('../config/dbPool');
const path = require('path');
const fs = require('fs').promises;
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const config = require('../config/config');
const { SpeechClient } = require('@google-cloud/speech');

// 檢查文件是否存在
async function checkFile(filePath, fileType) {
    try {
        await fs.access(filePath);
        console.log(`[✓] ${fileType}存在: ${filePath}`);
        return true;
    } catch (error) {
        // 記錄具體的錯誤原因
        if (error.code === 'ENOENT') {
            console.error(`[-] ${fileType}不存在: ${filePath}`);
        } else {
            console.error(`[-] 無法訪問${fileType}: ${filePath}，錯誤: ${error.code} - ${error.message}`);
        }
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
        
        // 從文件名提取歌曲名稱
        const songName = path.basename(originalFileName, path.extname(originalFileName))
            .replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        
        // 創建輸出目錄
        const outputDir = path.join('public', 'songs', songName);
        console.log(`[+] 創建輸出目錄: ${outputDir}`);
        await fs.mkdir(outputDir, { recursive: true });
        
        // 更新任務進度
        await dbPool.query('UPDATE jobs SET progress = ?, message = ? WHERE id = ?', 
            [10, '文件準備完成', jobId]);
        
        // 複製原始 MP3 到輸出目錄
        const mp3Path = path.join(outputDir, 'audio.mp3');
        console.log(`[+] 複製 MP3 文件: ${originalFilePath} -> ${mp3Path}`);
        await fs.copyFile(originalFilePath, mp3Path);
        
        // 創建臨時處理目錄
        const tempDir = path.join('temp_processing', jobId);
        await fs.mkdir(tempDir, { recursive: true });
        
        // 1. 使用 Spleeter 分離人聲和伴奏
        await dbPool.query('UPDATE jobs SET progress = ?, message = ? WHERE id = ?', 
            [20, '正在分離人聲和伴奏', jobId]);
        
        const { vocalPath, accompanimentPath } = await separateVocals(originalFilePath, tempDir);
        console.log(`[✓] 人聲分離完成: ${vocalPath}`);
        
        // 將分離的文件複製到輸出目錄
        const outputVocalPath = path.join(outputDir, 'vocals.mp3');
        const outputAccompanimentPath = path.join(outputDir, 'accompaniment.mp3');
        await fs.copyFile(vocalPath, outputVocalPath);
        await fs.copyFile(accompanimentPath, outputAccompanimentPath);
        
        // 2. 使用 Basic Pitch 提取 MIDI
        await dbPool.query('UPDATE jobs SET progress = ?, message = ? WHERE id = ?', 
            [40, '正在提取旋律 MIDI', jobId]);
        
        const midiPath = await extractMidi(vocalPath, tempDir);
        console.log(`[✓] MIDI 提取完成: ${midiPath}`);
        
        // 將 MIDI 文件複製到輸出目錄
        const outputMidiPath = path.join(outputDir, 'melody.mid');
        await fs.copyFile(midiPath, outputMidiPath);
        
        // 3. 使用 Google Speech API 生成歌詞
        await dbPool.query('UPDATE jobs SET progress = ?, message = ? WHERE id = ?', 
            [60, '正在生成歌詞', jobId]);
        
        const lrcPath = await generateLyrics(vocalPath, tempDir);
        console.log(`[✓] 歌詞生成完成: ${lrcPath}`);
        
        // 將 LRC 文件複製到輸出目錄
        const outputLrcPath = path.join(outputDir, 'lyrics.lrc');
        await fs.copyFile(lrcPath, outputLrcPath);
        
        // 4. 使用 AI 分析服務處理聲音特性
        await dbPool.query('UPDATE jobs SET progress = ?, message = ? WHERE id = ?', 
            [80, '正在分析聲音特性', jobId]);
        
        const analysisResult = await analyzeVocal(vocalPath);
        console.log(`[✓] 聲音分析完成:`, analysisResult);
        
        // 將分析結果保存為 JSON
        const analysisPath = path.join(outputDir, 'analysis.json');
        await fs.writeFile(analysisPath, JSON.stringify(analysisResult, null, 2));
        
        // 將歌曲信息保存到數據庫
        const [result] = await dbPool.query(
            'INSERT INTO songs (name, mp3_path, vocal_path, accompaniment_path, midi_path, lrc_path, analysis_path) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
                songName, 
                `songs/${songName}/audio.mp3`, 
                `songs/${songName}/vocals.mp3`,
                `songs/${songName}/accompaniment.mp3`,
                `songs/${songName}/melody.mid`, 
                `songs/${songName}/lyrics.lrc`,
                `songs/${songName}/analysis.json`
            ]
        );
        
        const songId = result.insertId;
        console.log(`[✓] 歌曲信息已保存到數據庫，ID: ${songId}`);
        
        // 清理臨時文件
        await fs.rm(tempDir, { recursive: true, force: true });
        
        // 更新任務狀態，關聯到新創建的歌曲
        await dbPool.query('UPDATE jobs SET status = ?, message = ?, progress = ?, song_id = ? WHERE id = ?', 
            ['completed', '處理完成！', 100, songId, jobId]);
            
        return { songId, songName };
    } catch (error) {
        console.error(`[-] 處理歌曲時發生錯誤: ${error.message}`);
        // 更新任務狀態為失敗
        await dbPool.query('UPDATE jobs SET status = ?, message = ? WHERE id = ?', 
            ['failed', `處理失敗: ${error.message}`, jobId]);
        throw error;
    }
}

// 使用 Spleeter 分離人聲和伴奏
async function separateVocals(inputPath, outputDir) {
    console.log(`[+] 使用 Spleeter 分離人聲: ${inputPath}`);
    
    try {
        // 執行 Spleeter 命令
        const spleeterPath = config.ai.spleeterPath || 'spleeter';
        const command = `${spleeterPath} separate -p spleeter:2stems -o "${outputDir}" "${inputPath}"`;
        
        const { stdout } = await execPromise(command);
        console.log(`[✓] Spleeter 輸出: ${stdout}`);
        
        // 獲取 Spleeter 輸出文件路徑
        const inputFileName = path.basename(inputPath, path.extname(inputPath));
        const vocalWavPath = path.join(outputDir, inputFileName, 'vocals.wav');
        const accompWavPath = path.join(outputDir, inputFileName, 'accompaniment.wav');
        
        // 轉換為 MP3 以節省空間
        const vocalMp3Path = path.join(outputDir, 'vocals.mp3');
        const accompMp3Path = path.join(outputDir, 'accompaniment.mp3');
        
        // 使用 FFmpeg 轉換格式
        const ffmpegPath = config.ai.ffmpegPath || 'ffmpeg';
        
        // 轉換人聲
        await execPromise(`${ffmpegPath} -i "${vocalWavPath}" -b:a 192k "${vocalMp3Path}"`);
        console.log(`[✓] 人聲轉換完成: ${vocalMp3Path}`);
        
        // 轉換伴奏
        await execPromise(`${ffmpegPath} -i "${accompWavPath}" -b:a 192k "${accompMp3Path}"`);
        console.log(`[✓] 伴奏轉換完成: ${accompMp3Path}`);
        
        return { vocalPath: vocalMp3Path, accompanimentPath: accompMp3Path };
    } catch (error) {
        console.error(`[-] 人聲分離過程中發生錯誤: ${error.message}`);
        throw error;
    }
}

// 使用 Basic Pitch 提取 MIDI
async function extractMidi(vocalPath, outputDir) {
    console.log(`[+] 使用 Basic Pitch 提取 MIDI: ${vocalPath}`);
    
    try {
        const basicPitchEnv = config.ai.basicpitchEnv || 'basicpitch-env';
        
        // 1. 【修正】使用正確的 basic-pitch 指令
        //    第一個參數是輸出資料夾，第二個是輸入檔案
        const command = `conda run -n ${basicPitchEnv} basic-pitch "${outputDir}" "${vocalPath}"`;
        
        const { stdout } = await execPromise(command);
        console.log(`[✓] Basic Pitch 處理完成: ${stdout}`);
        
        // 2. 【新增】找到 basic-pitch 自動生成的 MIDI 檔案
        //    它會根據輸入檔案的名稱來命名，例如 vocals.mp3 -> vocals_basic_pitch.mid
        const inputFileName = path.basename(vocalPath, path.extname(vocalPath));
        const generatedMidiName = `${inputFileName}_basic_pitch.mid`;
        const generatedMidiPath = path.join(outputDir, generatedMidiName);

        // 檢查自動生成的檔案是否存在
        await fs.access(generatedMidiPath);
        console.log(`[✓] 找到由 Basic Pitch 生成的檔案: ${generatedMidiPath}`);

        // 3. 【新增】將生成的檔案重命名為我們後續流程預期的 'melody.mid'
        const expectedMidiPath = path.join(outputDir, 'melody.mid');
        await fs.rename(generatedMidiPath, expectedMidiPath);
        console.log(`[✓] MIDI 檔案已重命名為: ${expectedMidiPath}`);

        // 返回我們預期的、重命名後的檔案路徑
        return expectedMidiPath;
        
    } catch (error) {
        console.error(`[-] Basic Pitch 執行錯誤: ${error.message}`);
        // 拋出錯誤，讓主流程知道處理失敗
        throw new Error(`Basic Pitch 執行失敗: ${error.message}`);
    }
}

// 使用 Google Speech API 生成歌詞 (GCS 流程版本)
async function generateLyrics(vocalPath, outputDir) {
    console.log(`[+] 使用 Google Speech API 生成歌詞 (GCS 流程): ${vocalPath}`);
    
    try {
        // 1. 優化音頻
        const ffmpegPath = config.ai.ffmpegPath || 'ffmpeg';
        const optimizedAudioPath = path.join(outputDir, 'vocals_optimized.wav');
        
        console.log(`[+] 步驟 1/6: 正在優化音訊...`);
        await execPromise(`${ffmpegPath} -i "${vocalPath}" -af "highpass=f=200,lowpass=f=3000,afftdn=nf=-25,dynaudnorm=f=150:g=15" -ac 1 -ar 16000 "${optimizedAudioPath}"`);
        console.log(`[✓] 音訊優化完成: ${optimizedAudioPath}`);
        
        // 2. 準備 GCS 上傳
        const BUCKET_NAME = config.google.storageBucket || 'pitch-trainer-bucket-961211674033';
        const gcsFileName = `speech-audio-${Date.now()}.wav`;
        const gcsUri = `gs://${BUCKET_NAME}/${gcsFileName}`;
        
        // 3. 創建 Storage 和 Speech 客戶端
        const { Storage } = require('@google-cloud/storage');
        const storage = new Storage();
        
        // 創建 Speech 客戶端
        let speechClient;
        const isGoogleCloud = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
        
        if (isGoogleCloud) {
            console.log(`[i] 檢測到 Google Cloud 環境，使用默認憑證`);
            speechClient = new SpeechClient();
        } else {
            const keyFilePath = config.google.speechApiKeyFile || process.env.GOOGLE_APPLICATION_CREDENTIALS;
            console.log(`[i] 非 Google Cloud 環境，使用憑證文件: ${keyFilePath}`);
            
            try {
                await fs.access(keyFilePath);
                console.log(`[✓] Google API 憑證文件存在`);
            } catch (err) {
                console.error(`[-] Google API 憑證文件不存在或無法訪問: ${err.message}`);
                throw new Error(`Google API 憑證文件不存在或無法訪問: ${keyFilePath}`);
            }
            
            speechClient = new SpeechClient({
                keyFilename: keyFilePath
            });
        }
        
        // 4. 上傳到 GCS
        console.log(`[+] 步驟 2/6: 正在上傳檔案到 GCS: ${gcsUri}`);
        await storage.bucket(BUCKET_NAME).upload(optimizedAudioPath, {
            destination: gcsFileName,
        });
        console.log('[✓] 檔案上傳成功！');
        
        // 5. 準備 GCS URI 請求
        const request = {
            audio: { uri: gcsUri },
            config: {
                encoding: 'LINEAR16',
                sampleRateHertz: 16000,
                languageCode: 'zh-TW',
                enableWordTimeOffsets: true,
                useEnhanced: true,
                enableAutomaticPunctuation: true,
                maxAlternatives: 1,
                speechContexts: [{
                    phrases: ['歌詞', '音樂', '唱歌', '愛', '心', '你', '我', '他', '她', '想', '說', '走', '來', '去'],
                    boost: 15
                }],
            },
        };
        
        // 6. 執行長時間識別
        console.log('[+] 步驟 3/6: 呼叫長時間執行 API...');
        const [operation] = await speechClient.longRunningRecognize(request);
        console.log('[+] 步驟 4/6: 等待操作完成...');
        const [response] = await operation.promise();
        console.log('[✓] 長時間處理完成！');
        
        // 7. 處理識別結果
        if (!response.results || response.results.length === 0) {
            console.warn(`[!] 語音識別沒有返回結果，嘗試使用 Whisper 備用方案`);
            
            // 清理 GCS 檔案
            try {
                await storage.bucket(BUCKET_NAME).file(gcsFileName).delete();
                console.log(`[✓] 已刪除 GCS 檔案: ${gcsUri}`);
            } catch (e) {
                console.warn(`[-] 刪除 GCS 檔案失敗: ${e.message}`);
            }
            
            return await generateLyricsWithWhisper(vocalPath, outputDir);
        }
        
        // 提取完整文本
        const transcription = response.results
            .map(result => result.alternatives[0].transcript)
            .join('\n');
        
        console.log(`[✓] 語音識別結果: ${transcription}`);
        
        // 8. 使用 Gemini API 優化歌詞
        console.log('[+] 步驟 5/6: 使用 Gemini 優化歌詞...');
        const enhancedLyrics = await enhanceLyricsWithGemini(transcription);
        console.log(`[✓] Gemini 優化後的歌詞: ${enhancedLyrics}`);
        
        // 9. 生成 LRC 格式歌詞
        let lrcContent = '';
        
        // 添加標題信息
        lrcContent += '[ti:自動生成歌詞]\n';
        lrcContent += '[ar:AI 生成]\n';
        lrcContent += `[al:${path.basename(vocalPath, path.extname(vocalPath))}]\n`;
        lrcContent += '[by:AI 音準資源製作器]\n\n';
        
        // 處理每個單詞的時間戳
        response.results.forEach(result => {
            const alternative = result.alternatives[0];
            if (alternative.words && alternative.words.length > 0) {
                alternative.words.forEach(wordInfo => {
                    const startTime = wordInfo.startTime.seconds + wordInfo.startTime.nanos / 1000000000;
                    const minutes = Math.floor(startTime / 60);
                    const seconds = startTime % 60;
                    const timeCode = `[${minutes.toString().padStart(2, '0')}:${seconds.toFixed(2).padStart(5, '0')}]`;
                    lrcContent += `${timeCode}${wordInfo.word}\n`;
                });
            }
        });
        
        // 10. 保存歌詞文件
        const lrcPath = path.join(outputDir, 'lyrics.lrc');
        await fs.writeFile(lrcPath, lrcContent);
        console.log(`[✓] 歌詞文件已保存: ${lrcPath}`);
        
        // 保存 Gemini 優化後的歌詞
        const enhancedLrcPath = path.join(outputDir, 'lyrics_enhanced.txt');
        await fs.writeFile(enhancedLrcPath, enhancedLyrics);
        console.log(`[✓] 優化後的歌詞文件已保存: ${enhancedLrcPath}`);
        
        // 11. 清理 GCS 和本地的暫存檔案
        console.log('[+] 步驟 6/6: 正在清理暫存檔案...');
        try {
            await storage.bucket(BUCKET_NAME).file(gcsFileName).delete();
            console.log(`[✓] 已刪除 GCS 檔案: ${gcsUri}`);
        } catch (e) {
            console.warn(`[-] 刪除 GCS 檔案失敗: ${e.message}`);
        }
        
        return lrcPath;
    } catch (error) {
        console.error(`[-] 語音識別錯誤: ${error.message}`);
        console.error(`[-] 錯誤堆疊:`, error.stack);
        
        // 嘗試使用 Whisper 作為備用
        try {
            console.log(`[!] 嘗試使用 Whisper 作為備用...`);
            return await generateLyricsWithWhisper(vocalPath, outputDir);
        } catch (whisperError) {
            console.error(`[-] Whisper 備用也失敗了: ${whisperError.message}`);
            
            // 如果 Whisper 也失敗，創建一個空的 LRC 文件
            const lrcPath = path.join(outputDir, 'lyrics.lrc');
            await fs.writeFile(lrcPath, '[00:00.00]無法生成歌詞\n[00:05.00]請稍後再試');
            
            return lrcPath;
        }
    }
}

// 使用 Whisper 作為備用語音識別
async function generateLyricsWithWhisper(vocalPath, outputDir) {
    console.log(`[+] 使用 Whisper 生成歌詞: ${vocalPath}`);
    
    try {
        // 檢查是否安裝了 whisper
        const whisperPath = config.ai.whisperPath || 'whisper';
        
        // 執行 Whisper 命令
        const command = `${whisperPath} "${vocalPath}" --model tiny --language zh --output_format json --output_dir "${outputDir}"`;
        
        console.log(`[+] 執行 Whisper 命令: ${command}`);
        const { stdout } = await execPromise(command);
        console.log(`[✓] Whisper 輸出: ${stdout}`);
        
        // 讀取 Whisper 生成的 JSON 文件
        const whisperOutputFile = path.join(outputDir, path.basename(vocalPath, path.extname(vocalPath)) + '.json');
        const whisperData = JSON.parse(await fs.readFile(whisperOutputFile, 'utf8'));
        
        // 生成 LRC 格式歌詞
        let lrcContent = '';
        
        // 添加標題信息
        lrcContent += '[ti:Whisper自動生成歌詞]\n';
        lrcContent += '[ar:AI 生成]\n';
        lrcContent += `[al:${path.basename(vocalPath, path.extname(vocalPath))}]\n`;
        lrcContent += '[by:AI 音準資源製作器]\n\n';
        
        // 處理每個段落
        whisperData.segments.forEach(segment => {
            const startTime = segment.start;
            const minutes = Math.floor(startTime / 60);
            const seconds = startTime % 60;
            const timeCode = `[${minutes.toString().padStart(2, '0')}:${seconds.toFixed(2).padStart(5, '0')}]`;
            lrcContent += `${timeCode}${segment.text}\n`;
        });
        
        // 保存 LRC 文件
        const lrcPath = path.join(outputDir, 'lyrics.lrc');
        await fs.writeFile(lrcPath, lrcContent);
        console.log(`[✓] Whisper 歌詞文件已保存: ${lrcPath}`);
        
        return lrcPath;
    } catch (error) {
        console.error(`[-] Whisper 處理錯誤: ${error.message}`);
        throw error;
    }
}

// 使用 Gemini API 優化歌詞
async function enhanceLyricsWithGemini(rawLyrics) {
    console.log(`[+] 使用 Gemini API 優化歌詞...`);
    
    try {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        
        // 使用 Gemini 模型
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        
        // 構建提示詞
        const prompt = `
你是一位專業的歌詞編輯。以下是通過語音識別生成的歌詞，可能存在一些錯誤或不連貫的地方。
請幫我修正並優化這些歌詞，使其更加通順、有意義，並保持原始的情感和主題。
如果有明顯的錯誤，請修正；如果有缺失的部分，請根據上下文合理補充。
請保持繁體中文輸出，並確保修改後的歌詞仍然符合原始歌詞的風格和意境。

原始歌詞：
${rawLyrics}

優化後的歌詞：`;
        
        // 呼叫 Gemini API
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });
        
        const response = result.response;
        const enhancedLyrics = response.text().trim();
        
        return enhancedLyrics;
    } catch (error) {
        console.error(`[-] Gemini API 調用錯誤: ${error.message}`);
        // 如果 Gemini API 失敗，返回原始歌詞
        return rawLyrics;
    }
}

// 處理長音頻文件的語音識別
async function generateLyricsLongAudio(audioPath, outputDir, speechClient = null) {
    console.log(`[+] 使用長音頻識別: ${audioPath}`);
    
    try {
        // 如果沒有提供 speechClient，則創建一個
        if (!speechClient) {
            const isGoogleCloud = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
            
            if (isGoogleCloud) {
                speechClient = new SpeechClient();  // 使用默認憑證
            } else {
                const keyFilePath = config.google.speechApiKeyFile || process.env.GOOGLE_APPLICATION_CREDENTIALS;
                speechClient = new SpeechClient({
                    keyFilename: keyFilePath
                });
            }
        }
        
        // 準備 GCS URI 或直接讀取文件
        const audioBytes = await fs.readFile(audioPath);
        const audio = {
            content: audioBytes.toString('base64'),
        };
        
        // 配置長音頻識別請求
        const speechConfig = {
            encoding: 'LINEAR16',
            sampleRateHertz: 16000,
            languageCode: 'zh-TW',
            enableWordTimeOffsets: true,
            model: 'default',
            useEnhanced: true,
            enableAutomaticPunctuation: true,
            audioChannelCount: 1,
            speechContexts: [{
                phrases: ['歌詞', '音樂', '唱歌', '愛', '心', '你', '我', '他', '她', '想', '說', '走', '來', '去'],
                boost: 15
            }]
        };
        
        // 創建識別請求
        const request = {
            audio: audio,
            config: speechConfig,
        };
        
        // 執行長音頻識別
        console.log(`[+] 開始長音頻識別...`);
        const [operation] = await speechClient.longRunningRecognize(request);
        console.log(`[i] 長音頻識別操作已啟動`);
        
        // 等待操作完成
        const [response] = await operation.promise();
        console.log(`[✓] 長音頻識別完成`);
        
        // 提取完整文本用於 Gemini 優化
        const transcription = response.results
            .map(result => result.alternatives[0].transcript)
            .join('\n');
            
        // 使用 Gemini API 優化歌詞
        const enhancedLyrics = await enhanceLyricsWithGemini(transcription);
        console.log(`[✓] Gemini 優化後的長音頻歌詞: ${enhancedLyrics}`);
        
        // 生成 LRC 格式歌詞
        let lrcContent = '';
        
        // 添加標題信息
        lrcContent += '[ti:自動生成歌詞(長音頻)]\n';
        lrcContent += '[ar:AI 生成]\n';
        lrcContent += `[al:${path.basename(audioPath, path.extname(audioPath))}]\n`;
        lrcContent += '[by:AI 音準資源製作器]\n\n';
        
        // 處理每個單詞的時間戳
        response.results.forEach(result => {
            const alternative = result.alternatives[0];
            if (alternative.words && alternative.words.length > 0) {
                alternative.words.forEach(wordInfo => {
                    const startTime = wordInfo.startTime.seconds + wordInfo.startTime.nanos / 1000000000;
                    const minutes = Math.floor(startTime / 60);
                    const seconds = startTime % 60;
                    const timeCode = `[${minutes.toString().padStart(2, '0')}:${seconds.toFixed(2).padStart(5, '0')}]`;
                    lrcContent += `${timeCode}${wordInfo.word}\n`;
                });
            }
        });
        
        // 保存 LRC 文件
        const lrcPath = path.join(outputDir, 'lyrics.lrc');
        await fs.writeFile(lrcPath, lrcContent);
        console.log(`[✓] 長音頻歌詞文件已保存: ${lrcPath}`);
        
        // 保存 Gemini 優化後的歌詞
        const enhancedLrcPath = path.join(outputDir, 'lyrics_enhanced.txt');
        await fs.writeFile(enhancedLrcPath, enhancedLyrics);
        console.log(`[✓] 優化後的長音頻歌詞文件已保存: ${enhancedLrcPath}`);
        
        return lrcPath;
    } catch (error) {
        console.error(`[-] 長音頻識別錯誤: ${error.message}`);
        throw error;
    }
}

// 使用 AI 分析服務分析聲音特性
async function analyzeVocal(vocalPath) {
    console.log(`[+] 分析聲音特性: ${vocalPath}`);
    
    try {
        // 使用 aiProcessingService 中的函數
        const { processSong } = require('./aiProcessingService');
        const analysisResult = await processSong(vocalPath);
        return analysisResult;
    } catch (error) {
        console.error(`[-] 聲音分析錯誤: ${error.message}`);
        // 返回默認值
        return {
            average_pitch: 0,
            jitter_local: 0,
            shimmer_local: 0,
            hnr: 0,
            error: error.message
        };
    }
}

module.exports = { processSong }; 
