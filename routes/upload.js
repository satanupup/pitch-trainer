const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { uploadLimiter } = require('../middleware/uploadLimiter');
const { validateFile } = require('../middleware/validateFile');
const { handleUpload } = require('../services/fileService');

// 配置 multer 存儲
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function(req, file, cb) {
    // 使用時間戳和原始文件名創建唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// 創建 multer 實例
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB 限制
  fileFilter: function(req, file, cb) {
    // 只接受 mp3 文件
    if (file.mimetype !== 'audio/mpeg' && !file.originalname.endsWith('.mp3')) {
      return cb(new Error('只接受 MP3 文件'));
    }
    cb(null, true);
  }
});

// 添加詳細的錯誤處理中間件
router.use((err, req, res, next) => {
  console.error('[-] 上傳路由錯誤:', err);
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: '文件太大，超過了大小限制' });
    }
    return res.status(400).json({ error: `上傳錯誤: ${err.message}` });
  }
  res.status(500).json({ error: err.message || '上傳處理過程中發生未知錯誤' });
});

// 上傳路由
router.post('/', uploadLimiter, (req, res, next) => {
  console.log('[+] 收到上傳請求');
  upload.single('songfile')(req, res, (err) => {
    if (err) {
      console.error('[-] Multer 上傳錯誤:', err);
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, validateFile, handleUpload);

module.exports = router;
