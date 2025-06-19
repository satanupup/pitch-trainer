const dbPool = require('./dbPool');
const { validateConfig } = require('./init');

const ai = {
    spleeterPath: process.env.SPLEETER_PATH || '/home/evalhero/spleeter-py10/bin/spleeter',
    basicpitchEnv: process.env.BASICPITCH_ENV || 'basicpitch-env',
    ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg'
};

const limits = {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024,
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000,
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 5
};

module.exports = { dbPool, ai, limits, validateConfig }; 