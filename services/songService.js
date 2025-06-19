// 這裡需引入 dbPool/config，實作細節可根據 server.js 內容補齊

const dbPool = require('../config/dbPool');

async function getSongs() {
    const [rows] = await dbPool.query('SELECT name, mp3_path, midi_path, lrc_path FROM songs ORDER BY created_at DESC');
    return rows.map(row => ({ name: row.name, mp3: row.mp3_path, midi: row.midi_path, lrc: row.lrc_path }));
}

async function getJobStatus(jobId) {
    const [rows] = await dbPool.query(`
        SELECT j.*, s.name, s.mp3_path, s.midi_path, s.lrc_path 
        FROM jobs j 
        LEFT JOIN songs s ON j.song_id = s.id 
        WHERE j.id = ?
    `, [jobId]);
    
    if (rows.length === 0) return null;
    
    const jobData = rows[0];
    
    // 如果任務已完成且有關聯的歌曲，添加歌曲信息
    if (jobData.status === 'completed' && jobData.song_id) {
        jobData.song = {
            name: jobData.name,
            mp3: jobData.mp3_path,
            midi: jobData.midi_path,
            lrc: jobData.lrc_path
        };
    }
    
    // 刪除不需要的欄位
    delete jobData.name;
    delete jobData.mp3_path;
    delete jobData.midi_path;
    delete jobData.lrc_path;
    
    return jobData;
}

async function checkHealth() {
    // 檢查資料庫連接
    const connection = await dbPool.getConnection();
    await connection.ping();
    connection.release();
    return { status: 'healthy', timestamp: new Date().toISOString() };
}

module.exports = { getSongs, getJobStatus, checkHealth };
