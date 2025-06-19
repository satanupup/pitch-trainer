const dbPool = require('../config/dbPool');
const { processSong } = require('./aiProcessingService');
const path = require('path');

async function handleUpload(req, res) {
    if (!req.file) return res.status(400).json({ error: '沒有上傳檔案' });
    const jobId = `job_${Date.now()}`;
    try {
        await dbPool.query('INSERT INTO jobs (id, status, message, progress) VALUES (?, ?, ?, ?)', [jobId, 'pending', '任務已建立', 0]);
        // 非同步呼叫分析流程
        processSong(path.resolve(req.file.path));
        res.status(202).json({ jobId });
    } catch (dbError) {
        console.error('[-] handleUpload 錯誤:', dbError);
        res.status(500).json({ error: '無法建立處理任務' });
    }
}

module.exports = { handleUpload };
