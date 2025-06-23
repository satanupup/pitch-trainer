import { ErrorHandler } from './errorHandler.js';
import { state } from './state.js';

// API 基礎路徑
const API_BASE_URL = '/api/v1';

// 獲取歌曲列表
export async function fetchSongs() {
    try {
        console.log('[+] 正在獲取歌曲列表...');
        const response = await ErrorHandler.retry(async () => {
            const res = await fetch(`${API_BASE_URL}/songs`);
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }
            return res;
        });
        
        const songs = await response.json();
        console.log(`[✓] 成功獲取 ${songs.length} 首歌曲`);
        return songs;
    } catch (error) {
        console.error(`[-] 獲取歌曲列表失敗: ${error.message}`);
        ErrorHandler.showError(`無法獲取歌曲列表: ${error.message}`);
        return [];
    }
}

// 處理文件上傳
export async function handleUpload(songFile, onProgress, onComplete, onError) {
    if (!songFile) {
        ErrorHandler.showError('請先選擇一個 MP3 檔案');
        return;
    }
    
    try {
        // 創建表單數據
        const formData = new FormData();
        formData.append('file', songFile);
        
        // 獲取 API 金鑰（如果有）
        const apiKey = state.getApiKey();
        const headers = {};
        if (apiKey) {
            headers['X-API-Key'] = apiKey;
        }
        
        // 發送上傳請求
        const response = await fetch(`${API_BASE_URL}/songs`, {
            method: 'POST',
            headers: headers,
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log(`[✓] 上傳成功，任務 ID: ${data.job_id}`);
        
        // 開始輪詢任務狀態
        pollJobStatus(data.job_id, onProgress, onComplete, onError);
    } catch (error) {
        console.error(`[-] 上傳失敗: ${error.message}`);
        if (onError) onError(error.message);
        else ErrorHandler.showError(`上傳失敗: ${error.message}`);
    }
}

// 輪詢任務狀態
async function pollJobStatus(jobId, onProgress, onComplete, onError) {
    try {
        // 獲取 API 金鑰（如果有）
        const apiKey = state.getApiKey();
        const headers = {};
        if (apiKey) {
            headers['X-API-Key'] = apiKey;
        }
        
        const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
            headers: headers
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        const job = await response.json();
        
        // 更新進度
        if (onProgress) {
            onProgress(job.progress, job.message);
        }
        
        // 檢查任務是否完成
        if (job.status === 'completed') {
            console.log(`[✓] 任務完成: ${jobId}`);
            if (onComplete) onComplete(job);
        } else if (job.status === 'failed') {
            console.error(`[-] 任務失敗: ${job.message}`);
            if (onError) onError(job.message);
        }
    } catch (error) {
        console.error(`[-] 輪詢過程中發生錯誤: ${error.message}`);
        if (onError) onError(error.message);
    }
}
