const fs = require('fs');
const path = require('path');
const config = require('.');

function validateConfig() {
    const errors = [];
    if (!process.env.DB_PASSWORD) {
        console.warn('[⚠️] 警告: 未設定 DB_PASSWORD，使用預設值');
    }
    if (!fs.existsSync(config.ai.spleeterPath)) {
        errors.push(`Spleeter 路徑不存在: ${config.ai.spleeterPath}`);
    }
    if (!fs.existsSync(config.ai.ffmpegPath)) {
        errors.push(`FFmpeg 路徑不存在: ${config.ai.ffmpegPath}`);
    }
    const uploadsDir = path.join(__dirname, '../uploads');
    const tempDir = path.join(__dirname, '../temp_processing');
    const songsDir = path.join(__dirname, '../public/songs');
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