import { ErrorHandler } from './errorHandler.js';
import { state } from './state.js';

// 獲取歌曲列表
export async function getSongs() {
    try {
        const response = await fetch('/songs');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} - ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`[-] 獲取歌曲列表失敗: ${error.message}`);
        throw error;
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
                    // 記錄 JSON 解析錯誤
                    console.warn(`[-] 無法解析錯誤響應為 JSON: ${e.message}`);
                    // 使用狀態文本作為備用
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
    
    // 清除之前的輪詢
    if (state.pollingInterval) {
        clearInterval(state.pollingInterval);
    }
    
    // 設置輪詢間隔
    state.pollingInterval = setInterval(async () => {
        try {
            const response = await fetch(`/status/${jobId}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status} - ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log(`[i] 任務狀態: ${result.status}, 進度: ${result.progress}%, 消息: ${result.message}`);
            
            // 更新進度
            if (onProgress) {
                onProgress({
                    status: 'processing',
                    progress: result.progress,
                    message: result.message
                });
            }
            
            // 檢查任務是否完成
            if (result.status === 'completed') {
                clearInterval(state.pollingInterval);
                state.pollingInterval = null;
                console.log('[✓] 任務完成');
                if (onComplete) onComplete(result);
            } 
            // 檢查任務是否失敗
            else if (result.status === 'failed') {
                clearInterval(state.pollingInterval);
                state.pollingInterval = null;
                console.error(`[-] 任務失敗: ${result.message}`);
                if (onError) onError(new Error(result.message));
                ErrorHandler.showError(`處理失敗: ${result.message}`);
            }
        } catch (error) {
            console.error(`[-] 輪詢狀態時發生錯誤: ${error.message}`);
            // 不要立即停止輪詢，可能是暫時性錯誤
        }
    }, 2000); // 每 2 秒輪詢一次
}

// 確保沒有重複導出 handleUpload
