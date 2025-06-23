# 基礎映像
FROM node:18-slim

# 安裝 Python 和其他依賴
RUN apt-get update && apt-get install -y \
    python3 python3-pip python3-venv \
    ffmpeg \
    mysql-client \
    && rm -rf /var/lib/apt/lists/*

# 設定工作目錄
WORKDIR /app

# 複製 package.json 和 package-lock.json
COPY package*.json ./

# 安裝 Node.js 依賴
RUN npm install

# 複製 Python 依賴
COPY requirements.txt ./

# 安裝 Python 依賴
RUN python3 -m venv analysis_venv && \
    . analysis_venv/bin/activate && \
    pip install --no-cache-dir -r requirements.txt

# 複製專案文件
COPY . .

# 創建必要的目錄
RUN mkdir -p uploads temp_processing public/songs

# 暴露端口
EXPOSE 3001 5001

# 啟動腳本
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# 啟動應用
ENTRYPOINT ["docker-entrypoint.sh"]