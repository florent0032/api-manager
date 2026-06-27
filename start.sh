#!/bin/bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

# 加载 .env 配置
if [ -f "$PROJECT_DIR/.env" ]; then
    # 导出 .env 中的变量，忽略注释和空行
    set -a
    source <(grep -v '^#' "$PROJECT_DIR/.env" | grep -v '^$')
    set +a
fi

BACKEND_PORT=${BACKEND_PORT:-8080}
FRONTEND_PORT=${FRONTEND_PORT:-3030}

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

cleanup() {
    echo -e "\n${YELLOW}正在停止服务...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    wait $BACKEND_PID $FRONTEND_PID 2>/dev/null
    echo -e "${GREEN}已停止${NC}"
    exit 0
}
trap cleanup SIGINT SIGTERM

# Kill existing processes on ports
kill_port() {
    local port=$1
    local pid=$(lsof -t -i:$port 2>/dev/null)
    if [ -n "$pid" ]; then
        echo -e "${YELLOW}端口 $port 被占用 (PID: $pid)，正在释放...${NC}"
        kill $pid 2>/dev/null
        sleep 1
    fi
}

kill_port $BACKEND_PORT
kill_port $FRONTEND_PORT

# ---- Backend ----
echo -e "${GREEN}[1/3] 启动后端...${NC}"
cd "$BACKEND_DIR"

if [ ! -d "venv" ]; then
    echo -e "${YELLOW}  创建虚拟环境...${NC}"
    python3 -m venv venv
    source venv/bin/activate
    pip install fastapi uvicorn sqlalchemy httpx python-dateutil pydantic -q
else
    source venv/bin/activate
fi

python main.py &
BACKEND_PID=$!

# Wait for backend to be ready
echo -ne "  等待后端启动"
for i in $(seq 1 20); do
    if curl -s --noproxy localhost http://localhost:$BACKEND_PORT/api/suppliers > /dev/null 2>&1; then
        echo -e " ${GREEN}✓${NC}"
        break
    fi
    echo -n "."
    sleep 0.5
    if [ $i -eq 20 ]; then
        echo -e " ${RED}✗ 后端启动失败${NC}"
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi
done

# Seed data if empty
SUPPLIER_COUNT=$(curl -s --noproxy localhost http://localhost:$BACKEND_PORT/api/suppliers | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
if [ "$SUPPLIER_COUNT" = "0" ]; then
    echo -e "${GREEN}[2/3] 初始化数据...${NC}"
    curl -s --noproxy localhost -X POST http://localhost:$BACKEND_PORT/api/seed > /dev/null
    echo -e "  ${GREEN}✓ 已导入预置数据${NC}"
else
    echo -e "${GREEN}[2/3] 数据库已有数据，跳过初始化${NC}"
fi

# ---- Frontend ----
echo -e "${GREEN}[3/3] 启动前端...${NC}"
cd "$FRONTEND_DIR"

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}  安装依赖...${NC}"
    npm install -q
fi

PORT=$FRONTEND_PORT npx next dev -p $FRONTEND_PORT &
FRONTEND_PID=$!

# Wait for frontend to be ready
echo -ne "  等待前端启动"
for i in $(seq 1 30); do
    if curl -s --noproxy localhost http://localhost:$FRONTEND_PORT > /dev/null 2>&1; then
        echo -e " ${GREEN}✓${NC}"
        break
    fi
    echo -n "."
    sleep 0.5
    if [ $i -eq 30 ]; then
        echo -e " ${RED}✗ 前端启动超时，但可能仍在加载${NC}"
    fi
done

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  API Manager 已启动${NC}"
echo -e "${GREEN}  后端: http://localhost:$BACKEND_PORT${NC}"
echo -e "${GREEN}  前端: http://localhost:$FRONTEND_PORT${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${YELLOW}  按 Ctrl+C 停止所有服务${NC}"
echo ""

wait
