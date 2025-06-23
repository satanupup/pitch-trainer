/**
 * 全局錯誤處理中間件
 */
const config = require('../config/config');

function errorHandler(err, req, res, next) {
  // 獲取錯誤詳情
  const statusCode = err.statusCode || 500;
  const errorMessage = err.message || '伺服器內部錯誤';
  const errorStack = config.env === 'development' ? err.stack : undefined;
  
  // 記錄錯誤
  console.error(`[❌] 錯誤 (${statusCode}): ${errorMessage}`);
  if (errorStack) {
    console.error(errorStack);
  }
  
  // 區分 API 請求和頁面請求
  const isApiRequest = req.path.startsWith('/api') || 
                       req.xhr || 
                       req.headers.accept?.includes('application/json');
  
  if (isApiRequest) {
    // API 錯誤返回 JSON
    return res.status(statusCode).json({
      error: {
        code: statusCode,
        message: errorMessage,
        ...(config.env === 'development' && { stack: errorStack })
      }
    });
  } else {
    // 頁面錯誤返回錯誤頁面
    return res.status(statusCode).send(`
      <html>
        <head>
          <title>錯誤 - Pitch Trainer</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .error-container { max-width: 800px; margin: 0 auto; }
            .error-code { font-size: 72px; color: #e74c3c; }
            .error-message { font-size: 24px; margin-bottom: 20px; }
            .error-stack { background: #f8f9fa; padding: 15px; border-radius: 4px; overflow: auto; }
            .back-button { display: inline-block; margin-top: 20px; padding: 10px 15px; background: #3498db; color: white; text-decoration: none; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="error-container">
            <h1 class="error-code">${statusCode}</h1>
            <p class="error-message">${errorMessage}</p>
            ${errorStack ? `<pre class="error-stack">${errorStack}</pre>` : ''}
            <a href="/" class="back-button">返回首頁</a>
          </div>
        </body>
      </html>
    `);
  }
}

module.exports = errorHandler;
