export class ErrorHandler {
    static showError(message) {
        console.error(`[-] 錯誤: ${message}`);
        
        // 創建錯誤提示元素
        const toast = document.createElement('div');
        toast.className = 'toast error';
        toast.textContent = message;
        
        // 添加到頁面
        document.body.appendChild(toast);
        
        // 顯示動畫
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // 自動關閉
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 5000);
    }
    
    static async retry(fn, maxRetries = 3, delay = 1000) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                console.warn(`[!] 嘗試 ${attempt}/${maxRetries} 失敗: ${error.message}`);
                lastError = error;
                
                if (attempt < maxRetries) {
                    console.log(`[i] 等待 ${delay}ms 後重試...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    // 指數退避
                    delay *= 2;
                }
            }
        }
        
        throw lastError;
    }
}
