require('dotenv').config();

// 集中所有配置在一個文件中
const config = {
    server: {
        port: process.env.PORT || 3001,
        env: process.env.NODE_ENV || 'development'
    },
    db: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'pitchuser',
        password: process.env.DB_PASSWORD || 'Mypa$$word123!',
        database: process.env.DB_NAME || 'pitch_trainer',
        port: process.env.DB_PORT || 3306,
        connectionLimit: 10
    },
    ai: {
        spleeterPath: process.env.SPLEETER_PATH || '/home/evalhero/spleeter-py10/bin/spleeter',
        basicpitchEnv: process.env.BASICPITCH_ENV || 'basicpitch-env',
        ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg'
    },
    limits: {
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024,
        rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000,
        rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 5
    },
    cache: {
        ttl: parseInt(process.env.CACHE_TTL) || 24 * 60 * 60 * 1000
    },
    paths: {
        uploads: 'uploads',
        tempProcessing: 'temp_processing',
        songs: 'public/songs'
    }
};

module.exports = config;
