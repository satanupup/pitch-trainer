const mysql = require('mysql2/promise');
// 我們需要從主設定檔中只讀取 db 部分
const { db: dbConfig } = require('./config'); 

// 建立連線池，只傳遞 mysql2/promise 支援的選項
const dbPool = mysql.createPool({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    port: dbConfig.port,
    
    // 以下是連線池的標準設定
    waitForConnections: true, // 當沒有可用連線時，新的請求會排隊等待而不是立即失敗
    connectionLimit: dbConfig.connectionLimit || 10, // 連線池中最大連線數
    queueLimit: 0, // 排隊請求的最大數量，0 代表沒有限制

    // 使用 utf8mb4 來支援表情符號等特殊字元
    charset: 'utf8mb4' 
});

module.exports = dbPool;