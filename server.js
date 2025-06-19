// ==========================================================
// AI 音準資源製作器 - 後端 v5.1 (環境變數優化版本)
// ==========================================================
require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const { exec } = require('child_process');
const { SpeechClient } = require('@google-cloud/speech');

// 中間件
const { performanceMonitor } = require('./middleware/performanceMonitor');
const { errorHandler } = require('./middleware/errorHandler');

// 配置
const config = require('./config/config');  // 直接引入 config.js
const dbPool = require('./config/dbPool');  // 直接引入 dbPool.js
const { validateConfig } = require('./config/init');  // 直接引入 validateConfig

const app = express();
// 直接使用環境變數，避免依賴 configModule
const PORT = process.env.PORT || 3001;

// 確保 config.server.port 與 PORT 一致
if (config && config.server) {
    config.server.port = PORT;
}

// 使用從配置導入的設定
app.use(express.static(path.join(__dirname, 'public')));
app.use(performanceMonitor);

// --- API 端點 ---
app.use('/', require('./routes/root'));
app.use('/songs', require('./routes/songs'));
app.use('/upload', require('./routes/upload'));
app.use('/status', require('./routes/status'));
app.use('/health', require('./routes/health'));

app.use(errorHandler);

async function startServer() {
    try {
        console.log('[+] 開始啟動 AI 音準資源製作器...');
        // 驗證配置
        if (!validateConfig()) {
            console.error('[-] 配置驗證失敗，無法啟動伺服器');
            process.exit(1);
        }
        
        console.log('[+] 正在建立 MySQL 資料庫連線池...');
        
        const connection = await dbPool.getConnection();
        await connection.ping();
        connection.release();
        console.log('[✓] MySQL 資料庫連接成功！');
        
        // --- 關鍵：啟動 HTTP 服務 ---
        app.listen(PORT, () => {
            console.log(`✅ Server running on port ${PORT}`);
            console.log(`[✓] AI 資源製作器後端已啟動於 http://localhost:${PORT}`);
            console.log(`[✓] 環境: ${process.env.NODE_ENV || 'development'}`);
            console.log(`[✓] 檔案大小限制: ${config.limits.maxFileSize / 1024 / 1024}MB`);
            console.log(`[✓] 速率限制: ${config.limits.rateLimitMax} 次/${config.limits.rateLimitWindow / 1000 / 60} 分鐘`);
        });
    } catch (error) {
        console.error('[-] 伺服器啟動失敗:', error);
        process.exit(1);
    }
}
startServer();
