# Pitch Trainer

## 專案簡介

Pitch Trainer 是一套結合 AI 音準分析、歌唱練習、聲音品質分析與智慧教練回饋的全端應用。前端採用模組化 JavaScript，後端包含 Node.js 與 Python Flask 微服務。

![示意圖](./public/assets/ui-preview.png)

## 📚 導覽快速入口

- [快速啟動（Docker）](#-docker-快速啟動)
- [功能特色](#-功能特色)
- [資料庫結構](#-資料庫結構-database-schema)
- [API 文件](#-api-文檔)
- [安裝教學（逐步）](#-給初學者的保姆級安裝教學)
- [配置說明](#️-配置說明)
- [故障排除](#-故障排除)
- [技術棧](#-技術棧與依賴)

## 🆕 最新更新 (v5.2.0)

- **Docker 支持**: 新增 Docker 和 docker-compose 配置，簡化部署流程
- **代碼質量改進**: 整合 ESLint，提高代碼質量
- **自動化腳本優化**: 改進清理腳本，支持環境變數配置
- **啟動腳本增強**: 更智能的服務啟動流程，自動處理端口衝突
- **文檔更新**: 新增 Docker 部署指南與模組化文檔

## 🐳 Docker 快速啟動

如果您已安裝 Docker 和 docker-compose，可以使用以下命令快速啟動整個應用：

```bash
# 克隆專案
git clone <repository-url>
cd pitch-trainer

# 複製環境變數範例並修改
cp .env.example .env

# 啟動服務
docker-compose up -d

# 查看日誌
docker-compose logs -f
```

訪問 http://localhost:3001 即可使用應用。

更多詳細說明請參考 [Docker 部署指南](./docs/docker.md)。

---

## 目錄結構

```
pitch-trainer/
├── server.js              # 後端主程式
├── package.json           # 專案配置
├── config/                # 配置文件
│   ├── config.js          # 主要配置
│   ├── dbPool.js          # 資料庫連接池
│   ├── init.js            # 初始化配置
│   └── index.js           # 配置導出
├── services/              # 服務模組
│   ├── audioService.js    # 音訊處理服務
│   ├── fileService.js     # 檔案處理服務
│   ├── songService.js     # 歌曲管理服務
│   └── whisperService.js  # Whisper 歌詞服務
├── middleware/            # 中間件
│   └── performanceMonitor.js # 效能監控
├── public/                # 前端檔案
│   ├── index.html         # 主頁面
│   ├── style.css          # 樣式表
│   ├── js/                # JavaScript 文件
│   │   ├── main.js        # 主程式入口
│   │   └── modules/       # 模組化組件
│   │       ├── api.js     # API 通訊
│   │       ├── audio.js   # 音訊處理
│   │       └── ...        # 其他模組
│   └── songs/             # 處理後的歌曲
├── docs/                  # 文檔模組
│   ├── install.md         # 安裝指南
│   ├── api.md             # API 文檔
│   ├── db-schema.md       # 資料庫結構
│   ├── features.md        # 功能說明
│   ├── docker.md          # Docker 部署
│   ├── lyrics-optimization.md # 歌詞優化指南
│   └── troubleshooting.md # 故障排除
├── analysis_service.py    # Python 聲音分析微服務
├── requirements.txt       # Python 依賴
├── .env                   # 環境變數 (需自行建立)
├── .env.example           # 環境變數範例
├── .env.schema.json       # 環境變數結構定義
├── uploads/               # 上傳檔案暫存
├── temp_processing/       # 處理暫存檔案
└── node_modules/          # 依賴套件
```

---

## 💾 資料庫結構 (Database Schema)

本專案使用 MySQL 資料庫，包含三個核心資料表：`songs`、`songs_meta` 和 `jobs`。

### 資料表 `songs`
儲存所有已成功處理完成的歌曲資源路徑。

| 欄位名稱           | 資料類型      | 說明                               |
| ------------------ | ------------- | ---------------------------------- |
| `id`               | INT (PK, AI)  | 歌曲的唯一識別碼 (主鍵, 自動遞增)    |
| `name`             | VARCHAR(255)  | 歌曲名稱 (通常由檔名淨化而來)      |
| `mp3_path`         | VARCHAR(255)  | 原始完整歌曲的 MP3 檔案路徑        |
| `vocal_path`       | VARCHAR(255)  | 分離後的人聲 MP3 檔案路徑          |
| `accompaniment_path` | VARCHAR(255)  | 分離後的伴奏 MP3 檔案路徑          |
| `midi_path`        | VARCHAR(255)  | 從人聲提取的旋律 MIDI 檔案路徑     |
| `lrc_path`         | VARCHAR(255)  | 生成的 LRC 歌詞檔案路徑            |
| `analysis_path`    | VARCHAR(255)  | 聲音品質分析結果的 JSON 檔案路徑   |
| `created_at`       | TIMESTAMP     | 紀錄建立時間                       |

### 資料表 `songs_meta`
儲存歌曲的元數據，用於進階功能和搜索。

| 欄位名稱     | 資料類型      | 說明                         |
| ------------ | ------------- | ---------------------------- |
| `song_id`    | INT (PK, FK)  | 對應到 `songs` 表的 ID (主鍵) |
| `artist`     | VARCHAR(255)  | 歌手名稱                     |
| `language`   | VARCHAR(50)   | 歌曲語言                     |
| `bpm`        | INT           | 每分鐘節拍數                 |
| `key`        | VARCHAR(10)   | 歌曲調性                     |
| `genre`      | VARCHAR(100)  | 歌曲類型                     |

### 資料表 `jobs`
用於追蹤每一個上傳檔案的處理進度與狀態，是實現非同步處理的核心。

| 欄位名稱     | 資料類型                                       | 說明                                       |
| ------------ | ---------------------------------------------- | ------------------------------------------ |
| `id`         | VARCHAR(255) (PK)                              | 任務的唯一識別碼 (主鍵, 例如 'job_xxxxxxxx') |
| `status`     | ENUM('pending','processing','completed','failed') | 任務目前的狀態                             |
| `message`    | TEXT                                           | 顯示給使用者的狀態訊息或詳細的錯誤日誌     |
| `progress`   | INT                                            | 處理進度百分比 (0-100)                     |
| `song_id`    | INT (FK)                                       | 任務成功後，對應到 `songs` 資料表的 ID       |
| `created_at` | TIMESTAMP                                      | 任務建立時間                               |
| `updated_at` | TIMESTAMP                                      | 任務狀態最後更新時間                       |

更多詳細說明請參考 [資料庫結構文檔](./docs/db-schema.md)。

---

## 安裝與啟動

### 1. 安裝 Node.js 依賴
```bash
npm install
```

### 2. 安裝 Python 依賴
```bash
pip install -r requirements.txt
```

### 3. 啟動 Node.js 伺服器
```bash
node server.js
```

### 4. 啟動聲音分析微服務
```bash
python analysis_service.py
```

完整的安裝指南請參考 [安裝文檔](./docs/install.md)。

---

## 架構說明

本專案採用模組化架構，將功能分散到不同的服務和模組中：

### 後端架構
- **主服務 (Node.js)**: 處理 HTTP 請求、檔案上傳和資料庫操作
- **分析微服務 (Python Flask)**: 處理音訊分析、音高檢測等 CPU 密集型任務
- **非同步任務處理**: 使用任務佇列模式處理長時間運行的任務

### 前端架構
- **模組化 JavaScript**: 使用 ES6 模組系統，無框架依賴
- **Web Audio API**: 處理實時音訊分析和音高檢測
- **Canvas 視覺化**: 繪製音符軌道和評分界面

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

## 📖 API 文檔

### 端點列表

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/` | 首頁 |
| GET | `/health` | 健康檢查 |
| GET | `/songs` | 取得歌曲列表 |
| POST | `/upload` | 上傳歌曲 |
| GET | `/status/:jobId` | 查詢處理狀態 |

完整的 API 文檔請參考 [API 文檔](./docs/api.md)。

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

## 🎵 功能特色

### 後端功能
- **AI 人聲分離**: 使用 Spleeter 將歌曲分離成人聲和伴奏
- **旋律提取**: 使用 Basic Pitch 從人聲中提取 MIDI 旋律
- **歌詞生成**: 使用 Whisper 或 Google Speech API 進行語音識別生成 LRC 歌詞檔
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

更多功能說明請參考 [功能特色文檔](./docs/features.md)。

## 🚀 給初學者的保姆級安裝教學

### 階段〇：安裝必備軟體 (一切的基礎)

在開始之前，請確保您的電腦上已經安裝了以下四個軟體：

1. **Git**: [點此下載](https://git-scm.com/downloads) (用於從 GitHub 下載專案程式碼)。
2. **Node.js**: [點此下載](https://nodejs.org/en/) (建議下載 LTS 版本，用於執行前端和後端主服務)。
3. **Miniconda**: [點此下載](https://docs.conda.io/en/latest/miniconda.html) (用於建立和管理 `basic-pitch` 需要的獨立 Python 環境)。
4. **MySQL Server**: [官方下載頁面](https://dev.mysql.com/downloads/mysql/) (用於儲存歌曲資料，安裝時請務必記下您設定的 `root` 使用者密碼)。

完整的安裝教學請參考 [安裝指南](./docs/install.md)。

## ⚙️ 配置說明

### 環境變數

| 變數名 | 說明 | 預設值 |
|--------|------|--------|
| `PORT` | 伺服器端口 | 3001 |
| `DB_HOST` | 資料庫主機 | localhost |
| `DB_USER` | 資料庫用戶 | pitchuser |
| `DB_PASSWORD` | 資料庫密碼 | (請在 .env 中設置) |
| `DB_NAME` | 資料庫名稱 | pitch_trainer |
| `SPLEETER_PATH` | Spleeter 路徑 | /home/evalhero/spleeter-py10/bin/spleeter |
| `BASICPITCH_ENV` | Basic Pitch 環境 | basicpitch-env |
| `FFMPEG_PATH` | FFmpeg 路徑 | ffmpeg |
| `MAX_FILE_SIZE` | 最大檔案大小 (bytes) | 104857600 (100MB) |
| `RATE_LIMIT_MAX` | 速率限制次數 | 5 |
| `RATE_LIMIT_WINDOW` | 速率限制時間窗 (ms) | 900000 (15分鐘) |

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

更多故障排除指南請參考 [故障排除文檔](./docs/troubleshooting.md)。

## 🔒 安全配置

為了提高安全性，請在部署前執行以下步驟：

1. 複製 `.env.example` 到 `.env`：
   ```bash
   cp .env.example .env
   ```

2. 在 `.env` 文件中設置安全的資料庫密碼：
   ```
   DB_ROOT_PASSWORD=your_secure_root_password
   DB_PASSWORD=your_secure_user_password
   ```

3. 使用環境變數啟動 Docker：
   ```bash
   docker-compose up -d
   ```

這樣可以避免在代碼中硬編碼敏感信息。

## 📄 授權

本專案採用 ISC 授權條款。

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

## 📞 支援

如有問題，請提交 Issue 或聯繫開發團隊。

## 🧠 技術棧與依賴

- **語音處理**：Spleeter、Basic Pitch、Whisper、Google Speech API
- **前端框架**：純 JavaScript + Web Audio API + Canvas
- **後端框架**：Node.js (Express) + Python Flask
- **資料庫**：MySQL
- **部署**：Docker / docker-compose
- **AI 模型**：Whisper、Gemini、Google Speech-to-Text
- **音訊處理**：FFmpeg、Praat-Parselmouth
