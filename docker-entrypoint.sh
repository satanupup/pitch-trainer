#!/bin/bash
set -e

# 啟動分析微服務
echo "[+] 啟動聲音分析微服務..."
. /app/analysis_venv/bin/activate
nohup python3 analysis_service.py &

# 等待微服務啟動
echo "[+] 等待微服務啟動..."
sleep 3

# 啟動主服務
echo "[+] 啟動主服務..."
exec node server.js