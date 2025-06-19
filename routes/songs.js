const express = require('express');
const router = express.Router();
const { getSongs } = require('../services/songService');

router.get('/', async (req, res) => {
    try {
        const songs = await getSongs();
        res.json(songs);
    } catch (error) {
        console.error("[-] API /songs 錯誤:", error);
        res.status(500).json({ error: '無法取得歌曲清單' });
    }
});

module.exports = router;
