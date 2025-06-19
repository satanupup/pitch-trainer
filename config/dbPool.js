const mysql = require('mysql2/promise');
const config = require('./config');

// 只使用 mysql2 支援的選項
const dbPool = mysql.createPool({
    host: config.db.host,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    port: config.db.port,
    waitForConnections: true,
    connectionLimit: config.db.connectionLimit,
    queueLimit: 0,
    // 移除所有不支援的選項
    // 不支援: timeout, reconnect, acquireTimeout
    // 保留支援的選項
    charset: 'utf8mb4'
    // 如果 enableKeepAlive 也不支援，請移除它
});

module.exports = dbPool; 
