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

async function cleanup() {
  const now = Date.now();
  let totalCleaned = 0;
  let totalSize = 0;
  
  for (const dir of DIRS_TO_CLEAN) {
    try {
      console.log(`[+] 開始清理目錄: ${dir}`);
      
      // 確保目錄存在
      try {
        await fs.access(dir);
      } catch (err) {
        console.log(`[!] 目錄不存在，正在創建: ${dir}`);
        await fs.mkdir(dir, { recursive: true });
        continue;
      }
      
      const files = await fs.readdir(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = await fs.stat(filePath);
        
        // 跳過目錄和 .gitkeep 檔案
        if (stats.isDirectory() || file === '.gitkeep') {
          continue;
        }
        
        // 檢查檔案年齡
        const fileAge = now - stats.mtime.getTime();
        if (fileAge > MAX_AGE_MS) {
          totalSize += stats.size;
          await fs.unlink(filePath);
          totalCleaned++;
          console.log(`[✓] 已刪除過期檔案: ${filePath}`);
        }
      }
      
      console.log(`[✓] 目錄清理完成: ${dir}`);
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
