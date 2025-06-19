const express = require('express');
const router = express.Router();
const { getJobStatus } = require('../services/songService');

// 獲取任務狀態
router.get('/:jobId', async (req, res) => {
    try {
        const jobId = req.params.jobId;
        console.log(`[+] 獲取任務狀態: ${jobId}`);
        
        const jobStatus = await getJobStatus(jobId);
        
        if (!jobStatus) {
            return res.status(404).json({ error: '找不到指定的任務' });
        }
        
        res.json(jobStatus);
    } catch (error) {
        console.error('[-] 獲取任務狀態失敗:', error);
        res.status(500).json({ error: '獲取任務狀態失敗: ' + error.message });
    }
});

module.exports = router;
