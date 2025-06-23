# Pitch Trainer 故障排除指南

本文檔提供 Pitch Trainer 應用程式常見問題的故障排除步驟和解決方案。

## 目錄

- [安裝問題](#安裝問題)
- [資料庫問題](#資料庫問題)
- [AI 模型問題](#ai-模型問題)
- [音訊處理問題](#音訊處理問題)
- [前端界面問題](#前端界面問題)
- [API 問題](#api-問題)
- [Docker 問題](#docker-問題)
- [效能問題](#效能問題)
- [常見錯誤代碼](#常見錯誤代碼)
- [聯繫支援](#聯繫支援)

## 安裝問題

### Node.js 版本不兼容

**症狀**: 啟動應用時出現 `SyntaxError` 或其他 JavaScript 相關錯誤。

**解決方案**:
1. 確認您的 Node.js 版本 (需要 v14.0.0 或更高):
   ```bash
   node -v
   ```
2. 如果版本過低，請更新 Node.js:
   ```bash
   # 使用 nvm (推薦)
   nvm install 16
   nvm use 16
   
   # 或直接從官網下載新版本
   ```

### Python 依賴安裝失敗

**症狀**: 安裝 Python 依賴時出現錯誤，特別是與 `basic-pitch` 或 `parselmouth` 相關的錯誤。

**解決方案**:
1. 確保已安裝 Python 3.8 或更高版本:
   ```bash
   python --version
   ```
2. 確保已安裝 Conda:
   ```bash
   conda --version
   ```
3. 使用 Conda 創建獨立環境:
   ```bash
   conda create -n pitch-env python=3.8
   conda activate pitch-env
   ```
4. 安裝依賴:
   ```bash
   pip install -r requirements.txt
   ```

### 找不到 Spleeter 或 Basic Pitch

**症狀**: 上傳歌曲後處理失敗，日誌顯示找不到 Spleeter 或 Basic Pitch。

**解決方案**:
1. 確認環境變數中的路徑配置:
   ```bash
   # 檢查 .env 文件中的路徑
   SPLEETER_PATH=/path/to/spleeter
   BASIC_PITCH_PATH=/path/to/basic-pitch
   ```
2. 手動安裝這些工具:
   ```bash
   # 安裝 Spleeter
   pip install spleeter
   
   # 安裝 Basic Pitch
   pip install basic-pitch
   ```

## 資料庫問題

### 無法連接到資料庫

**症狀**: 應用啟動時顯示 "Error: connect ECONNREFUSED 127.0.0.1:3306"。

**解決方案**:
1. 確認 MySQL 服務是否運行:
   ```bash
   # Linux/Mac
   sudo systemctl status mysql
   
   # Windows
   net start | findstr MySQL
   ```
2. 檢查資料庫配置:
   ```bash
   # 檢查 .env 文件中的配置
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=pitchuser
   DB_PASSWORD=your_password
   DB_NAME=pitch_trainer
   ```
3. 嘗試使用命令行連接資料庫:
   ```bash
   mysql -u pitchuser -p -h localhost
   ```

### 資料庫權限問題

**症狀**: 應用可以連接到資料庫，但無法創建表或插入數據。

**解決方案**:
1. 確認用戶權限:
   ```sql
   SHOW GRANTS FOR 'pitchuser'@'%';
   ```
2. 如果權限不足，授予必要權限:
   ```sql
   GRANT ALL PRIVILEGES ON pitch_trainer.* TO 'pitchuser'@'%';
   FLUSH PRIVILEGES;
   ```

### 資料庫結構不匹配

**症狀**: 應用啟動後出現 "Table 'xxx' doesn't exist" 或欄位不匹配的錯誤。

**解決方案**:
1. 檢查資料庫結構是否與最新版本匹配:
   ```sql
   SHOW TABLES;
   DESCRIBE songs;
   DESCRIBE songs_meta;
   DESCRIBE jobs;
   ```
2. 如果結構不匹配，執行最新的資料庫遷移腳本:
   ```bash
   # 如果使用手動 SQL 腳本
   mysql -u pitchuser -p pitch_trainer < migrations/latest.sql
   
   # 或重新初始化資料庫 (注意: 這將刪除所有數據)
   mysql -u pitchuser -p pitch_trainer < init-db/schema.sql
   ```

## AI 模型問題

### Whisper 模型下載失敗

**症狀**: 處理任務失敗，日誌顯示 "Failed to download Whisper model"。

**解決方案**:
1. 檢查網絡連接
2. 手動下載模型:
   ```bash
   # 創建模型目錄
   mkdir -p models/whisper
   
   # 手動下載模型 (以 base 模型為例)
   wget https://openaipublic.azureedge.net/main/whisper/models/ed3a0b6b1c0edf879ad9b11b1af5a0e6ab5db9205f891f668f8b0e6c6326e34e/base.pt -O models/whisper/base.pt
   ```
3. 在 `.env` 文件中指定模型路徑:
   ```
   WHISPER_MODEL_PATH=models/whisper/base.pt
   ```

### Spleeter 分離失敗

**症狀**: 人聲分離任務失敗，日誌顯示 Spleeter 相關錯誤。

**解決方案**:
1. 確認 Spleeter 已正確安裝:
   ```bash
   pip show spleeter
   ```
2. 檢查預訓練模型是否已下載:
   ```bash
   # 手動下載預訓練模型
   spleeter separate -p spleeter:2stems -o output_dir dummy.mp3
   ```
3. 檢查音訊文件格式是否支持:
   ```bash
   # 轉換為支持的格式
   ffmpeg -i input.m4a output.mp3
   ```

### Basic Pitch 提取失敗

**症狀**: 旋律提取任務失敗，日誌顯示 Basic Pitch 相關錯誤。

**解決方案**:
1. 確認 Basic Pitch 已正確安裝:
   ```bash
   pip show basic-pitch
   ```
2. 檢查 Conda 環境是否激活:
   ```bash
   # 激活環境
   conda activate basicpitch-env
   ```
3. 手動測試 Basic Pitch:
   ```bash
   basic-pitch /path/to/audio.mp3 --save-midi
   ```

## 音訊處理問題

### 上傳文件格式不支持

**症狀**: 上傳文件後立即失敗，顯示 "Unsupported file format"。

**解決方案**:
1. 確認文件格式是否在支持列表中 (MP3, WAV, FLAC, OGG, M4A)
2. 使用 FFmpeg 轉換為支持的格式:
   ```bash
   ffmpeg -i input.aac output.mp3
   ```

### 處理大文件失敗

**症狀**: 上傳大文件後處理失敗，可能顯示超時或記憶體錯誤。

**解決方案**:
1. 檢查上傳文件大小限制:
   ```javascript
   // 在 server.js 中
   const upload = multer({
     limits: { fileSize: 100 * 1024 * 1024 } // 100MB
   });
   ```
2. 增加處理超時設置:
   ```
   # 在 .env 文件中
   PROCESSING_TIMEOUT=1800000  # 30分鐘
   ```
3. 使用 FFmpeg 壓縮文件:
   ```bash
   ffmpeg -i input.wav -b:a 320k output.mp3
   ```

### 音訊質量問題

**症狀**: 處理後的音訊質量較差，有噪音或失真。

**解決方案**:
1. 檢查輸出格式和比特率設置:
   ```
   # 在 .env 文件中
   OUTPUT_AUDIO_FORMAT=mp3
   OUTPUT_AUDIO_BITRATE=320k
   ```
2. 使用更高質量的輸入文件
3. 調整 Spleeter 分離參數:
   ```bash
   # 使用 4 聲道模式獲得更好的分離效果
   spleeter separate -p spleeter:4stems -o output_dir input.mp3
   ```

## 前端界面問題

### 麥克風訪問被拒絕

**症狀**: 無法使用麥克風功能，瀏覽器顯示權限被拒絕。

**解決方案**:
1. 確保瀏覽器有麥克風訪問權限:
   - Chrome: 設置 > 隱私與安全性 > 網站設置 > 麥克風
   - Firefox: 設置 > 隱私與安全 > 權限 > 麥克風
2. 使用 HTTPS 連接 (本地開發可使用 localhost)
3. 在代碼中添加適當的錯誤處理:
   ```javascript
   navigator.mediaDevices.getUserMedia({ audio: true })
     .catch(error => {
       if (error.name === 'NotAllowedError') {
         alert('請允許麥克風訪問以使用此功能');
       }
     });
   ```

### Canvas 渲染問題

**症狀**: 音符軌道不顯示或顯示異常。

**解決方案**:
1. 檢查瀏覽器是否支持 Canvas API
2. 確認 JavaScript 錯誤控制台中是否有錯誤
3. 嘗試清除瀏覽器緩存
4. 檢查 Canvas 初始化代碼:
   ```javascript
   const canvas = document.getElementById('noteCanvas');
   if (canvas && canvas.getContext) {
     const ctx = canvas.getContext('2d');
     // 繪製代碼
   } else {
     console.error('Canvas not supported or not found');
   }
   ```

### 音訊播放問題

**症狀**: 音訊無法播放或播放中斷。

**解決方案**:
1. 檢查瀏覽器控制台是否有錯誤
2. 確認音訊文件是否正確加載:
   ```javascript
   const audio = new Audio(url);
   audio.addEventListener('error', (e) => {
     console.error('Audio error:', e);
   });
   ```
3. 嘗試使用不同的音訊格式 (MP3, WAV)
4. 檢查瀏覽器是否支持該音訊格式

## API 問題

### API 請求超時

**症狀**: API 請求長時間無響應或返回超時錯誤。

**解決方案**:
1. 檢查服務器負載和網絡連接
2. 增加客戶端超時設置:
   ```javascript
   // 使用 axios
   axios.get('/api/endpoint', { timeout: 30000 }) // 30秒
     .then(response => {
       // 處理響應
     })
     .catch(error => {
       if (error.code === 'ECONNABORTED') {
         console.error('Request timed out');
       }
     });
   ```
3. 增加服務器超時設置:
   ```javascript
   // 在 server.js 中
   app.use((req, res, next) => {
     req.setTimeout(300000); // 5分鐘
     next();
   });
   ```

### 速率限制錯誤

**症狀**: API 返回 429 Too Many Requests 錯誤。

**解決方案**:
1. 減少請求頻率
2. 實現指數退避重試:
   ```javascript
   async function fetchWithRetry(url, options = {}, maxRetries = 3) {
     let retries = 0;
     while (retries < maxRetries) {
       try {
         const response = await fetch(url, options);
         if (response.status === 429) {
           const retryAfter = response.headers.get('Retry-After') || Math.pow(2, retries);
           await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
           retries++;
           continue;
         }
         return response;
       } catch (error) {
         retries++;
         if (retries >= maxRetries) throw error;
         await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
       }
     }
   }
   ```

### API 認證問題

**症狀**: API 返回 401 Unauthorized 或 403 Forbidden 錯誤。

**解決方案**:
1. 檢查 API 金鑰或令牌是否正確:
   ```javascript
   // 在 API 請求中包含認證
   fetch('/api/endpoint', {
     headers: {
       'Authorization': `Bearer ${apiToken}`
     }
   });
   ```
2. 確認令牌是否過期
3. 檢查用戶權限

## Docker 問題

### 容器啟動失敗

**症狀**: Docker 容器無法啟動或立即退出。

**解決方案**:
1. 檢查容器日誌:
   ```bash
   docker logs pitch-trainer
   ```
2. 確認環境變數是否正確設置:
   ```bash
   # 檢查 .env 文件
   # 確保 docker-compose.yml 正確引用環境變數
   ```
3. 檢查磁盤空間和記憶體:
   ```bash
   # 檢查磁盤空間
   df -h
   
   # 檢查 Docker 資源
   docker info
   ```

### 容器間通信問題

**症狀**: 應用容器無法連接到資料庫容器。

**解決方案**:
1. 確認容器網絡配置:
   ```bash
   # 檢查網絡
   docker network ls
   docker network inspect pitch-trainer_default
   ```
2. 確認容器名稱解析:
   ```bash
   # 進入應用容器
   docker-compose exec pitch-trainer bash
   
   # 測試連接
   ping db
   telnet db 3306
   ```
3. 檢查 docker-compose.yml 中的網絡配置:
   ```yaml
   services:
     app:
       networks:
         - app-network
     db:
       networks:
         - app-network
   
   networks:
     app-network:
       driver: bridge
   ```

### 卷掛載問題

**症狀**: 容器無法訪問主機上的文件或目錄。

**解決方案**:
1. 檢查卷掛載配置:
   ```bash
   docker-compose config
   ```
2. 確認主機路徑存在且有正確權限:
   ```bash
   # 創建目錄並設置權限
   mkdir -p ./uploads
   chmod 777 ./uploads
   ```
3. 使用絕對路徑:
   ```yaml
   volumes:
     - /absolute/path/to/uploads:/app/uploads
   ```

## 效能問題

### 處理速度慢

**症狀**: 歌曲處理需要很長時間才能完成。

**解決方案**:
1. 檢查系統資源使用:
   ```bash
   # 檢查 CPU 和記憶體使用
   top
   htop
   ```
2. 優化 AI 模型配置:
   ```
   # 在 .env 文件中
   WHISPER_MODEL=base  # 使用較小的模型
   SPLEETER_MODEL=2stems  # 使用 2 聲道而非 4 聲道
   ```
3. 增加處理任務的並行度:
   ```javascript
   // 在 config.js 中
   module.exports = {
     maxConcurrentJobs: 3  // 根據系統資源調整
   };
   ```

### 記憶體使用過高

**症狀**: 應用或容器因記憶體不足而崩潰。

**解決方案**:
1. 增加可用記憶體:
   ```bash
   # 如果使用 Docker，增加容器記憶體限制
   docker-compose up -d --scale app=1 --memory=4g
   ```
2. 優化大文件處理:
   ```javascript
   // 分塊處理大文件
   const chunkSize = 10 * 1024 * 1024; // 10MB
   ```
3. 定期清理臨時文件:
   ```javascript
   // 設置定時任務清理臨時文件
   const cleanupJob = schedule.scheduleJob('0 * * * *', () => {
     cleanupTempFiles();
   });
   ```

### 資料庫查詢慢

**症狀**: API 響應緩慢，特別是在獲取歌曲列表等操作時。

**解決方案**:
1. 添加適當的索引:
   ```sql
   -- 為常用查詢欄位添加索引
   CREATE INDEX idx_songs_name ON songs(name);
   CREATE INDEX idx_songs_meta_language ON songs_meta(language);
   ```
2. 優化查詢:
   ```javascript
   // 使用分頁
   const limit = 20;
   const offset = (page - 1) * limit;
   const query = `SELECT * FROM songs LIMIT ? OFFSET ?`;
   ```
3. 定期維護資料庫:
   ```sql
   -- 分析和優化資料表
   ANALYZE TABLE songs, songs_meta, jobs;
   OPTIMIZE TABLE songs, songs_meta, jobs;
   ```

## 常見錯誤代碼

### 前端錯誤代碼

| 錯誤代碼 | 說明 | 解決方案 |
|---------|------|---------|
| `ERR_AUDIO_INIT` | 音訊初始化失敗 | 檢查瀏覽器音訊支持和權限 |
| `ERR_MIC_ACCESS` | 麥克風訪問被拒絕 | 確認瀏覽器權限設置 |
| `ERR_FILE_SIZE` | 文件大小超過限制 | 使用較小的文件或壓縮文件 |
| `ERR_NETWORK` | 網絡連接錯誤 | 檢查網絡連接和服務器狀態 |
| `ERR_API_TIMEOUT` | API 請求超時 | 檢查服務器負載和網絡連接 |

### 後端錯誤代碼

| 錯誤代碼 | 說明 | 解決方案 |
|---------|------|---------|
| `ERR_DB_CONN` | 資料庫連接失敗 | 檢查資料庫配置和狀態 |
| `ERR_FILE_PROCESS` | 文件處理失敗 | 檢查文件格式和處理腳本 |
| `ERR_AI_MODEL` | AI 模型錯誤 | 檢查模型路徑和依賴 |
| `ERR_DISK_SPACE` | 磁盤空間不足 | 清理臨時文件或增加磁盤空間 |
| `ERR_RATE_LIMIT` | 超過速率限制 | 減少請求頻率或增加限制 |

## 聯繫支援

如果您遇到的問題無法通過本文檔解決，請通過以下方式聯繫支援：

1. 在 GitHub 上提交 Issue: [Pitch Trainer Issues](https://github.com/your-username/pitch-trainer/issues)
2. 發送電子郵件至: support@pitch-trainer.example.com
3. 在社區論壇尋求幫助: [Pitch Trainer Community](https://community.pitch-trainer.example.com)

提交問題時，請包含以下信息：
- 問題的詳細描述
- 重現步驟
- 錯誤訊息和日誌
- 系統環境 (操作系統、瀏覽器版本等)
- 應用版本

## 日誌收集

收集日誌有助於診斷問題：

```bash
# 收集應用日誌
docker-compose logs app > app_logs.txt

# 收集資料庫日誌
docker-compose logs db > db_logs.txt

# 收集前端控制台日誌
# 在瀏覽器中打開開發者工具，選擇 Console 標籤，右鍵選擇 "Save as..."
```

## 定期維護建議

為了預防問題，建議定期執行以下維護任務：

1. 更新依賴:
   ```bash
   npm update
   pip install -U -r requirements.txt
   ```

2. 清理臨時文件:
   ```bash
   node scripts/cleanup.js
   ```

3. 備份資料庫:
   ```bash
   mysqldump -u root -p pitch_trainer > backup_$(date +%Y%m%d).sql
   ```

4. 檢查磁盤空間:
   ```bash
   df -h
   ```

5. 檢查日誌文件大小:
   ```bash
   find ./logs -type f -name "*.log" -size +100M
   ```

定期維護可以預防許多常見問題，並確保系統穩定運行。
