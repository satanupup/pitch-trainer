/**
 * 配置模組 - 集中管理應用配置
 */
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

// 載入環境變數
dotenv.config();

// 檢查必要的環境變數
const requiredEnvVars = [
  'DB_HOST',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.warn(`[⚠️] 警告: 缺少以下環境變數: ${missingVars.join(', ')}`);
  console.warn('[⚠️] 請確保已正確設置 .env 文件');
}

// 配置對象
const config = {
  // 伺服器配置
  server: {
    port: process.env.PORT || 3001,
    env: process.env.NODE_ENV || 'development',
    isDev: (process.env.NODE_ENV || 'development') === 'development',
    host: process.env.HOST || 'localhost',
    baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`
  },
  
  // 資料庫配置
  db: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'pitchuser',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'pitch_trainer',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10)
  },
  
  // AI 工具配置
  ai: {
    spleeterPath: process.env.SPLEETER_PATH || 'spleeter',
    basicPitchEnv: process.env.BASICPITCH_ENV || 'basicpitch-env',
    ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg',
    whisperPath: process.env.WHISPER_PATH || 'whisper',
    preferWhisper: process.env.PREFER_WHISPER === 'true',
    whisperModel: process.env.WHISPER_MODEL || 'medium',
    openaiApiKey: process.env.OPENAI_API_KEY,
    googleCredentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS
  },
  
  // 上傳配置
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600', 10), // 100MB
    allowedTypes: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav'],
    uploadDir: path.join(__dirname, '..', 'uploads'),
    tempDir: path.join(__dirname, '..', 'temp_processing'),
    publicSongsDir: path.join(__dirname, '..', 'public', 'songs')
  },
  
  // 安全配置
  security: {
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10), // 15分鐘
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '5', 10),
    jwtSecret: process.env.JWT_SECRET,
    apiKey: process.env.API_KEY,
    corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3001').split(',')
  },
  
  // 快取配置
  cache: {
    ttl: parseInt(process.env.CACHE_TTL || '86400000', 10) // 24小時
  },
  
  // 日誌配置
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: path.join(__dirname, '..', 'logs', 'app.log')
  },
  
  // 清理配置
  cleanup: {
    maxAgeHours: parseInt(process.env.CLEANUP_MAX_AGE_HOURS || '24', 10),
    keepPatterns: ['demo_*', '.gitkeep']
  }
};

// 確保必要的目錄存在
[config.upload.uploadDir, config.upload.tempDir, config.upload.publicSongsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    console.log(`[+] 創建目錄: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }
});

module.exports = config;

