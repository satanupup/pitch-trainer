#!/usr/bin/env node
/**
 * 自動清理臨時檔案腳本
 * 用法: node scripts/cleanup.js
 */
const fs = require('fs').promises;
const path = require('path');
const dotenv = require('dotenv');

// 載入環境變數
dotenv.config();

// 設定要清理的目錄
const DIRS_TO_CLEAN = [
  path.join(__dirname, '../uploads'),
  path.join(__dirname, '../temp_processing')
];

// 設定檔案保留時間 (從環境變數獲取或使用默認值)
const MAX_AGE_MS = parseInt(process.env.CLEANUP_MAX_AGE_HOURS || '24', 10) * 60 * 60 * 1000;

/**
 * 確保目錄存在，如果不存在則創建
 * @param {string} dir - 目錄路徑
 */
async function ensureDirectoryExists(dir) {
  try {
    await fs.access(dir);
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log(`[!] 目錄不存在，正在創建: ${dir}`);
      try {
        await fs.mkdir(dir, { recursive: true });
        console.log(`[✓] 成功創建目錄: ${dir}`);
      } catch (mkdirErr) {
        console.error(`[-] 無法創建目錄 ${dir}: ${mkdirErr.message}`);
        throw mkdirErr;
      }
      return false; // 表示目錄是新創建的
    }
    
    console.error(`[-] 訪問目錄 ${dir} 時發生錯誤: ${err.message}`);
    throw err;
  }
  return true; // 表示目錄已存在
}

/**
 * 清理單個目錄中的過期文件
 * @param {string} dir - 目錄路徑
 * @param {number} maxAgeMs - 最大保留時間(毫秒)
 * @param {Object} options - 額外選項
 * @returns {Promise<Object>} - 清理結果，包含刪除的文件數和釋放的空間
 */
async function cleanDirectory(dir, maxAgeMs, options = {}) {
  const now = Date.now();
  let cleaned = 0;
  let size = 0;
  let skipped = 0;
  
  console.log(`[+] 開始清理目錄: ${dir}`);
  
  // 確保目錄存在
  const dirExists = await ensureDirectoryExists(dir);
  if (!dirExists) {
    return { cleaned, size, skipped }; // 如果是新創建的目錄，則沒有文件需要清理
  }
  
  // 讀取目錄內容
  const files = await fs.readdir(dir);
  
  // 處理每個文件
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stats = await fs.stat(filePath);
    
    // 跳過目錄和 .gitkeep 檔案
    if (stats.isDirectory() || file === '.gitkeep') {
      continue;
    }
    
    // 跳過保留的文件模式
    if (options.keepPatterns?.some(pattern => {
      const regex = new RegExp(pattern);
      return regex.exec(file) !== null;
    })) {
      skipped++;
      continue;
    }
    
    // 檢查檔案年齡
    const fileAge = now - stats.mtime.getTime();
    if (fileAge > maxAgeMs) {
      size += stats.size;
      await fs.unlink(filePath);
      cleaned++;
      console.log(`[✓] 已刪除過期檔案: ${filePath}`);
    }
  }
  
  console.log(`[✓] 目錄清理完成: ${dir} (刪除: ${cleaned}, 跳過: ${skipped})`);
  return { cleaned, size, skipped };
}

/**
 * 主清理函數
 */
async function cleanup() {
  let totalCleaned = 0;
  let totalSize = 0;
  
  for (const dir of DIRS_TO_CLEAN) {
    try {
      // 確保 cleanDirectory 返回的是 Promise
      const result = await Promise.resolve(cleanDirectory(dir, MAX_AGE_MS));
      totalCleaned += result.cleaned;
      totalSize += result.size;
    } catch (error) {
      console.error(`[-] 清理目錄失敗: ${dir}`, error);
    }
  }
  
  console.log(`[✓] 清理完成! 共刪除 ${totalCleaned} 個檔案，釋放 ${(totalSize / 1024 / 1024).toFixed(2)} MB 空間`);
}

// 執行清理
cleanup().catch(err => {
  console.error('[-] 清理腳本執行失敗:', err);
  process.exit(1);
});






