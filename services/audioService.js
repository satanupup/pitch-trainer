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
    // 完整搬移 server.js 處理任務邏輯
    // ...（此處省略，實際搬移時會補齊所有步驟與日誌）
}

module.exports = { runCommand, getLrcFromGoogleStreaming, checkFile, processSong }; 