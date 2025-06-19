const fs = require('fs');
const path = require('path');

// 注意：這裡不再有 require('./config')
// 所有的 validate 函數都接收一個 config 物件作為參數

function validateServerConfig(config) {
    if (!config?.server?.port) {
        console.warn('[⚠️] 警告: 未設定伺服器端口，使用預設值 3001');
        if (!config) config = {};
        if (!config.server) config.server = {};
        config.server.port = 3001;
    }
    return true;
}

function validateDatabaseConfig(config) {
    if (!config.db?.password) {
        console.warn('[⚠️] 警告: 未設定資料庫密碼，使用預設值');
    }
    return true;
}

function validateAIToolsConfig(config) {
    const errors = [];
    
    // 檢查 Spleeter 路徑
    if (!config.ai?.spleeterPath) {
        console.warn('[⚠️] 警告: 未設定 Spleeter 路徑，使用預設值');
    } else if (!fs.existsSync(config.ai.spleeterPath)) {
        console.warn(`[⚠️] 警告: Spleeter 路徑不存在: ${config.ai.spleeterPath}`);
    }
    
    // 檢查 FFmpeg 路徑
    validateFFmpegPath(config);
    
    return errors;
}

function validateFFmpegPath(config) {
    if (!config.ai?.ffmpegPath) {
        console.warn('[⚠️] 警告: 未設定 FFmpeg 路徑，使用預設值');
        return;
    }
    
    if (!fs.existsSync(config.ai.ffmpegPath)) {
        console.warn(`[⚠️] 警告: FFmpeg 路徑不存在: ${config.ai.ffmpegPath}`);
        tryFindSystemFFmpeg(config);
    }
}

function tryFindSystemFFmpeg(config) {
    try {
        const { execSync } = require('child_process');
        const ffmpegPath = execSync('which ffmpeg').toString().trim();
        if (ffmpegPath) {
            console.log(`[✓] 找到系統 FFmpeg: ${ffmpegPath}`);
            config.ai.ffmpegPath = ffmpegPath;
        }
    } catch (err) {
        handleFFmpegNotFound(config, err);
    }
}

function handleFFmpegNotFound(config, err) {
    console.warn('[⚠️] 無法在系統中找到 FFmpeg:', err.message);
    if (config.ai) {
        config.ai.ffmpegPath = 'ffmpeg';  // 使用預設命令名稱
        console.warn('[⚠️] 已設置 FFmpeg 為預設命令名稱 "ffmpeg"');
    }
}

function validateDirectories(config) {
    const errors = [];
    const dirs = [
        { name: 'uploads', path: config.paths?.uploads || 'uploads' },
        { name: 'temp_processing', path: config.paths?.tempProcessing || 'temp_processing' },
        { name: 'songs', path: config.paths?.songs || 'public/songs' }
    ];
    
    dirs.forEach(dir => {
        const fullPath = path.join(__dirname, '..', dir.path);
        if (!fs.existsSync(fullPath)) {
            try {
                fs.mkdirSync(fullPath, { recursive: true });
                console.log(`[✓] 創建目錄: ${fullPath}`);
            } catch (err) {
                errors.push(`無法創建目錄 ${fullPath}: ${err.message}`);
            }
        }
    });
    
    return errors;
}

function validateConfig(config) {
    const errors = [];
    
    // 執行各項驗證，並將 config 物件傳遞下去
    validateServerConfig(config);
    validateDatabaseConfig(config);
    
    // 收集可能的錯誤
    const aiErrors = validateAIToolsConfig(config);
    const dirErrors = validateDirectories(config);
    
    errors.push(...aiErrors, ...dirErrors);
    
    // 處理錯誤
    if (errors.length > 0) {
        console.error('[-] 配置驗證失敗:');
        errors.forEach(error => console.error(`  - ${error}`));
        return false;
    }
    
    console.log('[✓] 配置驗證通過');
    return true;
}

module.exports = { validateConfig }; 
