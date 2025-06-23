const express = require('express');
const router = express.Router();
const { version } = require('../package.json');

// 健康檢查端點
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    version: version,
    timestamp: Date.now()
  });
});

module.exports = router;
