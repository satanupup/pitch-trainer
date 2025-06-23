const express = require('express');
const router = express.Router();
const { getJobStatus } = require('../services/jobService');

// 獲取任務狀態
router.get('/:jobId', async (req, res) => {
  try {
    const jobId = req.params.jobId;
    const job = await getJobStatus(jobId);
    
    if (!job) {
      return res.status(404).json({ error: { code: 404, message: '找不到指定任務' } });
    }
    
    res.json(job);
  } catch (error) {
    console.error(`[-] API /jobs/${req.params.jobId} 錯誤:`, error);
    res.status(500).json({ error: { code: 500, message: '無法取得任務狀態' } });
  }
});

module.exports = router;