/**
 * 錯誤處理模組 - 處理前端錯誤並提供重試機制
 */
import { showToast } from './ui.js';
import { state } from './state.js';

// 錯誤類型常量
export const ErrorTypes = {
  NETWORK: 'network',
  API: 'api',
  AUDIO: 'audio',
  PERMISSION: 'permission',
  UNKNOWN: 'unknown'
};

// 重試配置
const retryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1秒
  maxDelay: 10000  // 10秒
};

// 錯誤處理映射
const errorHandlers = {
  [ErrorTypes.NETWORK]: handleNetworkError,
  [ErrorTypes.API]: handleApiError,
  [ErrorTypes.AUDIO]: handleAudioError,
  [ErrorTypes.PERMISSION]: handlePermissionError,
  [ErrorTypes.UNKNOWN]: handleUnknownError
};

/**
 * 主要錯誤處理函數
 * @param {Error} error - 錯誤對象
 * @param {string} type - 錯誤類型
 * @param {Function} retryCallback - 重試回調函數
 */
export function handleError(error, type = ErrorTypes.UNKNOWN, retryCallback = null) {
  console.error(`[錯誤] ${type}:`, error);
  
  // 記錄錯誤到狀態
  state.errors.push({
    type,
    message: error.message,
    timestamp: Date.now()
  });
  
  // 調用對應的錯誤處理器
  const handler = errorHandlers[type] || errorHandlers[ErrorTypes.UNKNOWN];
  handler(error, retryCallback);
}

/**
 * 網絡錯誤處理
 */
function handleNetworkError(error, retryCallback) {
  showToast('網絡連接錯誤，請檢查您的網絡連接', 'error');
  
  if (retryCallback && navigator.onLine) {
    retryWithBackoff(retryCallback);
  }
}

/**
 * API 錯誤處理
 */
function handleApiError(error, retryCallback) {
  const status = error.status || 0;
  
  if (status >= 500) {
    showToast('伺服器錯誤，請稍後再試', 'error');
    if (retryCallback) {
      retryWithBackoff(retryCallback);
    }
  } else if (status === 429) {
    showToast('請求過於頻繁，請稍後再試', 'warning');
    // 429 錯誤不自動重試
  } else if (status === 401 || status === 403) {
    showToast('授權失敗，請重新登入', 'error');
    // 可以在這裡添加重定向到登入頁面的邏輯
  } else {
    showToast(`API 錯誤: ${error.message || '未知錯誤'}`, 'error');
  }
}

/**
 * 音訊錯誤處理
 */
function handleAudioError(error, retryCallback) {
  showToast(`音訊處理錯誤: ${error.message}`, 'error');
  
  if (retryCallback) {
    retryWithBackoff(retryCallback);
  }
}

/**
 * 權限錯誤處理
 */
function handlePermissionError(error) {
  showToast('無法訪問麥克風，請授予麥克風權限後重試', 'error');
  // 顯示幫助信息
  document.getElementById('permissionHelp').classList.remove('hidden');
}

/**
 * 未知錯誤處理
 */
function handleUnknownError(error) {
  showToast(`發生錯誤: ${error.message || '未知錯誤'}`, 'error');
}

/**
 * 使用指數退避策略進行重試
 * @param {Function} callback - 重試回調函數
 * @param {number} attempt - 當前嘗試次數
 */
function retryWithBackoff(callback, attempt = 1) {
  if (attempt > retryConfig.maxRetries) {
    showToast('多次嘗試失敗，請稍後再試', 'error');
    return;
  }
  
  // 計算延遲時間 (指數退避)
  const delay = Math.min(
    retryConfig.baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000,
    retryConfig.maxDelay
  );
  
  showToast(`正在重試 (${attempt}/${retryConfig.maxRetries})...`, 'info');
  
  setTimeout(() => {
    callback(attempt);
  }, delay);
}
