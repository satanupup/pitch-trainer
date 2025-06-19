const mysql = require('mysql2/promise');
require('dotenv').config();

const dbPool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'pitchuser',
    password: process.env.DB_PASSWORD || 'Mypa$$word123!',
    database: process.env.DB_NAME || 'pitch_trainer',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4'
});

module.exports = dbPool; 