const mysql = require('mysql2/promise');
const config = require('./config');

const dbPool = mysql.createPool({
    host: config.db.host,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    port: config.db.port,
    waitForConnections: true,
    connectionLimit: config.db.connectionLimit,
    queueLimit: 0,
    charset: 'utf8mb4',
    // 使用 mysql2 支援的選項
    enableKeepAlive: true,
    connectTimeout: 60000
});

module.exports = dbPool; 
