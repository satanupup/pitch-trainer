const config = require('./config');
const dbPool = require('./dbPool');
const { validateConfig } = require('./init');

// 導出所有需要的配置和功能
module.exports = {
    ...config,
    dbPool,
    validateConfig
};
