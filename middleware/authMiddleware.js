/**
 * 認證中間件 - 處理 API 認證
 */
const jwt = require('jsonwebtoken');
const config = require('../config/config');

/**
 * 簡單 API 金鑰驗證中間件
 * 用於基本的 API 保護，適用於內部或開發環境
 */
function apiKeyAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  
  // 如果未設置 API_KEY 環境變數，則跳過驗證（開發模式）
  if (!process.env.API_KEY) {
    return next();
  }
  
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: { code: 401, message: '無效的 API 金鑰' } });
  }
  
  next();
}

/**
 * JWT 認證中間件
 * 用於更安全的用戶認證，適用於生產環境
 */
function jwtAuth(req, res, next) {
  // 如果未設置 JWT_SECRET 環境變數，則跳過驗證（開發模式）
  if (!process.env.JWT_SECRET) {
    return next();
  }
  
  const authHeader = req.headers.authorization;
  // 使用可選鏈運算符，更簡潔易讀
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: { code: 401, message: '未提供認證令牌' } });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    // 處理特定的錯誤類型，而不是捕獲所有錯誤
    if (err instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: { code: 401, message: '無效的認證令牌' } });
    } else if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: { code: 401, message: '認證令牌已過期' } });
    }
    // 其他未預期的錯誤，重新拋出以便全局錯誤處理器處理
    throw err;
  }
}

module.exports = {
  apiKeyAuth,
  jwtAuth
};
