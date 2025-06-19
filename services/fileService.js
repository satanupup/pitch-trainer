const dbPool = require('../config/dbPool');
const { processSong } = require('./audioService');
const path = require('path');
const fs = require('fs');

async function handleUpload(req, res) {
    console.log('[+] 處理上傳文件...');
    
    if (!req.file) {
        console.error('[-] 沒有上傳檔案');
        return res.status(400).json({ error: '沒有上傳檔案' });
    }
    
    console.log(`[+] 文件已上傳: ${req.file.path}`);
    console.log(`[+] 文件信息: 原始名稱=${req.file.originalname}, 大小=${req.file.size} 字節, 類型=${req.file.mimetype}`);
    
    // 檢查文件是否存在
    if (!fs.existsSync(req.file.path)) {
        console.error(`[-] 上傳的文件不存在: ${req.file.path}`);
        return res.status(500).json({ error: '文件上傳失敗，找不到上傳的文件' });
    }
    
    // 檢查文件大小
    const stats = fs.statSync(req.file.path);
    if (stats.size === 0) {
        console.error('[-] 上傳的文件為空');
        fs.unlinkSync(req.file.path); // 刪除空文件
        return res.status(400).json({ error: '上傳的文件為空' });
    }
    
    const jobId = `job_${Date.now()}`;
    console.log(`[+] 創建任務 ID: ${jobId}`);
    
    try {
        // 將任務信息保存到數據庫
        await dbPool.query(
            'INSERT INTO jobs (id, status, message, progress, file_path, original_filename) VALUES (?, ?, ?, ?, ?, ?)', 
            [jobId, 'pending', '任務已建立', 0, req.file.path, req.file.originalname]
        );
        console.log(`[✓] 任務已保存到數據庫: ${jobId}`);
        
        // 返回任務 ID 給客戶端
        res.status(202).json({ jobId });
        
        // 非同步處理歌曲
        console.log(`[+] 開始非同步處理歌曲: ${req.file.path}`);
        processSong(jobId, path.resolve(req.file.path), req.file.originalname)
            .then(() => {
                console.log(`[✓] 歌曲處理完成: ${jobId}`);
            })
            .catch(err => {
                console.error(`[-] 歌曲處理失敗: ${jobId}`, err);
                // 更新任務狀態為失敗
                dbPool.query('UPDATE jobs SET status = ?, message = ? WHERE id = ?', 
                    ['failed', `處理失敗: ${err.message}`, jobId])
                    .catch(dbErr => {
                        console.error(`[-] 更新任務狀態失敗: ${dbErr.message}`);
                    });
            });
    } catch (dbError) {
        console.error('[-] 數據庫操作錯誤:', dbError);
        // 刪除上傳的文件
        fs.unlinkSync(req.file.path);
        res.status(500).json({ error: '無法建立處理任務: ' + dbError.message });
    }
}

module.exports = { handleUpload };
