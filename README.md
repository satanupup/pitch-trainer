# Pitch Trainer

## 專案簡介

Pitch Trainer 是一套結合 AI 音準分析、歌唱練習、聲音品質分析與智慧教練回饋的全端應用。前端採用模組化 JavaScript，後端包含 Node.js 與 Python Flask 微服務。

![示意圖](./public/assets/ui-preview.png)

## 📚 導覽快速入口

- [快速啟動（Docker）](#-docker-快速啟動)
- [功能特色](#-功能特色)
- [專案結構](#-專案結構)
- [安裝教學](#-安裝與啟動)
- [配置說明](#️-配置說明)
- [故障排除](#-故障排除)
- [技術棧](#-技術棧與依賴)
- [貢獻指南](./CONTRIBUTING.md)

## 🆕 最新更新 (v5.2.0)

- **Docker 支持**: 新增 Docker 和 docker-compose 配置，簡化部署流程
- **代碼質量改進**: 整合 ESLint，提高代碼質量
- **自動化腳本優化**: 改進清理腳本，支持環境變數配置
- **啟動腳本增強**: 更智能的服務啟動流程，自動處理端口衝突
- **文檔更新**: 新增 Docker 部署指南與模組化文檔

完整版本歷史請查看 [更新日誌](./docs/changelog.md)。

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

# 訪問應用
# 打開瀏覽器訪問 http://localhost:3001
```

詳細的 Docker 部署說明請參考 [Docker 部署指南](./docs/docker.md)。

## 📁 專案結構

```
pitch-trainer/
├── server.js              # 後端主程式
├── package.json           # 專案配置
├── config/                # 配置文件
├── services/              # 服務模組
├── middleware/            # 中間件
├── public/                # 前端檔案
├── docs/                  # 文檔模組
├── scripts/               # 腳本工具
├── tools/                 # 輔助工具
├── analysis_service.py    # Python 聲音分析微服務
└── ...
```

## 🚀 安裝與啟動

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

## 🏗️ 架構說明

本專案採用模組化架構，將功能分散到不同的服務和模組中：

```mermaid
graph TD
    Client[瀏覽器客戶端] --> |HTTP/WebSocket| NodeJS[Node.js 主服務]
    NodeJS --> |REST API| Python[Python 分析微服務]
    NodeJS --> |SQL| DB[(MySQL 資料庫)]
    Python --> |AI 處理| Models[AI 模型]
    Models --> |人聲分離| Spleeter[Spleeter]
    Models --> |音高檢測| BasicPitch[Basic Pitch]
    Models --> |語音識別| Whisper[Whisper/Google STT]
    Models --> |聲音品質| Praat[Praat-Parselmouth]
    Models --> |歌詞優化| Gemini[Gemini AI]
    
    subgraph 前端模組
    Client --> AudioModule[音訊處理模組]
    Client --> UIModule[UI 互動模組]
    Client --> VisualizerModule[視覺化模組]
    end
```

### 後端架構
- **主服務 (Node.js)**: 處理 HTTP 請求、檔案上傳和資料庫操作
- **分析微服務 (Python Flask)**: 處理音訊分析、音高檢測等 CPU 密集型任務
- **非同步任務處理**: 使用任務佇列模式處理長時間運行的任務

### 前端架構
- **模組化 JavaScript**: 使用 ES6 模組系統，無框架依賴
- **Web Audio API**: 處理實時音訊分析和音高檢測
- **Canvas 視覺化**: 繪製音符軌道和評分界面

## 📝 前端模組化說明
- 入口：`public/js/main.js`（App 類別）
- 狀態管理：`modules/state.js`
- API 通訊：`modules/api.js`
- UI 操作：`modules/ui.js`
- 音訊核心：`modules/audio.js`
- Canvas 視覺化：`modules/visualizer.js`
- 工具函數：`modules/utils.js`
- 錯誤處理：`modules/errorHandler.js`

## 📖 API 文檔

API 端點的完整說明、請求參數和響應格式，請參考 [API 文檔](./docs/api.md)。

## 📊 資料庫結構

資料庫包含三個主要資料表：`songs`、`songs_meta` 和 `jobs`。完整的資料庫結構、關聯關係和索引說明，請參考 [資料庫結構文檔](./docs/db-schema.md)。

## 💻 開發建議
- 前端請只引用 `js/main.js`，不要再引用 `script.js`
- 新增功能請直接寫在對應模組
- 工具函數請集中於 `utils.js`
- CSS 可依元件拆分（見下方建議）

### CSS 拆分建議
- `style.css`：全域樣式、版型
- `toast.css`：彈窗訊息樣式
- `dashboard.css`：音準練習主畫面
- `upload.css`：上傳區塊

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
| `WHISPER_PATH` | Whisper 執行檔路徑 | whisper |
| `PREFER_WHISPER` | 優先使用 Whisper | true |
| `WHISPER_MODEL` | Whisper 模型大小 | medium |
| `OPENAI_API_KEY` | OpenAI API 金鑰 | (請在 .env 中設置) |
| `GOOGLE_API_KEY` | Google API 金鑰 | (請在 .env 中設置) |
| `MAX_FILE_SIZE` | 最大檔案大小 (bytes) | 104857600 (100MB) |
| `RATE_LIMIT_MAX` | 速率限制次數 | 5 |
| `RATE_LIMIT_WINDOW` | 速率限制時間窗 (ms) | 900000 (15分鐘) |

完整的配置說明請參考 [配置文檔](./docs/configuration.md)。

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

3. **上傳文件失敗**
   - 檢查文件大小是否超過限制
   - 確認文件格式是否支持
   - 檢查磁盤空間是否充足

4. **處理任務卡住**
   - 檢查日誌文件查找錯誤
   - 重啟服務
   - 檢查 Python 依賴是否完整

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

## 📄 授權

本專案採用 ISC 授權條款。

## 🤝 貢獻

我們歡迎各種形式的貢獻，包括功能請求、錯誤報告、代碼貢獻和文檔改進。請查看 [貢獻指南](./CONTRIBUTING.md) 了解如何參與專案開發。

## 📞 支援

如有問題，請提交 [Issue](https://github.com/your-username/pitch-trainer/issues) 或聯繫開發團隊。

## 🧠 技術棧與依賴

### 後端技術

- **Node.js**: 主要後端運行環境
- **Express**: Web 框架
- **MySQL**: 關聯式資料庫
- **Python Flask**: 音訊分析微服務

### 前端技術

- **原生 JavaScript (ES6+)**: 無框架依賴
- **Web Audio API**: 音訊處理與分析
- **Canvas API**: 視覺化繪製

### AI 與音訊處理

- **Spleeter**: 人聲分離
- **Basic Pitch**: 音高檢測與 MIDI 生成
- **Whisper**: 語音識別
- **Google Speech-to-Text**: 備用語音識別
- **Gemini**: 歌詞優化
- **Praat-Parselmouth**: 聲音品質分析

### 開發工具

- **Docker**: 容器化部署
- **ESLint**: 代碼質量檢查
- **Nodemon**: 開發環境自動重啟

### 主要依賴

- **@google-cloud/speech**: Google 語音識別
- **@google-cloud/storage**: Google 雲存儲
- **@google/generative-ai**: Gemini API
- **axios**: HTTP 客戶端
- **multer**: 文件上傳處理
- **mysql2**: MySQL 連接器
- **midi-parser-js**: MIDI 文件解析

## 📊 性能指標

- **上傳處理時間**: 平均 2-5 分鐘 (取決於歌曲長度)
- **最大支持文件**: 100MB
- **並發處理能力**: 單伺服器 5-10 個同時處理任務
- **資料庫性能**: 支持數千首歌曲的管理
- **API 響應時間**: 平均 < 200ms (不含處理任務)

## 🔮 未來計劃

- **多語言支持**: 擴展對更多語言的支持
- **AI 模型優化**: 微調模型提高準確度
- **移動應用**: 開發配套的移動應用
- **用戶管理**: 添加用戶註冊和登錄功能
- **社區功能**: 添加歌曲分享和評論功能
- **實時協作**: 支持多人同時練習
- **離線支持**: 添加 PWA 功能支持離線使用

## 🙏 致謝

感謝以下開源項目和工具：

- [Spleeter](https://github.com/deezer/spleeter)
- [Basic Pitch](https://github.com/spotify/basic-pitch)
- [Whisper](https://github.com/openai/whisper)
- [Node.js](https://nodejs.org/)
- [Express](https://expressjs.com/)
- [MySQL](https://www.mysql.com/)
- [Flask](https://flask.palletsprojects.com/)
- [Docker](https://www.docker.com/)

特別感謝所有貢獻者和測試用戶！
