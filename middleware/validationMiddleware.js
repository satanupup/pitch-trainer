/**
 * 輸入驗證中間件 - 處理請求參數驗證
 */
const { body, param, query, validationResult } = require('express-validator');
const path = require('path');

/**
 * 驗證結果處理中間件
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: { 
        code: 400, 
        message: '輸入驗證失敗',
        details: errors.array() 
      } 
    });
  }
  next();
}

/**
 * 上傳歌曲驗證規則
 */
const uploadSongValidation = [
  body('title')
    .optional()
    .isString().withMessage('歌曲標題必須是字串')
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('歌曲標題長度必須在 1-100 字元之間'),
  
  body('artist')
    .optional()
    .isString().withMessage('歌手名稱必須是字串')
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('歌手名稱長度必須在 1-100 字元之間'),
    
  // 檔案驗證在 multer 中間件中處理
];

/**
 * 檔案名安全處理
 * @param {string} filename - 原始檔案名
 * @returns {string} - 安全處理後的檔案名
 */
function sanitizeFilename(filename) {
  // 移除路徑信息，只保留檔案名
  const basename = path.basename(filename);
  
  // 移除特殊字符，只保留字母、數字、底線、連字符和點
  return basename
    .replace(/[^\w\-.]/g, '_')
    .replace(/_{2,}/g, '_');
}

module.exports = {
  handleValidationErrors,
  uploadSongValidation,
  sanitizeFilename
};


