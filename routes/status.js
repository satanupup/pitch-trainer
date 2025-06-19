const express = require('express');
const router = express.Router();
const { getJobStatus } = require('../services/songService');

router.get('/:jobId', async (req, res) => {
    try {
        const job = await getJobStatus(req.params.jobId);
        if (!job) return res.status(404).json({ error: '找不到該任務' });
        res.json(job);
    } catch (error) {
        console.error(`[-] API /status/${req.params.jobId} 錯誤:`, error);
        res.status(500).json({ error: '無法查詢任務狀態' });
    }
});

module.exports = router;
