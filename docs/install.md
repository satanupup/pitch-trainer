# Pitch Trainer 安裝指南

本文檔提供 Pitch Trainer 應用程式的詳細安裝步驟，包括環境準備、依賴安裝和配置說明。

## 目錄

- [系統需求](#系統需求)
- [安裝方式概覽](#安裝方式概覽)
- [Docker 安裝 (推薦)](#docker-安裝-推薦)
- [手動安裝](#手動安裝)
  - [步驟 1: 安裝基礎軟體](#步驟-1-安裝基礎軟體)
  - [步驟 2: 克隆專案](#步驟-2-克隆專案)
  - [步驟 3: 安裝 Node.js 依賴](#步驟-3-安裝-nodejs-依賴)
  - [步驟 4: 設置 Python 環境](#步驟-4-設置-python-環境)
  - [步驟 5: 安裝 AI 模型](#步驟-5-安裝-ai-模型)
  - [步驟 6: 設置資料庫](#步驟-6-設置資料庫)
  - [步驟 7: 配置環境變數](#步驟-7-配置環境變數)
  - [步驟 8: 啟動應用](#步驟-8-啟動應用)
- [特定平台安裝說明](#特定平台安裝說明)
  - [Windows](#windows)
  - [macOS](#macos)
  - [Linux](#linux)
- [升級指南](#升級指南)
- [常見問題](#常見問題)

## 系統需求

### 最低配置
- **CPU**: 雙核心處理器，2.0GHz 或更高
- **記憶體**: 4GB RAM
- **儲存空間**: 10GB 可用空間
- **作業系統**: Windows 10/11, macOS 10.15+, Ubuntu 20.04+
- **網絡**: 寬頻網絡連接

### 推薦配置
- **CPU**: 四核心處理器，3.0GHz 或更高
- **記憶體**: 8GB RAM 或更高
- **儲存空間**: 20GB 可用空間 (SSD 推薦)
- **GPU**: 支援 CUDA 的 NVIDIA GPU (用於加速 AI 處理)
- **作業系統**: Windows 11, macOS 12+, Ubuntu 22.04+
- **網絡**: 高速寬頻網絡連接

## 安裝方式概覽

Pitch Trainer 提供兩種安裝方式：

1. **Docker 安裝** (推薦): 使用 Docker 和 docker-compose 快速部署所有服務，適合所有用戶。
2. **手動安裝**: 逐步安裝所有依賴和服務，適合希望自定義配置的進階用戶。

## Docker 安裝 (推薦)

使用 Docker 是最簡單的安裝方式，只需幾個命令即可完成所有設置。

### 前置需求

- [Docker](https://docs.docker.com/get-docker/) (20.10.0+)
- [Docker Compose](https://docs.docker.com/compose/install/) (2.0.0+)

### 安裝步驟

1. **克隆專案**:
   ```bash
   git clone https://github.com/your-username/pitch-trainer.git
   cd pitch-trainer
   ```

2. **配置環境變數**:
   ```bash
   cp .env.example .env
   # 編輯 .env 文件設置必要的環境變數
   nano .env  # 或使用您喜歡的文字編輯器
   ```

3. **啟動服務**:
   ```bash
   docker-compose up -d
   ```

4. **訪問應用**:
   打開瀏覽器訪問 http://localhost:3001

### 驗證安裝

確認所有容器都在運行:
```bash
docker-compose ps
```

查看應用日誌:
```bash
docker-compose logs -f
```

更多 Docker 相關說明請參考 [Docker 部署指南](./docker.md)。

## 手動安裝

如果您希望更靈活地配置應用，或者無法使用 Docker，可以按照以下步驟手動安裝。

### 步驟 1: 安裝基礎軟體

#### 安裝 Git
- **Windows**: 從 [Git 官網](https://git-scm.com/download/win) 下載並安裝
- **macOS**: 
  ```bash
  brew install git
  ```
- **Linux**: 
  ```bash
  sudo apt update
  sudo apt install git
  ```

#### 安裝 Node.js
- **Windows/macOS**: 從 [Node.js 官網](https://nodejs.org/) 下載並安裝 LTS 版本
- **Linux**: 
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
  sudo apt install -y nodejs
  ```

#### 安裝 Miniconda
- **Windows**: 從 [Miniconda 官網](https://docs.conda.io/en/latest/miniconda.html) 下載並安裝
- **macOS**: 
  ```bash
  brew install --cask miniconda
  ```
- **Linux**: 
  ```bash
  wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh
  bash Miniconda3-latest-Linux-x86_64.sh
  ```

#### 安裝 MySQL
- **Windows**: 從 [MySQL 官網](https://dev.mysql.com/downloads/installer/) 下載並安裝
- **macOS**: 
  ```bash
  brew install mysql
  brew services start mysql
  ```
- **Linux**: 
  ```bash
  sudo apt update
  sudo apt install mysql-server
  sudo systemctl start mysql
  sudo systemctl enable mysql
  ```

### 步驟 2: 克隆專案

```bash
git clone https://github.com/your-username/pitch-trainer.git
cd pitch-trainer
```

### 步驟 3: 安裝 Node.js 依賴

```bash
npm install
```

### 步驟 4: 設置 Python 環境

#### 創建 Conda 環境

```bash
# 創建基本環境
conda create -n pitch-env python=3.8
conda activate pitch-env

# 安裝 Python 依賴
pip install -r requirements.txt
```

#### 創建 Basic Pitch 專用環境

```bash
# 創建 Basic Pitch 環境
conda create -n basicpitch-env python=3.8
conda activate basicpitch-env

# 安裝 Basic Pitch
pip install basic-pitch
```

### 步驟 5: 安裝 AI 模型

#### 安裝 Spleeter

```bash
# 確保在 pitch-env 環境中
conda activate pitch-env
pip install spleeter

# 預下載模型
spleeter separate -p spleeter:2stems -o ./temp_processing dummy.mp3
```

#### 下載 Whisper 模型

```bash
# 創建模型目錄
mkdir -p models/whisper

# 下載 base 模型 (約 140MB)
wget https://openaipublic.azureedge.net/main/whisper/models/ed3a0b6b1c0edf879ad9b11b1af5a0e6ab5db9205f891f668f8b0e6c6326e34e/base.pt -O models/whisper/base.pt
```

### 步驟 6: 設置資料庫

#### 創建資料庫和用戶

```bash
# 登入 MySQL
mysql -u root -p

# 在 MySQL 命令行中執行
CREATE DATABASE pitch_trainer;
CREATE USER 'pitchuser'@'%' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON pitch_trainer.* TO 'pitchuser'@'%';
FLUSH PRIVILEGES;
EXIT;
```

#### 初始化資料庫結構

```bash
# 使用初始化腳本
mysql -u pitchuser -p pitch_trainer < init-db/schema.sql
```

### 步驟 7: 配置環境變數

```bash
# 複製環境變數範例
cp .env.example .env

# 編輯環境變數
nano .env  # 或使用您喜歡的文字編輯器
```

必須配置的環境變數:

```
# 資料庫配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=pitchuser
DB_PASSWORD=your_secure_password
DB_NAME=pitch_trainer

# 應用配置
PORT=3001
NODE_ENV=production

# AI 模型路徑
WHISPER_MODEL_PATH=models/whisper/base.pt
SPLEETER_PATH=/path/to/conda/envs/pitch-env/bin/spleeter
BASIC_PITCH_PATH=/path/to/conda/envs/basicpitch-env/bin/basic-pitch

# API 金鑰 (如果使用)
OPENAI_API_KEY=your_openai_api_key
GOOGLE_API_KEY=your_google_api_key
```

### 步驟 8: 啟動應用

#### 啟動 Node.js 伺服器

```bash
# 開發模式
npm run dev

# 或生產模式
npm start
```

#### 啟動 Python 分析微服務

```bash
# 確保在 pitch-env 環境中
conda activate pitch-env

# 啟動微服務
python analysis_service.py
```

#### 訪問應用

打開瀏覽器訪問 http://localhost:3001

## 特定平台安裝說明

### Windows

#### 安裝 FFmpeg

1. 從 [FFmpeg 官網](https://www.gyan.dev/ffmpeg/builds/) 下載 FFmpeg
2. 解壓縮到 `C:\ffmpeg`
3. 添加到系統環境變數:
   - 右鍵點擊「此電腦」→ 屬性 → 進階系統設置 → 環境變數
   - 在「系統變數」中找到 Path，點擊編輯
   - 添加 `C:\ffmpeg\bin`
   - 點擊確定保存

#### 使用 Windows 服務

如果希望將應用設置為 Windows 服務，可以使用 `node-windows`:

```bash
# 安裝 node-windows
npm install -g node-windows
npm link node-windows

# 創建服務
node scripts/windows-service.js
```

### macOS

#### 使用 Homebrew 安裝依賴

```bash
# 安裝 Homebrew (如果尚未安裝)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安裝依賴
brew install ffmpeg
brew install portaudio
```

#### 使用 launchd 設置自動啟動

創建 `~/Library/LaunchAgents/com.pitch-trainer.plist` 文件:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.pitch-trainer</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/path/to/pitch-trainer/server.js</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>WorkingDirectory</key>
    <string>/path/to/pitch-trainer</string>
    <key>StandardErrorPath</key>
    <string>/path/to/pitch-trainer/logs/error.log</string>
    <key>StandardOutPath</key>
    <string>/path/to/pitch-trainer/logs/output.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    </dict>
</dict>
</plist>
```

加載服務:
```bash
launchctl load ~/Library/LaunchAgents/com.pitch-trainer.plist
```

### Linux

#### 使用 systemd 設置自動啟動

創建 `/etc/systemd/system/pitch-trainer.service` 文件:

```
[Unit]
Description=Pitch Trainer Server
After=network.target mysql.service

[Service]
Type=simple
User=your_username
WorkingDirectory=/path/to/pitch-trainer
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=pitch-trainer
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

啟用並啟動服務:
```bash
sudo systemctl enable pitch-trainer
sudo systemctl start pitch-trainer
```

創建 Python 微服務的 systemd 服務:
```
[Unit]
Description=Pitch Trainer Analysis Service
After=network.target

[Service]
Type=simple
User=your_username
WorkingDirectory=/path/to/pitch-trainer
ExecStart=/path/to/conda/envs/pitch-env/bin/python analysis_service.py
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=pitch-analysis

[Install]
WantedBy=multi-user.target
```

啟用並啟動服務:
```bash
sudo systemctl enable pitch-analysis
sudo systemctl start pitch-analysis
```

## 升級指南

### 從舊版本升級

1. **備份資料**:
   ```bash
   # 備份資料庫
   mysqldump -u pitchuser -p pitch_trainer > backup_$(date +%Y%m%d).sql
   
   # 備份環境變數
   cp .env .env.backup
   ```

2. **更新代碼**:
   ```bash
   # 拉取最新代碼
   git pull origin main
   
   # 安裝新依賴
   npm install
   
   # 更新 Python 依賴
   conda activate pitch-env
   pip install -r requirements.txt
   ```

3. **更新資料庫結構** (如果需要):
   ```bash
   # 執行遷移腳本
   mysql -u pitchuser -p pitch_trainer < migrations/latest.sql
   ```

4. **更新環境變數** (如果有新增):
   ```bash
   # 比較新舊環境變數範例
   diff .env.example .env
   
   # 更新環境變數
   nano .env
   ```

5. **重啟服務**:
   ```bash
   # 如果使用 Docker
   docker-compose down
   docker-compose up -d
   
   # 如果手動安裝
   # 重啟 Node.js 服務
   npm restart
   
   # 重啟 Python 微服務
   # 先停止舊進程，然後重新啟動
   ```

## 常見問題

### 安裝過程中的常見問題

#### 1. Node.js 依賴安裝失敗

**問題**: 執行 `npm install` 時出現錯誤。

**解決方案**:
- 確認 Node.js 版本是否兼容 (需要 v14.0.0 或更高)
- 嘗試清除 npm 緩存:
  ```bash
  npm cache clean --force
  npm install
  ```
- 如果有特定套件失敗，嘗試單獨安裝:
  ```bash
  npm install <問題套件>
  ```

#### 2. Python 依賴安裝失敗

**問題**: 安裝 Python 依賴時出現錯誤。

**解決方案**:
- 確認 Python 版本 (需要 3.8 或更高)
- 安裝編譯工具:
  ```bash
  # Windows
  npm install --global windows-build-tools
  
  # macOS
  xcode-select --install
  
  # Linux
  sudo apt install build-essential python3-dev
  ```
- 逐個安裝問題依賴:
  ```bash
  pip install <問題套件>
  ```

#### 3. 資料庫連接失敗

**問題**: 應用無法連接到 MySQL 資料庫。

**解決方案**:
- 確認 MySQL 服務是否運行
- 檢查資料庫用戶名和密碼是否正確
- 確認資料庫主機和端口設置
- 檢查防火牆設置是否允許連接

#### 4. 找不到 AI 模型

**問題**: 應用無法找到 Whisper 或 Spleeter 模型。

**解決方案**:
- 確認模型路徑在 `.env` 文件中設置正確
- 手動下載模型文件
- 檢查文件權限是否正確

### 更多問題解決

如果您遇到其他問題，請參考 [故障排除指南](./troubleshooting.md) 或在 GitHub 上提交 Issue。

## 結論

恭喜！您已成功安裝 Pitch Trainer 應用。如果您在使用過程中遇到任何問題，請參考我們的 [故障排除指南](./troubleshooting.md) 或聯繫支援團隊。

祝您使用愉快！
