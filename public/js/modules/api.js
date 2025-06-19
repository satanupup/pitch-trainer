import { ErrorHandler } from './errorHandler.js';

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
async function startPollingStatus(jobId, onProgress, onComplete, onError) {
    // 實現輪詢邏輯...
}
