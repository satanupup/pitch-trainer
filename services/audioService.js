const dbPool = require('../config/dbPool');
const path = require('path');
const fs = require('fs').promises;
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

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
        
        // 創建空的 MIDI 和 LRC 文件（實際應用中這裡會有 AI 處理）
        const midiPath = path.join(outputDir, 'melody.mid');
        const lrcPath = path.join(outputDir, 'lyrics.lrc');
        
        // 模擬 AI 處理
        console.log(`[+] 模擬 AI 處理...`);
        await dbPool.query('UPDATE jobs SET progress = ?, message = ? WHERE id = ?', 
            [30, '正在分析音頻特性', jobId]);
        
        // 等待一段時間模擬處理
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 創建空的 MIDI 文件
        await fs.writeFile(midiPath, '');
        await dbPool.query('UPDATE jobs SET progress = ?, message = ? WHERE id = ?', 
            [60, '旋律提取完成', jobId]);
        
        // 等待一段時間模擬處理
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 創建空的 LRC 文件
        await fs.writeFile(lrcPath, '[00:00.00]這是一個示例歌詞\n[00:05.00]由 AI 生成');
        await dbPool.query('UPDATE jobs SET progress = ?, message = ? WHERE id = ?', 
            [90, '歌詞生成完成', jobId]);
        
        // 將歌曲信息保存到數據庫
        const [result] = await dbPool.query(
            'INSERT INTO songs (name, mp3_path, midi_path, lrc_path) VALUES (?, ?, ?, ?)',
            [songName, `songs/${songName}/audio.mp3`, `songs/${songName}/melody.mid`, `songs/${songName}/lyrics.lrc`]
        );
        
        const songId = result.insertId;
        console.log(`[✓] 歌曲信息已保存到數據庫，ID: ${songId}`);
        
        // 更新任務狀態，關聯到新創建的歌曲
        await dbPool.query('UPDATE jobs SET status = ?, message = ?, progress = ?, song_id = ? WHERE id = ?', 
            ['completed', '處理完成！', 100, songId, jobId]);
        
        console.log(`[✓] 歌曲處理完成: ${jobId}`);
        return {
            success: true,
            songId: songId,
            songPath: `songs/${songName}/audio.mp3`
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

module.exports = { processSong }; 
