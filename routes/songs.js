const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { getSongs, getSongById, deleteSong, updateSongMeta } = require('../services/songService');
const { handleUpload } = require('../services/uploadService');
const { regenerateLyrics } = require('../services/lyricsService');
const { getAnalysis } = require('../services/analysisService');
const { apiKeyAuth } = require('../middleware/authMiddleware');
const config = require('../config/config');

// 設置 multer 儲存
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, config.upload.uploadDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// 創建 multer 實例
const upload = multer({ 
  storage: storage,
  limits: { fileSize: config.upload.maxFileSize },
  fileFilter: function(req, file, cb) {
    if (!config.upload.allowedTypes.includes(file.mimetype)) {
      return cb(new Error('不支援的檔案類型'));
    }
    cb(null, true);
  }
});

// 獲取所有歌曲 (不需要認證)
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const sort = req.query.sort || 'created_at';
    const order = req.query.order || 'desc';
    
    const songs = await getSongs(limit, offset, sort, order);
    res.json(songs);
  } catch (error) {
    console.error("[-] API /songs 錯誤:", error);
    res.status(500).json({ error: { code: 500, message: '無法取得歌曲清單' } });
  }
});

// 獲取單首歌曲 (不需要認證)
router.get('/:id', async (req, res) => {
  try {
    const songId = parseInt(req.params.id);
    const song = await getSongById(songId);
    
    if (!song) {
      return res.status(404).json({ error: { code: 404, message: '找不到指定歌曲' } });
    }
    
    res.json(song);
  } catch (error) {
    console.error(`[-] API /songs/${req.params.id} 錯誤:`, error);
    res.status(500).json({ error: { code: 500, message: '無法取得歌曲資訊' } });
  }
});

// 獲取歌詞 (不需要認證)
router.get('/:id/lyrics', async (req, res) => {
  try {
    const songId = parseInt(req.params.id);
    const song = await getSongById(songId);
    
    if (!song?.lrc_path) {
      return res.status(404).json({ error: { code: 404, message: '找不到指定歌曲的歌詞' } });
    }
    
    // 讀取歌詞文件並返回
    const fs = require('fs');
    const lrcPath = path.join(__dirname, '..', song.lrc_path);
    
    if (!fs.existsSync(lrcPath)) {
      return res.status(404).json({ error: { code: 404, message: '歌詞文件不存在' } });
    }
    
    const lrcContent = fs.readFileSync(lrcPath, 'utf8');
    res.set('Content-Type', 'text/plain');
    res.send(lrcContent);
  } catch (error) {
    console.error(`[-] API /songs/${req.params.id}/lyrics 錯誤:`, error);
    res.status(500).json({ error: { code: 500, message: '無法取得歌詞' } });
  }
});

// 獲取音高分析 (不需要認證)
router.get('/:id/analysis', async (req, res) => {
  try {
    const songId = parseInt(req.params.id);
    const analysis = await getAnalysis(songId);
    
    if (!analysis) {
      return res.status(404).json({ error: { code: 404, message: '找不到指定歌曲的分析數據' } });
    }
    
    res.json(analysis);
  } catch (error) {
    console.error(`[-] API /songs/${req.params.id}/analysis 錯誤:`, error);
    res.status(500).json({ error: { code: 500, message: '無法取得音高分析' } });
  }
});

// 上傳歌曲 (需要認證)
router.post('/', apiKeyAuth, (req, res, next) => {
  console.log('[+] 收到上傳請求');
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('[-] Multer 上傳錯誤:', err);
      return res.status(400).json({ error: { code: 400, message: err.message } });
    }
    next();
  });
}, handleUpload);

// 更新歌曲元數據 (需要認證)
router.patch('/:id', apiKeyAuth, async (req, res) => {
  try {
    const songId = parseInt(req.params.id);
    const metaData = req.body;
    
    const updatedSong = await updateSongMeta(songId, metaData);
    
    if (!updatedSong) {
      return res.status(404).json({ error: { code: 404, message: '找不到指定歌曲' } });
    }
    
    res.json({
      success: true,
      message: '元數據已更新',
      song: updatedSong
    });
  } catch (error) {
    console.error(`[-] API /songs/${req.params.id} PATCH 錯誤:`, error);
    res.status(500).json({ error: { code: 500, message: '無法更新歌曲元數據' } });
  }
});

// 刪除歌曲 (需要認證)
router.delete('/:id', apiKeyAuth, async (req, res) => {
  try {
    const songId = parseInt(req.params.id);
    const result = await deleteSong(songId);
    
    if (!result) {
      return res.status(404).json({ error: { code: 404, message: '找不到指定歌曲' } });
    }
    
    res.json({
      success: true,
      message: '歌曲已成功刪除'
    });
  } catch (error) {
    console.error(`[-] API /songs/${req.params.id} DELETE 錯誤:`, error);
    res.status(500).json({ error: { code: 500, message: '無法刪除歌曲' } });
  }
});

// 重新生成歌詞 (需要認證)
router.post('/:id/regenerate-lyrics', apiKeyAuth, async (req, res) => {
  try {
    const songId = parseInt(req.params.id);
    const { model, language } = req.body;
    
    const job = await regenerateLyrics(songId, model, language);
    
    if (!job) {
      return res.status(404).json({ error: { code: 404, message: '找不到指定歌曲' } });
    }
    
    res.json({
      job_id: job.id,
      message: '歌詞重新生成任務已啟動',
      status: 'pending'
    });
  } catch (error) {
    console.error(`[-] API /songs/${req.params.id}/regenerate-lyrics 錯誤:`, error);
    res.status(500).json({ error: { code: 500, message: '無法啟動歌詞重新生成任務' } });
  }
});

module.exports = router;
