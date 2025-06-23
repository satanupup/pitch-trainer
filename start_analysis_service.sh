#!/bin/bash
# 啟動聲音分析微服務
# 用法: ./start_analysis_service.sh

# 設定顏色輸出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# 檢查 Python 環境
if command -v python3 &>/dev/null; then
    PYTHON=python3
elif command -v python &>/dev/null; then
    PYTHON=python
else
    echo -e "${RED}[-] 錯誤: 找不到 Python 執行環境${NC}"
    exit 1
fi

# 檢查虛擬環境
if [ -d "analysis_venv" ]; then
    echo -e "${GREEN}[+] 找到虛擬環境，正在啟用...${NC}"
    if [ -f "analysis_venv/bin/activate" ]; then
        source analysis_venv/bin/activate
    elif [ -f "analysis_venv/Scripts/activate" ]; then
        source analysis_venv/Scripts/activate
    else
        echo -e "${YELLOW}[!] 警告: 無法啟用虛擬環境，將使用系統 Python${NC}"
    fi
else
    echo -e "${YELLOW}[!] 警告: 未找到虛擬環境，將使用系統 Python${NC}"
fi

# 檢查依賴
$PYTHON -c "import flask, parselmouth, numpy" &>/dev/null
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}[+] 安裝依賴...${NC}"
    $PYTHON -m pip install -r requirements.txt
fi

# 檢查端口
PORT=${FLASK_PORT:-5001}
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}[!] 警告: 端口 $PORT 已被占用${NC}"
    echo -e "${YELLOW}[!] 嘗試使用其他端口...${NC}"
    PORT=5002
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; then
        PORT=5003
    fi
    echo -e "${GREEN}[+] 將使用端口 $PORT${NC}"
fi

# 啟動服務
echo -e "${GREEN}[+] 啟動聲音分析微服務在端口 $PORT...${NC}"
export FLASK_PORT=$PORT

if command -v gunicorn &>/dev/null; then
    gunicorn -b 0.0.0.0:$PORT analysis_service:app
else
    export FLASK_APP=analysis_service.py
    $PYTHON -m flask run --host=0.0.0.0 --port=$PORT
fi
