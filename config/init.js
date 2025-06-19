const fs = require('fs');
const path = require('path');

// 不再引入 config/index.js，而是直接從環境變數讀取
const aiConfig = {
    spleeterPath: process.env.SPLEETER_PATH || '/home/evalhero/spleeter-py10/bin/spleeter',
    basicpitchEnv: process.env.BASICPITCH_ENV || 'basicpitch-env',
    ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg'
};

function validateConfig() {
    const errors = [];
    if (!process.env.DB_PASSWORD) {
        console.warn('[⚠️] 警告: 未設定 DB_PASSWORD，使用預設值');
    }
    if (!fs.existsSync(aiConfig.spleeterPath)) {
        errors.push(`Spleeter 路徑不存在: ${aiConfig.spleeterPath}`);
    }
    if (!fs.existsSync(aiConfig.ffmpegPath)) {
        errors.push(`FFmpeg 路徑不存在: ${aiConfig.ffmpegPath}`);
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
