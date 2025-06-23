# 配置說明

本文檔詳細說明 Pitch Trainer 應用程式的配置選項，包括環境變數、配置文件和運行時參數。

## 環境變數

Pitch Trainer 使用 `.env` 文件來配置環境變數。您可以複製 `.env.example` 文件並根據需要修改：

```bash
cp .env.example .env
```

### 核心配置

| 變數名 | 說明 | 預設值 | 必填 |
|--------|------|--------|------|
| `PORT` | 伺服器端口 | 3001 | 否 |
| `NODE_ENV` | 運行環境 | development | 否 |
| `HOST` | 伺服器主機名 | localhost | 否 |
| `BASE_URL` | 應用基礎 URL | http://localhost:3001 | 否 |

### 資料庫配置

| 變數名 | 說明 | 預設值 | 必填 |
|--------|------|--------|------|
| `DB_HOST` | 資料庫主機 | localhost | 否 |
| `DB_PORT` | 資料庫端口 | 3306 | 否 |
| `DB_USER` | 資料庫用戶 | pitchuser | 否 |
| `DB_PASSWORD` | 資料庫密碼 | - | 是 |
| `DB_NAME` | 資料庫名稱 | pitch_trainer | 否 |
| `DB_CONNECTION_LIMIT` | 連接池大小 | 10 | 否 |
| `DB_ROOT_PASSWORD` | 資料庫 root 密碼 (僅 Docker) | - | 僅 Docker |

### AI 工具路徑

| 變數名 | 說明 | 預設值 | 必填 |
|--------|------|--------|------|
| `SPLEETER_PATH` | Spleeter 執行檔路徑 | spleeter | 否 |
| `BASICPITCH_ENV` | Basic Pitch 環境名稱 | basicpitch-env | 否 |
| `FFMPEG_PATH` | FFmpeg 執行檔路徑 | ffmpeg | 否 |
| `WHISPER_PATH` | Whisper 執行檔路徑 | whisper | 否 |
| `WHISPER_MODEL` | Whisper 模型大小 | medium | 否 |
| `PREFER_WHISPER` | 優先使用 Whisper | true | 否 |

### API 金鑰

| 變數名 | 說明 | 預設值 | 必填 |
|--------|------|--------|------|
| `OPENAI_API_KEY` | OpenAI API 金鑰 | - | 是 |
| `GOOGLE_API_KEY` | Google API 金鑰 | - | 是 |
| `JWT_SECRET
</augment_code_snippet>