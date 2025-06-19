#!/bin/bash
# 啟動聲音分析微服務
# 用法: ./start_analysis_service.sh

# 檢查 Python 環境
if command -v python3 &>/dev/null; then
    PYTHON=python3
elif command -v python &>/dev/null; then
    PYTHON=python
else
    echo "[-] 錯誤: 找不到 Python 執行環境"
    exit 1
fi

# 檢查依賴
$PYTHON -c "import flask, parselmouth, numpy" &>/dev/null
if [ $? -ne 0 ]; then
    echo "[+] 安裝依賴..."
    $PYTHON -m pip install -r requirements.txt
fi

# 啟動服務
echo "[+] 啟動聲音分析微服務..."
if command -v gunicorn &>/dev/null; then
    gunicorn -b 0.0.0.0:5001 analysis_service:app
else
    $PYTHON analysis_service.py
fi