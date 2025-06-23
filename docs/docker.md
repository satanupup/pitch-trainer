# Docker 部署指南

本文檔提供使用 Docker 和 docker-compose 部署 Pitch Trainer 的詳細說明。

## 前置需求

- [Docker](https://docs.docker.com/get-docker/) (20.10.0+)
- [Docker Compose](https://docs.docker.com/compose/install/) (2.0.0+)
- 至少 4GB 可用記憶體
- 至少 10GB 可用磁碟空間

## 快速部署

### 1. 克隆專案

```bash
git clone <repository-url>
cd pitch-trainer
```

### 2. 配置環境變數

```bash
# 複製環境變數範例
cp .env.example .env

# 編輯環境變數
nano .env  # 或使用您喜歡的文字編輯器
```

重要的環境變數設定：
- `DB_ROOT_PASSWORD`: MySQL root 用戶密碼
- `DB_PASSWORD`: 應用程式資料庫用戶密碼
- `PORT`: 應用程式端口 (預設 3001)
- `OPENAI_API_KEY`: OpenAI API 金鑰 (用於 Whisper API)
- `GOOGLE_API_KEY`: Google API 金鑰 (用於 Gemini 和 STT)

### 3. 啟動服務

```bash
# 構建並啟動所有服務
docker-compose up -d

# 查看日誌
docker-compose logs -f
```

### 4. 訪問應用

打開瀏覽器，訪問 http://localhost:3001 即可使用應用。

## Docker Compose 配置

Pitch Trainer 的 `docker-compose.yml` 文件包含以下主要服務：

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: pitch-trainer
    restart: unless-stopped
    ports:
      - "${PORT:-3001}:3001"
    environment:
      - NODE_ENV=production
      - DB_HOST=db
      - DB_USER=pitchuser
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_NAME=pitch_trainer
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
    volumes:
      - ./uploads:/app/uploads
      - ./temp_processing:/app/temp_processing
      - ./public/songs:/app/public/songs
      - ./models:/app/models
    depends_on:
      - db

  db:
    image: mysql:8.0
    container_name: pitch-trainer-db
    restart: unless-stopped
    environment:
      - MYSQL_ROOT_PASSWORD=${DB_ROOT_PASSWORD}
      - MYSQL_DATABASE=pitch_trainer
      - MYSQL_USER=pitchuser
      - MYSQL_PASSWORD=${DB_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
      - ./init-db:/docker-entrypoint-initdb.d
    ports:
      - "127.0.0.1:3306:3306"

volumes:
  mysql_data:
```

## 容器說明

Pitch Trainer 使用兩個主要容器：

1. **pitch-trainer**: 主應用容器，包含 Node.js 後端和 Python 分析微服務
2. **db**: MySQL 資料庫容器

## AI 模型配置

Pitch Trainer 使用多種 AI 模型進行音訊處理。在 Docker 環境中，您需要確保：

### Whisper 語音識別

1. **本地模型**：
   - 模型文件會自動下載到 `./models/whisper` 目錄
   - 確保此目錄有足夠的磁碟空間 (large 模型約 3GB)

2. **Whisper API**：
   - 在 `.env` 文件中設置 `OPENAI_API_KEY`

### Basic Pitch 音高分析

Basic Pitch 模型會在容器首次啟動時自動安裝。

## 常見操作

### 重新啟動服務

```bash
docker-compose restart
```

### 停止服務

```bash
docker-compose stop
```

### 完全移除服務（包括資料庫卷）

```bash
docker-compose down -v
```

### 查看容器狀態

```bash
docker-compose ps
```

### 進入容器執行命令

```bash
# 進入主應用容器
docker-compose exec pitch-trainer bash

# 進入資料庫容器
docker-compose exec db mysql -u pitchuser -p pitch_trainer
```

### 查看應用日誌

```bash
# 查看所有容器的日誌
docker-compose logs -f

# 只查看應用容器的日誌
docker-compose logs -f app

# 只查看資料庫容器的日誌
docker-compose logs -f db
```

## 資料持久化

Docker 配置使用命名卷 `mysql_data` 來持久化資料庫資料。此外，以下目錄會被掛載到容器中：

- `./uploads`: 上傳的原始檔案
- `./temp_processing`: 處理過程中的臨時檔案
- `./public/songs`: 處理完成的歌曲檔案
- `./models`: AI 模型文件

## 資料庫備份與還原

### 備份資料庫

```bash
# 從容器內部備份
docker-compose exec db sh -c 'exec mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" pitch_trainer' > backup_$(date +%Y%m%d_%H%M%S).sql

# 或使用 Docker 卷備份
docker run --rm -v pitch-trainer_mysql_data:/source -v $(pwd)/backups:/backup alpine tar -czvf /backup/mysql_backup_$(date +%Y%m%d_%H%M%S).tar.gz -C /source .
```

### 還原資料庫

```bash
# 從 SQL 文件還原
cat backup.sql | docker-compose exec -T db mysql -u root -p"$MYSQL_ROOT_PASSWORD" pitch_trainer

# 或從卷備份還原
docker-compose down
docker run --rm -v pitch-trainer_mysql_data:/dest -v $(pwd)/backups:/backup alpine sh -c "rm -rf /dest/* && tar -xzvf /backup/mysql_backup_YYYYMMDD_HHMMSS.tar.gz -C /dest"
docker-compose up -d
```

## 故障排除

### 資料庫連接問題

如果應用無法連接到資料庫，請檢查：

1. 確認 MySQL 容器正在運行：
   ```bash
   docker-compose ps
   ```

2. 檢查資料庫日誌：
   ```bash
   docker-compose logs db
   ```

3. 確認環境變數中的資料庫配置正確。

### 端口衝突

如果端口 3001 或 3306 已被佔用，您可以在 `.env` 文件中修改端口映射，或在 `docker-compose.yml` 中直接修改。

### 容器啟動失敗

如果容器無法啟動，請檢查日誌：

```bash
docker-compose logs
```

常見問題包括權限問題、磁碟空間不足或記憶體不足。

### AI 模型相關問題

1. **Whisper 模型下載失敗**：
   - 檢查網絡連接
   - 手動下載模型並放置在 `./models/whisper` 目錄

2. **Basic Pitch 安裝問題**：
   - 進入容器手動安裝：
     ```bash
     docker-compose exec pitch-trainer bash
     conda create -n basicpitch-env python=3.8
     conda activate basicpitch-env
     pip install basic-pitch
     ```

## 生產環境部署建議

### 使用 HTTPS

在生產環境中，建議使用 HTTPS。您可以使用 Nginx 或 Traefik 作為反向代理：

#### Nginx 配置範例

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 資源限制

在生產環境中，建議設置資源限制以防止容器過度使用系統資源：

```yaml
services:
  app:
    # ... 其他配置 ...
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
  
  db:
    # ... 其他配置 ...
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 2G
        reservations:
          memory: 1G
```

### 監控與日誌

對於生產環境，建議設置監控和日誌收集：

1. **Prometheus + Grafana**：監控容器資源使用情況
2. **ELK Stack 或 Loki**：集中收集和分析日誌
3. **Healthcheck**：添加健康檢查以自動重啟故障容器

```yaml
services:
  app:
    # ... 其他配置 ...
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

## 更新應用

要更新到最新版本：

```bash
# 拉取最新代碼
git pull

# 重新構建並啟動容器
docker-compose up -d --build
```

## 多環境部署

您可以使用不同的 docker-compose 文件來支持多環境部署：

```bash
# 開發環境
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# 測試環境
docker-compose -f docker-compose.yml -f docker-compose.test.yml up -d

# 生產環境
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## 容器化開發環境

對於開發人員，您可以使用 Docker 來創建一致的開發環境：

```bash
# 啟動開發環境
docker-compose -f docker-compose.dev.yml up -d

# 在容器中運行開發服務器
docker-compose -f docker-compose.dev.yml exec app npm run dev

# 在容器中運行測試
docker-compose -f docker-compose.dev.yml exec app npm test
```

## 結論

使用 Docker 部署 Pitch Trainer 提供了一種簡單、可重複且可靠的方式來設置和管理應用。通過遵循本指南中的步驟，您可以快速部署應用並確保其在各種環境中的一致性。


