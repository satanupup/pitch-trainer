/**
 * 載入與進度顯示模組
 */
import { state } from './state.js';

// DOM 元素
const loadingOverlay = document.getElementById('loadingOverlay');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const progressStage = document.getElementById('progressStage');

// 處理階段描述
const stageDescriptions = {
  'upload': '上傳檔案中...',
  'spleeter': '分離人聲與伴奏中...',
  'basicpitch': '提取音符旋律中...',
  'transcribe': '生成歌詞中...',
  'analyze': '分析音訊品質中...',
  'finalize': '最終處理中...'
};

/**
 * 顯示載入畫面
 * @param {string} message - 顯示訊息
 * @param {boolean} showProgress - 是否顯示進度條
 */
export function showLoading(message = '載入中...', showProgress = false) {
  state.loading = true;
  
  progressText.textContent = message;
  progressBar.style.width = '0%';
  progressBar.setAttribute('aria-valuenow', 0);
  
  if (showProgress) {
    progressBar.classList.remove('hidden');
  } else {
    progressBar.classList.add('hidden');
  }
  
  loadingOverlay.classList.remove('hidden');
}

/**
 * 隱藏載入畫面
 */
export function hideLoading() {
  state.loading = false;
  loadingOverlay.classList.add('hidden');
}

/**
 * 更新進度條
 * @param {number} percent - 進度百分比 (0-100)
 * @param {string} stage - 當前處理階段
 */
export function updateProgress(percent, stage = null) {
  const progress = Math.min(Math.max(percent, 0), 100);
  
  // 更新進度條
  progressBar.style.width = `${progress}%`;
  progressBar.setAttribute('aria-valuenow', progress);
  progressText.textContent = `${Math.round(progress)}%`;
  
  // 更新處理階段描述
  if (stage && stageDescriptions[stage]) {
    progressStage.textContent = stageDescriptions[stage];
  }
  
  // 儲存到狀態
  state.progress = {
    percent: progress,
    stage: stage
  };
}

/**
 * 創建任務進度輪詢器
 * @param {string} jobId - 任務 ID
 * @param {Function} onComplete - 完成時的回調函數
 * @param {Function} onError - 錯誤時的回調函數
 * @returns {Object} - 輪詢控制器
 */
export function createJobPoller(jobId, onComplete, onError) {
  let pollInterval = 1000; // 初始輪詢間隔 (1秒)
  const maxInterval = 5000; // 最大輪詢間隔 (5秒)
  let timeoutId = null;
  
  // 顯示載入畫面
  showLoading('處理中...', true);
  
  // 開始輪詢
  const startPolling = async () => {
    try {
      const response = await fetch(`/status/${jobId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '獲取任務狀態失敗');
      }
      
      // 更新進度
      updateProgress(data.progress || 0, data.stage);
      
      // 檢查任務狀態
      if (data.status === 'completed') {
        hideLoading();
        if (onComplete) onComplete(data);
        return;
      } else if (data.status === 'failed') {
        hideLoading();
        if (onError) onError(new Error(data.message || '任務處理失敗'));
        return;
      }
      
      // 繼續輪詢，使用自適應間隔
      pollInterval = Math.min(pollInterval * 1.2, maxInterval);
      timeoutId = setTimeout(startPolling, pollInterval);
      
    } catch (error) {
      console.error('輪詢錯誤:', error);
      // 發生錯誤時，不要立即放棄，而是繼續輪詢
      timeoutId = setTimeout(startPolling, pollInterval * 2);
    }
  };
  
  // 立即開始第一次輪詢
  startPolling();
  
  // 返回控制器
  return {
    stop: () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      hideLoading();
    }
  };
}
