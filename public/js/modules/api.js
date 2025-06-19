import { ErrorHandler } from './errorHandler.js';

async function fetchSongs() {
    try {
        const response = await ErrorHandler.retry(async () => {
            const res = await fetch('/songs');
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            return res;
        });
        return await response.json();
    } catch (error) {
        ErrorHandler.showError(`無法載入歌曲清單: ${error.message}`);
        throw error;
    }
}

async function handleUpload(songFile, onProgress, onComplete, onError) {
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
                body: formData,
                // 不設置超時，因為處理大文件可能需要時間
                // 添加進度事件處理
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    console.log(`[i] 上傳進度: ${percentCompleted}%`);
                    if (onProgress) onProgress({ status: 'uploading', progress: percentCompleted });
                }
            });
            
            if (!res.ok) {
                let errorMessage = `HTTP ${res.status}`;
                try {
                    const errorData = await res.json();
                    errorMessage = errorData.error || errorMessage;
                } catch (e) {
                    // 如果無法解析 JSON，使用狀態文本
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

function startPollingStatus(jobId, onProgress, onComplete, onError) {
    let pollingInterval = setInterval(async () => {
        try {
            const response = await fetch(`/status/${jobId}`);
            if (!response.ok) throw new Error('查詢失敗');
            const job = await response.json();
            if (onProgress) onProgress(job);
            if (job.status === 'completed' || job.status === 'failed') {
                clearInterval(pollingInterval);
                if (onComplete) onComplete(job);
            }
        } catch (error) {
            clearInterval(pollingInterval);
            if (onError) onError(error);
            ErrorHandler.showError(`查詢狀態失敗: ${error.message}`);
        }
    }, 2000);
    return pollingInterval;
}

export { fetchSongs, handleUpload, startPollingStatus }; 
