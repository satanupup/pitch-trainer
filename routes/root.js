const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.send('AI 資源製作器後端服務正在運作中！');
});

module.exports = router; 