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
    const formData = new FormData();
    formData.append('songfile', songFile);
    try {
        const response = await ErrorHandler.retry(async () => {
            const res = await fetch('/upload', { method: 'POST', body: formData });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || `HTTP ${res.status}`);
            }
            return res;
        });
        const result = await response.json();
        if (onComplete) onComplete(result);
        return result;
    } catch (error) {
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