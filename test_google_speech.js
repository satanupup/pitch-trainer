// test_google_speech.js (最終版，支援超長音訊 GCS 流程)
const { SpeechClient } = require('@google-cloud/speech');
const { Storage } = require('@google-cloud/storage');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// --- 您需要修改的參數 ---
const BUCKET_NAME = 'YOUR_UNIQUE_BUCKET_NAME'; // <<<<<<< 請換成您剛剛建立的 GCS 儲存桶名稱
const localFilePath = '/var/www/pitch-trainer/uploads/1750322419630-16664692.mp3';
// -----------------------

async function testGenerateLyricsWithGCS() {
    if (BUCKET_NAME === 'YOUR_UNIQUE_BUCKET_NAME') {
        console.error('[-] 請先修改 BUCKET_NAME 變數！');
        return;
    }

    console.log(`[+] 開始測試歌詞生成 (GCS 流程): ${localFilePath}`);
    const outputDir = path.dirname(localFilePath);
    const optimizedAudioPath = path.join(outputDir, 'vocals_optimized_test.wav');
    const gcsFileName = `speech-test-audio-${Date.now()}.wav`;
    const gcsUri = `gs://${BUCKET_NAME}/${gcsFileName}`;

    const storage = new Storage();
    const speechClient = new SpeechClient();

    try {
        // 1. 優化音訊
        console.log('[+] 步驟 1/5: 正在優化音訊...');
        await execPromise(`ffmpeg -i "${localFilePath}" -af "highpass=f=200,lowpass=f=3000,afftdn=nf=-25,dynaudnorm=f=150:g=15" -ac 1 -ar 16000 -y "${optimizedAudioPath}"`);
        console.log(`[✓] 音訊優化完成: ${optimizedAudioPath}`);

        // 2. 上傳到 GCS
        console.log(`[+] 步驟 2/5: 正在上傳檔案到 GCS: ${gcsUri}`);
        await storage.bucket(BUCKET_NAME).upload(optimizedAudioPath, {
            destination: gcsFileName,
        });
        console.log('[✓] 檔案上傳成功！');

        // 3. 準備 GCS URI 請求
        const request = {
            audio: { uri: gcsUri }, // 【核心修改】使用 GCS 路徑
            config: {
                encoding: 'LINEAR16',
                sampleRateHertz: 16000,
                languageCode: 'zh-TW',
                enableWordTimeOffsets: true,
                useEnhanced: true,
                enableAutomaticPunctuation: true,
            },
        };

        // 4. 執行長時間識別
        console.log('[+] 步驟 3/5: 呼叫長時間執行 API...');
        const [operation] = await speechClient.longRunningRecognize(request);
        console.log('[+] 步驟 4/5: 等待操作完成...');
        const [response] = await operation.promise();
        console.log('[✓] 長時間處理完成！');

        const transcription = response.results.map(result => result.alternatives[0].transcript).join('\n');
        console.log('--- 識別成功 ---');
        console.log(transcription);
        console.log('------------------');

    } catch (error) {
        console.error('--- 測試失敗 ---');
        console.error(error);
        console.error('------------------');
    } finally {
        // 5. 清理 GCS 和本地的暫存檔案
        console.log('[+] 步驟 5/5: 正在清理暫存檔案...');
        try {
            await storage.bucket(BUCKET_NAME).file(gcsFileName).delete();
            console.log(`[✓] 已刪除 GCS 檔案: ${gcsUri}`);
        } catch (e) {
            console.warn(`[-] 刪除 GCS 檔案失敗: ${e.message}`);
        }
        try {
            await fs.unlink(optimizedAudioPath);
            console.log(`[✓] 已刪除本地暫存檔: ${optimizedAudioPath}`);
        } catch (e) {
            console.warn(`[-] 刪除本地暫存檔失敗: ${e.message}`);
        }
    }
}

testGenerateLyricsWithGCS();