import { ErrorHandler } from './errorHandler.js';
import { state } from './state.js';

// 獲取歌曲列表
export async function fetchSongs() {
    try {
        console.log('[+] 正在獲取歌曲列表...');
        const response = await ErrorHandler.retry(async () => {
            const res = await fetch('/songs');
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
    
    console.log(`[+] 開始上傳文件: ${songFile.name}, 大小: ${songFile.size} 字節`);
    
    const formData = new FormData();
    formData.append('songfile', songFile);
    
    try {
        // 顯示上傳進度
        if (onProgress) onProgress({ status: 'uploading', progress: 0 });
        console.log('[+] 正在發送上傳請求...');
        
        const response = await ErrorHandler.retry(async () => {
            const res = await fetch('/upload', { 
                method: 'POST', 
                body: formData
            });
            
            if (!res.ok) {
                let errorMessage = `HTTP ${res.status}`;
                try {
                    const errorData = await res.json();
                    errorMessage = errorData.error || errorMessage;
                } catch (e) {
                    console.warn(`[-] 無法解析錯誤響應為 JSON: ${e.message}`);
                    errorMessage = `${errorMessage} - ${res.statusText}`;
                }
                console.error(`[-] 上傳請求失敗: ${errorMessage}`);
                throw new Error(errorMessage);
            }
            
            console.log('[✓] 上傳請求成功');
            return res;
        });
        
        const result = await response.json();
        console.log('[✓] 上傳結果:', result);
        
        // 如果有 jobId，開始輪詢狀態
        if (result.jobId) {
            console.log(`[+] 開始輪詢任務狀態: ${result.jobId}`);
            startPollingStatus(result.jobId, onProgress, onComplete, onError);
        } else if (onComplete) {
            onComplete(result);
        }
        
        return result;
    } catch (error) {
        console.error(`[-] 上傳過程中發生錯誤: ${error.message}`);
        if (onError) onError(error);
        ErrorHandler.showError(`上傳失敗: ${error.message}`);
    }
}

// 輪詢任務狀態
function startPollingStatus(jobId, onProgress, onComplete, onError) {
    console.log(`[+] 開始輪詢任務狀態: ${jobId}`);
    
    // 設置輪詢間隔（秒）
    const POLLING_INTERVAL = 5000; // 5秒
    const MAX_RETRIES = 60; // 最多輪詢60次
    let retries = 0;
    
    // 清除之前可能存在的輪詢
    if (state.pollingInterval) {
        clearInterval(state.pollingInterval);
    }
    
    // 創建新的輪詢
    state.pollingInterval = setInterval(() => {
        pollJobStatus(jobId, retries, MAX_RETRIES, onProgress, onComplete, onError);
        retries++;
    }, POLLING_INTERVAL);
}

// 執行單次輪詢
async function pollJobStatus(jobId, retries, maxRetries, onProgress, onComplete, onError) {
    try {
        console.log(`[i] 輪詢任務狀態 (${retries + 1}/${maxRetries}): ${jobId}`);
        
        const response = await fetch(`/status/${jobId}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const statusData = await response.json();
        console.log(`[i] 任務狀態: ${statusData.status}, 進度: ${statusData.progress}%`);
        
        // 更新進度
        updateProgress(statusData, onProgress);
        
        // 處理任務狀態
        handleJobStatus(statusData, retries, maxRetries, jobId, onComplete, onError);
    } catch (error) {
        console.error(`[-] 輪詢過程中發生錯誤: ${error.message}`);
        
        // 如果達到最大重試次數，則停止
        if (retries >= maxRetries) {
            handlePollingTimeout(onError);
        }
    }
}

// 更新進度
function updateProgress(statusData, onProgress) {
    if (onProgress) {
        onProgress({
            status: 'processing',
            progress: statusData.progress || 0,
            message: statusData.message
        });
    }
}

// 處理任務狀態
function handleJobStatus(statusData, retries, maxRetries, jobId, onComplete, onError) {
    // 檢查是否完成
    if (statusData.status === 'completed') {
        handleJobCompleted(statusData, onComplete);
    } 
    // 檢查是否失敗
    else if (statusData.status === 'failed') {
        handleJobFailed(statusData, onError);
    }
    // 檢查是否超過最大重試次數
    else if (retries >= maxRetries) {
        handlePollingTimeout(onError);
    }
}

// 處理任務完成
function handleJobCompleted(statusData, onComplete) {
    console.log('[✓] 任務處理完成');
    clearInterval(state.pollingInterval);
    state.pollingInterval = null;
    
    if (onComplete) {
        onComplete(statusData);
    }
}

// 處理任務失敗
function handleJobFailed(statusData, onError) {
    console.error(`[-] 任務處理失敗: ${statusData.message}`);
    clearInterval(state.pollingInterval);
    state.pollingInterval = null;
    
    if (onError) {
        onError(new Error(statusData.message || '處理失敗'));
    }
}

// 處理輪詢超時
function handlePollingTimeout(onError) {
    console.error(`[-] 輪詢超時: 已達到最大重試次數`);
    clearInterval(state.pollingInterval);
    state.pollingInterval = null;
    
    if (onError) {
        onError(new Error('處理超時，請稍後檢查結果'));
    }
}
