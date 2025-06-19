#!/usr/bin/env node
/**
 * 自動清理臨時檔案腳本
 * 用法: node scripts/cleanup.js
 */
const fs = require('fs').promises;
const path = require('path');

// 設定要清理的目錄
const DIRS_TO_CLEAN = [
  path.join(__dirname, '../uploads'),
  path.join(__dirname, '../temp_processing')
];

// 設定檔案保留時間 (24小時)
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

async function cleanup() {
  const now = Date.now();
  
  for (const dir of DIRS_TO_CLEAN) {
    try {
      console.log(`[+] 開始清理目錄: ${dir}`);
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
          await fs.unlink(filePath);
          console.log(`[✓] 已刪除過期檔案: ${filePath}`);
        }
      }
      
      console.log(`[✓] 目錄清理完成: ${dir}`);
    } catch (error) {
      console.error(`[-] 清理目錄失敗: ${dir}`, error);
    }
  }
}

// 執行清理
cleanup().catch(err => {
  console.error('[-] 清理腳本執行失敗:', err);
  process.exit(1);
});