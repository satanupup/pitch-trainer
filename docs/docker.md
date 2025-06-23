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

## Docker 架構說明

Pitch Trainer 採用微服務架構，將不同功能拆分為獨立的容器：

### 1. backend-node 服務

Node.js 後端服務，處理 HTTP 請求、檔案上傳和資料庫操作。

```yaml
backend-node:
  build:
    context: .
    dockerfile: Dockerfile.node
  ports:
    - "3001:3001"
  # ...其他配置
```

### 2. analysis-python 服務

Python Flask 微服務，處理 CPU 密集型的音訊分析任務。

```yaml
analysis-python:
  build:
    context: .
    dockerfile: Dockerfile.python
  ports:
    - "5001:5001"
  # ...其他配置
```

### 3. db 服務

MySQL 資料庫服務，儲存應用數據。

```yaml
db:
  image: mysql:8.0
  # ...其他配置
```

## 微服務架構優勢

採用微服務架構有以下優勢：

1. **獨立擴展**：可以根據負載獨立擴展後端或分析服務
   ```bash
   # 擴展分析服務到 3 個實例
   docker-compose up -d --scale analysis-python=3
   ```

2. **資源隔離**：為 CPU 密集的 Python 服務分配更多資源，而不影響 Node.js
   ```yaml
   analysis-python:
     deploy:
       resources:
         limits:
           cpus: '2'
           memory: 4G
   ```

3. **提高韌性**：一個服務崩潰不會直接影響另一個
   ```yaml
   backend-node:
     restart: unless-stopped
   analysis-python:
     restart: unless-stopped
   ```

## .dockerignore 說明

專案根目錄包含 `.dockerignore` 文件，用於排除不必要的文件，以減小 Docker 構建上下文大小，提高構建速度和安全性。

```
# 版本控制
.git
.gitignore

# 依賴目錄
node_modules
__pycache__

# 環境變數和敏感信息
.env
.env.*

# 文檔和說明文件
README.md
docs/
```

使用 `.dockerignore` 的好處：
1. **加快構建速度**：排除大型文件夾如 `node_modules`
2. **減小映像大小**：避免包含不必要的文件
3. **提高安全性**：防止敏感文件如 `.env` 被包含在映像中

## 容器間通信

服務間通過 Docker 網絡進行通信：

```yaml
networks:
  pitch-network:
    driver: bridge
```

Node.js 後端通過環境變數配置與 Python 微服務通信：

```yaml
environment:
  - ANALYSIS_SERVICE_URL=http://analysis-python:5001
```

## 數據持久化

使用 Docker 卷保存重要數據：

```yaml
volumes:
  mysql_data:  # 資料庫數據
```

以及掛載本地目錄：

```yaml
volumes:
  - ./uploads:/app/uploads  # 上傳文件
  - ./temp_processing:/app/temp_processing  # 臨時處理文件
  - ./public/songs:/app/public/songs  # 處理後的歌曲
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
        proxy_pass http://backend-node:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 安全的 Secrets 管理

在生產環境中，不應將敏感信息如 API 密鑰直接存儲在 `.env` 文件中。建議使用更安全的 secrets 管理方式：

#### 1. Docker Secrets

```bash
# 創建 secret
echo "your_api_key" | docker secret create openai_api_key -

# 在 docker-compose.yml 中使用
services:
  backend-node:
    secrets:
      - openai_api_key
```

#### 2. 使用 HashiCorp Vault

```bash
# 啟動 Vault
docker-compose -f vault.yml up -d

# 存儲 secret
vault kv put secret/pitch-trainer/api openai_key=your_api_key

# 在應用中獲取 secret
# 參考 Vault API 文檔
```

#### 3. 雲服務提供商的 Secrets 管理

- AWS: AWS Secrets Manager
- GCP: Google Secret Manager
- Azure: Azure Key Vault

### 監控與日誌

添加監控和日誌收集：

```yaml
services:
  backend-node:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

考慮添加 Prometheus 和 Grafana 進行監控：

```yaml
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    depends_on:
      - prometheus
```

## 故障排除

### 容器啟動失敗

檢查容器日誌：

```bash
docker-compose logs backend-node
docker-compose logs analysis-python
docker-compose logs db
```

### 服務間通信問題

確保所有服務都在同一網絡中：

```bash
docker network inspect pitch-network
```

### 資源不足

檢查容器資源使用情況：

```bash
docker stats
```

如果資源不足，考慮增加資源限制或減少服務數量。

### 數據庫連接問題

確保資料庫初始化正確：

```bash
docker-compose exec db mysql -u pitchuser -p -e "SHOW DATABASES;"
```

## 更新應用

更新應用到最新版本：

```bash
# 拉取最新代碼
git pull

# 重建並重啟容器
docker-compose down
docker-compose build
docker-compose up -d
```

## 備份與恢復

### 備份資料庫

```bash
docker-compose exec db mysqldump -u root -p pitch_trainer > backup.sql
```

### 恢復資料庫

```bash
cat backup.sql | docker-compose exec -T db mysql -u root -p pitch_trainer
```

## 多環境部署

使用不同的 docker-compose 文件進行多環境部署：

```bash
# 開發環境
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# 生產環境
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

