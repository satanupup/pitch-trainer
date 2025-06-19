const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadLimiter } = require('../middleware/uploadLimiter');
const { validateFile } = require('../middleware/validateFile');
const { handleUpload } = require('../services/fileService');

const upload = multer({ dest: 'uploads/' });

router.post('/', uploadLimiter, upload.single('songfile'), validateFile, handleUpload);

module.exports = router;
