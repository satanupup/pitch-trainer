const fs = require('fs');
const path = require('path');
const config = require('./config');

function validateConfig() {
    const errors = [];
    
    // 檢查資料庫配置
    if (!config.db.password) {
        console.warn('[⚠️] 警告: 未設定資料庫密碼，使用預設值');
    }
    
    // 檢查 AI 工具路徑
    if (!fs.existsSync(config.ai.spleeterPath)) {
        errors.push(`Spleeter 路徑不存在: ${config.ai.spleeterPath}`);
    }
    if (!fs.existsSync(config.ai.ffmpegPath)) {
        errors.push(`FFmpeg 路徑不存在: ${config.ai.ffmpegPath}`);
    }
    
    // 檢查並創建必要的目錄
    const uploadsDir = path.join(__dirname, '..', config.paths.uploads);
    const tempDir = path.join(__dirname, '..', config.paths.tempProcessing);
    const songsDir = path.join(__dirname, '..', config.paths.songs);
    
    [uploadsDir, tempDir, songsDir].forEach(dir => {
        if (!fs.existsSync(dir)) {
            try {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`[✓] 創建目錄: ${dir}`);
            } catch (err) {
                errors.push(`無法創建目錄 ${dir}: ${err.message}`);
            }
        }
    });
    
    if (errors.length > 0) {
        console.error('[-] 配置驗證失敗:');
        errors.forEach(error => console.error(`  - ${error}`));
        return false;
    }
    
    console.log('[✓] 配置驗證通過');
    return true;
}

module.exports = { validateConfig }; 
