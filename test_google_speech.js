// test_google_speech.js
const { SpeechClient } = require('@google-cloud/speech');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// --- 請修改以下路徑 ---
const vocalFilePath = '/var/www/pitch-trainer/public/songs/lookmyeyes/vocals.mp3';
// 在 GCP 環境中不需要指定金鑰檔案，使用默認憑證
const keyFilePath = null; // 設為 null，讓程式自動使用 GCP 默認憑證
// -----------------------

async function testGenerateLyrics() {
    console.log(`[+] 開始測試歌詞生成: ${vocalFilePath}`);
    const outputDir = path.dirname(vocalFilePath);
    const optimizedAudioPath = path.join(outputDir, 'vocals_optimized_test.wav');

    try {
        // 1. 優化音訊
        console.log('[+] 正在優化音訊...');
        await execPromise(`ffmpeg -i "${vocalFilePath}" -af "highpass=f=200,lowpass=f=3000,afftdn=nf=-25,dynaudnorm=f=150:g=15" -ac 1 -ar 16000 -y "${optimizedAudioPath}"`);
        console.log(`[✓] 音訊優化完成: ${optimizedAudioPath}`);

        // 2. 建立客戶端
        console.log(`[+] 檢查是否在 GCP 環境中...`);
        const isGoogleCloud = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
        let speechClient;

        if (isGoogleCloud) {
            console.log(`[✓] 檢測到 GCP 環境，使用默認憑證`);
            speechClient = new SpeechClient(); // 不指定 keyFilename，將使用默認憑證
        } else if (keyFilePath) {
            console.log(`[+] 使用金鑰檔案: ${keyFilePath}`);
            speechClient = new SpeechClient({ keyFilename: keyFilePath });
        } else {
            console.log(`[+] 使用環境變數中的憑證`);
            speechClient = new SpeechClient(); // 使用 GOOGLE_APPLICATION_CREDENTIALS 環境變數
        }

        // 3. 準備請求
        const audioBytes = await fs.readFile(optimizedAudioPath);
        const request = {
            audio: { content: audioBytes.toString('base64') },
            config: {
                encoding: 'LINEAR16',
                sampleRateHertz: 16000,
                languageCode: 'zh-TW',
                enableWordTimeOffsets: true,
                useEnhanced: true,
            },
        };

        // 4. 執行識別
        console.log('[+] 正在呼叫 Google Speech API...');
        const [response] = await speechClient.recognize(request);
        
        if (!response.results || response.results.length === 0) {
            console.error('[-] API 沒有返回任何結果。');
            return;
        }

        const transcription = response.results.map(result => result.alternatives[0].transcript).join('\n');
        console.log('--- 識別成功 ---');
        console.log(transcription);
        console.log('------------------');

    } catch (error) {
        console.error('--- 測試失敗 ---');
        console.error(error);
        console.error('------------------');
    }
}

testGenerateLyrics();
