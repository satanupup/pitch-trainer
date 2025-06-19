// 簡化 index.js，避免循環依賴
const config = require('./config');
const dbPool = require('./dbPool');

// 導出配置和資料庫連接池
module.exports = {
    ...config,
    dbPool
    // 不要在這裡引入 validateConfig
};
