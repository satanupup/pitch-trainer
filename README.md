# Pitch Trainer

## 專案簡介

Pitch Trainer 是一套結合 AI 音準分析、歌唱練習、聲音品質分析與智慧教練回饋的全端應用。前端採用模組化 JavaScript，後端包含 Node.js 與 Python Flask 微服務。

---

## 目錄結構

```
public/
  js/
    main.js
    modules/
      api.js
      audio.js
      audioBuffer.js
      errorHandler.js
      loading.js
      scoring.js
      state.js
      ui.js
      utils.js
      visualizer.js
  style.css
  index.html
server.js
services/
  aiProcessingService.js
analysis_service.py
```

---

## 安裝與啟動

### 1. 安裝 Node.js 依賴
```bash
npm install
```

### 2. 安裝 Python 依賴
```bash
pip install flask praat-parselmouth numpy
```

### 3. 啟動 Node.js 伺服器
```bash
node server.js
```

### 4. 啟動聲音分析微服務
```bash
python analysis_service.py
```

---

## 前端模組化說明
- 入口：`public/js/main.js`（App 類別）
- 狀態管理：`modules/state.js`
- API 通訊：`modules/api.js`
- UI 操作：`modules/ui.js`
- 音訊核心：`modules/audio.js`
- Canvas 視覺化：`modules/visualizer.js`
- 工具函數：`modules/utils.js`
- 錯誤處理：`modules/errorHandler.js`
- 其他：`modules/loading.js`, `modules/audioBuffer.js`, `modules/scoring.js`

---

## API 文件（Node.js）
- `GET /songs`：取得歌曲清單
- `POST /upload`：上傳歌曲檔案
- `GET /status/:jobId`：查詢歌曲處理狀態

## API 文件（Flask 分析微服務）
- `POST /analyze_vocal`：上傳音檔，回傳聲音品質分析（平均基頻、Jitter、Shimmer、HNR）

---

## 開發建議
- 前端請只引用 `js/main.js`，不要再引用 `script.js`
- 新增功能請直接寫在對應模組
- 工具函數請集中於 `utils.js`
- CSS 可依元件拆分（見下方建議）

---

## CSS 拆分建議
- `style.css`：全域樣式、版型
- `toast.css`：彈窗訊息樣式
- `dashboard.css`：音準練習主畫面
- `upload.css`：上傳區塊

---

## 其他
- 請確保 Python/Node.js 虛擬環境正確啟用
- 如需 CI/CD、單元測試、API 文件自動化，請參考專案 issue

## 🎵 功能特色

### 後端功能
- **AI 人聲分離**: 使用 Spleeter 將歌曲分離成人聲和伴奏
- **旋律提取**: 使用 Basic Pitch 從人聲中提取 MIDI 旋律
- **歌詞生成**: 使用 Google Speech API 進行語音識別生成 LRC 歌詞檔
- **檔案處理**: 自動整理和轉換音訊格式
- **效能監控**: 即時監控 API 響應時間
- **速率限制**: 防止濫用上傳功能
- **健康檢查**: 系統狀態監控端點

### 前端功能
- **即時音高偵測**: 使用 Web Audio API 分析麥克風輸入的音高
- **視覺化介面**: Canvas 繪製音符軌道和播放進度
- **歌詞同步**: 即時顯示當前播放的歌詞
- **音調調整**: 可調整歌曲的 Key（-10 到 +10 半音）
- **音準評分**: 即時評分系統，包含平均分數、準確度、連續正確記錄
- **錯誤處理**: 智能重試機制和用戶友好的錯誤提示

## 🚀 快速開始

### 系統需求
- Node.js >= 16.0.0
- MySQL 5.7+
- FFmpeg
- Spleeter
- Basic Pitch
- Google Cloud Speech API 憑證

### 安裝步驟

1. **克隆專案**
   ```bash
   git clone <repository-url>
   cd pitch-trainer
   ```

2. **安裝依賴**
   ```bash
   npm install
   ```

3. **配置環境變數**
   ```bash
   cp config.env.example .env
   # 編輯 .env 檔案，填入你的配置
   ```

4. **設置資料庫**
   ```sql
   CREATE DATABASE pitch_trainer;
   CREATE USER 'pitchuser'@'localhost' IDENTIFIED BY 'your_password';
   GRANT ALL PRIVILEGES ON pitch_trainer.* TO 'pitchuser'@'localhost';
   FLUSH PRIVILEGES;
   ```

5. **啟動應用**
   ```bash
   npm start
   # 或開發模式
   npm run dev
   ```

6. **訪問應用**
   打開瀏覽器訪問 `http://localhost:3001`

## ⚙️ 配置說明

### 環境變數

| 變數名 | 說明 | 預設值 |
|--------|------|--------|
| `PORT` | 伺服器端口 | 3001 |
| `DB_HOST` | 資料庫主機 | localhost |
| `DB_USER` | 資料庫用戶 | pitchuser |
| `DB_PASSWORD` | 資料庫密碼 | Mypa$$word123! |
| `DB_NAME` | 資料庫名稱 | pitch_trainer |
| `SPLEETER_PATH` | Spleeter 路徑 | /home/evalhero/spleeter-py10/bin/spleeter |
| `BASICPITCH_ENV` | Basic Pitch 環境 | basicpitch-env |
| `FFMPEG_PATH` | FFmpeg 路徑 | ffmpeg |
| `MAX_FILE_SIZE` | 最大檔案大小 (bytes) | 104857600 (100MB) |
| `RATE_LIMIT_MAX` | 速率限制次數 | 5 |
| `RATE_LIMIT_WINDOW` | 速率限制時間窗 (ms) | 900000 (15分鐘) |

### AI 工具安裝

#### Spleeter
```bash
pip install spleeter
# 或使用 conda
conda install -c conda-forge spleeter
```

#### Basic Pitch
```bash
conda create -n basicpitch-env python=3.9
conda activate basicpitch-env
pip install basic-pitch
```

#### FFmpeg
```bash
# Ubuntu/Debian
sudo apt install ffmpeg

# macOS
brew install ffmpeg

# Windows
# 下載並安裝 FFmpeg
```

## 📖 API 文檔

### 端點列表

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/` | 首頁 |
| GET | `/health` | 健康檢查 |
| GET | `/songs` | 取得歌曲列表 |
| POST | `/upload` | 上傳歌曲 |
| GET | `/status/:jobId` | 查詢處理狀態 |

### 健康檢查回應
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "5.1.0",
  "database": "connected",
  "directories": "accessible",
  "uptime": 123.456,
  "memory": {
    "rss": 12345678,
    "heapTotal": 9876543,
    "heapUsed": 5432109
  }
}
```

## 🛠️ 開發

### 可用的腳本
- `npm start` - 啟動生產環境
- `npm run dev` - 啟動開發環境 (nodemon)
- `npm run setup` - 安裝依賴並複製環境變數檔案
- `npm run clean` - 清理暫存檔案
- `npm run backup` - 備份資料庫

### 專案結構
```
pitch-trainer/
├── server.js              # 後端主程式
├── package.json           # 專案配置
├── config.env.example     # 環境變數範例
├── README.md              # 專案文檔
├── public/                # 前端檔案
│   ├── index.html         # 主頁面
│   ├── script.js          # 前端邏輯
│   ├── style.css          # 樣式表
│   └── music/             # 音樂檔案
├── uploads/               # 上傳檔案暫存
├── temp_processing/       # 處理暫存檔案
└── node_modules/          # 依賴套件
```

## 🔧 故障排除

### 常見問題

1. **資料庫連接失敗**
   - 檢查 MySQL 服務是否運行
   - 確認資料庫配置是否正確
   - 檢查用戶權限

2. **AI 工具路徑錯誤**
   - 確認 Spleeter 和 Basic Pitch 已正確安裝
   - 檢查環境變數中的路徑配置
   - 確認 conda 環境是否激活

3. **檔案上傳失敗**
   - 檢查檔案格式是否支援 (MP3, WAV, M4A)
   - 確認檔案大小不超過限制
   - 檢查目錄權限

4. **麥克風權限問題**
   - 確認瀏覽器已授權麥克風權限
   - 檢查 HTTPS 環境 (本地開發除外)

### 日誌查看
應用會輸出詳細的日誌信息，包括：
- 效能監控數據
- 錯誤和警告信息
- 處理進度更新

## 📄 授權

本專案採用 ISC 授權條款。

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

## 📞 支援

如有問題，請提交 Issue 或聯繫開發團隊。 