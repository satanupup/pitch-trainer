// 這裡需引入 dbPool/config，實作細節可根據 server.js 內容補齊

const dbPool = require('../config/dbPool');

async function getSongs() {
    const [rows] = await dbPool.query('SELECT name, mp3_path, midi_path, lrc_path FROM songs ORDER BY created_at DESC');
    return rows.map(row => ({ name: row.name, mp3: row.mp3_path, midi: row.midi_path, lrc: row.lrc_path }));
}

async function getJobStatus(jobId) {
    const [rows] = await dbPool.query('SELECT * FROM jobs WHERE id = ?', [jobId]);
    if (rows.length === 0) return null;
    let jobData = rows[0];
    if (jobData.status === 'completed' && jobData.song_id) {
        const [songRows] = await dbPool.query('SELECT name, mp3_path, midi_path, lrc_path FROM songs WHERE id = ?', [jobData.song_id]);
        if(songRows.length > 0) {
            jobData.song = { name: songRows[0].name, mp3: songRows[0].mp3_path, midi: songRows[0].midi_path, lrc: songRows[0].lrc_path };
        }
    }
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
