/**
 * CORS 中間件 - 處理跨域資源共享
 */
const config = require('../config/config');

/**
 * 配置 CORS 中間件
 * @param {Object} options - CORS 選項
 * @returns {Function} Express 中間件函數
 */
function corsMiddleware(options = {}) {
  // 從環境變數或配置中獲取允許的來源
  const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3001').split(',');
  
  return (req, res, next) => {
    const origin = req.headers.origin;
    
    // 檢查請求來源是否在允許列表中
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (allowedOrigins.includes('*')) {
      // 如果允許所有來源 (開發模式)
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    
    // 設置其他 CORS 標頭
    res.setHeader('Access-Control-Allow-Methods', options.methods || 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', options.headers || 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', options.credentials || 'true');
    
    // 處理預檢請求
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    next();
  };
}

module.exports = corsMiddleware;