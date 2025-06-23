# Pitch Trainer

## 專案簡介

Pitch Trainer 是一套結合 AI 音準分析、歌唱練習、聲音品質分析與智慧教練回饋的全端應用。前端採用模組化 JavaScript，後端包含 Node.js 與 Python Flask 微服務。

## 🆕 最新更新 (v5.2.0)

- **Docker 支持**: 新增 Docker 和 docker-compose 配置，簡化部署流程
- **代碼質量改進**: 整合 ESLint，提高代碼質量
- **自動化腳本優化**: 改進清理腳本，支持環境變數配置
- **啟動腳本增強**: 更智能的服務啟動流程，自動處理端口衝突
- **文檔更新**: 新增 Docker 部署指南

## 🐳 Docker 快速啟動

如果您已安裝 Docker 和 docker-compose，可以使用以下命令快速啟動整個應用：

```bash
# 克隆專案
git clone <repository-url>
cd pitch-trainer

# 啟動服務
docker-compose up -d

# 查看日誌
docker-compose logs -f
```

訪問 http://localhost:3001 即可使用應用。

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
│   └── songService.js     # 歌曲管理服務
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
├── analysis_service.py    # Python 聲音分析微服務
├── requirements.txt       # Python 依賴
├── .env                   # 環境變數 (需自行建立)
├── config.env.example     # 環境變數範例
├── uploads/               # 上傳檔案暫存
├── temp_processing/       # 處理暫存檔案
└── node_modules/          # 依賴套件
```

---

## 💾 資料庫結構 (Database Schema)

本專案使用 MySQL 資料庫，包含兩個核心資料表：`songs` 和 `jobs`。

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

## 🚀 給初學者的保姆級安裝教學

### 階段〇：安裝必備軟體 (一切的基礎)

在開始之前，請確保您的電腦上已經安裝了以下四個軟體：

1. **Git**: [點此下載](https://git-scm.com/downloads) (用於從 GitHub 下載專案程式碼)。
2. **Node.js**: [點此下載](https://nodejs.org/en/) (建議下載 LTS 版本，用於執行前端和後端主服務)。
3. **Miniconda**: [點此下載](https://docs.conda.io/en/latest/miniconda.html) (用於建立和管理 `basic-pitch` 需要的獨立 Python 環境)。
4. **MySQL Server**: [官方下載頁面](https://dev.mysql.com/downloads/mysql/) (用於儲存歌曲資料，安裝時請務必記下您設定的 `root` 使用者密碼)。

### 階段一：取得專案程式碼

1. 打開您的命令列工具（Windows 的 CMD/PowerShell 或 macOS/Linux 的 Terminal）。
2. 使用 `cd` 指令切換到您想要存放專案的資料夾，例如 `cd Documents/projects`。
3. 執行以下指令，將專案複製到您的電腦上：
   ```bash
   git clone <repository-url>
   ```
4. 進入專案資料夾：
   ```bash
   cd pitch-trainer
   ```

### 階段二：設定後端 AI 環境 (Conda for Basic Pitch)

這是最關鍵也最容易出錯的步驟，`basic-pitch` 對環境要求嚴格。

1. 在命令列中，建立一個專門給 `basic-pitch` 使用的 conda 環境：
   ```bash
   conda create -n basicpitch-env python=3.9
   ```
2. 啟用這個剛建立好的環境：
   ```bash
   conda activate basicpitch-env
   ```
   *(您會看到命令列提示符前面出現 `(basicpitch-env)` 字樣)*
3. 在此環境中安裝 `basic-pitch`，並**為了避免版本衝突，手動指定 `scikit-learn` 的版本**：
   ```bash
   pip install basic-pitch "scikit-learn<=1.5.1"
   ```
4. 安裝 Spleeter：
   ```bash
   pip install spleeter
   ```
5. 完成後，可以先關閉這個 AI 環境，回到基礎環境：
   ```bash
   conda deactivate
   ```

### 階段三：設定後端分析微服務 (Python Flask)

這個服務用於聲音品質分析，我們為它建立另一個獨立的虛擬環境。

1. 在專案根目錄下，建立一個 Python 虛擬環境：
   ```bash
   python -m venv analysis_venv
   ```
2. 啟用這個虛擬環境：
   * **Windows**: `analysis_venv\Scripts\activate`
   * **macOS/Linux**: `source analysis_venv/bin/activate`
     *(您會看到命令列提示符前面出現 `(analysis_venv)` 字樣)*
3. 安裝所需的 Python 套件：
   ```bash
   pip install -r requirements.txt
   ```
4. 完成後，同樣可以先關閉此環境：
   ```bash
   deactivate
   ```

### 階段四：設定後端主服務 (Node.js)

1. 回到專案的根目錄。
2. 執行以下指令，安裝所有 Node.js 相關的依賴套件：
   ```bash
   npm install
   ```

### 階段五：配置環境變數 (連接所有服務的橋樑)

1. 在專案根目錄中，將範例設定檔複製一份並命名為 `.env`：
   * **Windows**: `copy config.env.example .env`
   * **macOS/Linux**: `cp config.env.example .env`
2. 用您的程式碼編輯器（如 VS Code）打開這個新的 `.env` 檔案，並根據您的本機設定修改以下**重要**項目：
   * `DB_PASSWORD`: 改成您安裝 MySQL 時設定的 `root` 密碼，或您為 `pitchuser` 設定的密碼。
   * `GOOGLE_APPLICATION_CREDENTIALS`: 填入您 Google Cloud API 金鑰 JSON 檔案的**完整路徑**。
   * `SPLEETER_PATH`: 通常在 conda 環境中，可以不用修改。如果出錯，需要找到 `spleeter` 執行檔的絕對路徑。
   * `BASICPITCH_ENV`: 保持 `basicpitch-env` 不變。
   * `FFMPEG_PATH`: 如果 FFmpeg 已加入系統環境變數，保持 `ffmpeg` 即可。否則需要填寫其完整路徑。

### 階段六：設定資料庫 (修正版)

1. 打開您的命令列視窗，登入 MySQL (會提示您輸入密碼)：
   ```bash
   mysql -u root -p
   ```
2. 成功登入 MySQL 後，**完整複製**以下所有的 SQL 指令，然後**一次性地貼到命令列中**並按 Enter 執行。這會建立資料庫、使用者、權限，以及所有需要的資料表。

   ```sql
   -- 建立資料庫
   CREATE DATABASE pitch_trainer CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

   -- 建立使用者並授權 (請將 'Mypa$$word123!' 替換成您在 .env 中設定的密碼)
   CREATE USER 'pitchuser'@'localhost' IDENTIFIED BY 'Mypa$$word123!';
   GRANT ALL PRIVILEGES ON pitch_trainer.* TO 'pitchuser'@'localhost';
   FLUSH PRIVILEGES;

   -- 切換到 pitch_trainer 資料庫
   USE pitch_trainer;

   -- 建立 `songs` 資料表
   CREATE TABLE `songs` (
     `id` int NOT NULL,
     `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
     `mp3_path` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
     `vocal_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
     `accompaniment_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
     `midi_path` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
     `lrc_path` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
     `analysis_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
     `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

   -- 建立 `jobs` 資料表
   CREATE TABLE `jobs` (
     `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
     `status` enum('pending','processing','completed','failed') COLLATE utf8mb4_unicode_ci NOT NULL,
     `message` text COLLATE utf8mb4_unicode_ci,
     `progress` int DEFAULT '0',
     `song_id` int DEFAULT NULL,
     `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
     `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

   -- 設定 `songs` 資料表的主鍵和自動遞增
   ALTER TABLE `songs`
     ADD PRIMARY KEY (`id`),
     MODIFY `id` int NOT NULL AUTO_INCREMENT;

   -- 設定 `jobs` 資料表的主鍵和外鍵
   ALTER TABLE `jobs`
     ADD PRIMARY KEY (`id`),
     ADD KEY `song_id` (`song_id`),
     ADD CONSTRAINT `jobs_ibfk_1` FOREIGN KEY (`song_id`) REFERENCES `songs` (`id`);
     
   -- 退出 MySQL
   EXIT;
   ```

### 階段七：啟動所有服務！

您需要**開啟三個獨立的命令列視窗**來分別啟動三個服務。

* **第一個視窗 (啟動 Node.js 主服務):**
  1. `cd` 到專案根目錄。
  2. 執行 `npm start` 或 `npm run dev`。
  3. 如果一切順利，您會看到類似 `✅ Server running on port 3001` 的訊息。

* **第二個視窗 (啟動 Python 分析微服務):**
  1. `cd` 到專案根目錄。
  2. 啟用虛擬環境：
     * **Windows**: `analysis_venv\Scripts\activate`
     * **macOS/Linux**: `source analysis_venv/bin/activate`
  3. 執行 `python analysis_service.py`。
  4. 您會看到 Flask 服務啟動的訊息，通常運行在 5001 埠。

* **第三個視窗 (備用):**
  這個視窗備用，方便您執行其他指令，例如查看資料庫或日誌。

### 階段八：開始使用

打開您的瀏覽器，訪問 `http://localhost:3001`，您應該能看到 Pitch Trainer 的主畫面了。恭喜您，完成了所有安裝步驟！

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
pip install basic-pitch "scikit-learn<=1.5.1"
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
