```
 ██╗  ██╗███████╗██╗   ██╗███████╗ ██████╗ ██████╗  ██████╗ ███████╗
 ██║ ██╔╝██╔════╝╚██╗ ██╔╝██╔════╝██╔═══██╗██╔══██╗██╔═══██╗██╔════╝
 █████╔╝ █████╗   ╚████╔╝ █████╗  ██║   ██║██████╔╝██║   ██║█████╗  
 ██╔═██╗ ██╔══╝    ╚██╔╝  ██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝  
 ██║  ██╗███████╗   ██║   ██║     ╚██████╔╝██║  ██║╚██████╔╝██║     
 ╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝     
```

<p align="center">
  <strong>API 密钥管理系统</strong><br>
  供应商管理 · 密钥 CRUD · 健康测试 · 配置模板一键复制
</p>

---

## ✨ 功能

| 模块 | 能力 |
|:-----|:-----|
| **📊 仪表盘** | 供应商概览、密钥统计、健康比例进度条 |
| **🏢 供应商** | 增删改查、多 Base URL、文档/工作台链接、模型列表 |
| **🔑 密钥管理** | 增删改查、实时搜索、状态筛选、排序、重复检查 |
| **🏥 健康测试** | 批量测试、自动识别 Anthropic/OpenAI 协议、细分错误原因 |
| **📋 配置复制** | 点击密钥 → 一键复制 Codex / Claude Code 配置 |

### 健康状态

| 状态 | 含义 | 判断依据 |
|:----:|:-----|:---------|
| 🟢 可用 | 密钥有效，接口正常 | HTTP 200 |
| 🟡 频繁 | 密钥有效，请求被限流 | HTTP 429 `Too many requests` |
| 🔴 不可用 | 密钥无效 / 配额耗尽 / 连接失败 | HTTP 401 / 429 `quota exhausted` / 超时 |

---

## 🚀 快速启动

### 一键启动（推荐）

```bash
# Linux / WSL / macOS
./start.sh

# Windows
start.bat
```

脚本自动完成：创建虚拟环境 → 安装依赖 → 初始化数据库 → 启动前后端

### 手动启动

**后端** (FastAPI · 端口 8080)

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install fastapi uvicorn sqlalchemy httpx python-dateutil pydantic
python main.py
```

**前端** (Next.js · 端口 3030)

```bash
cd frontend
npm install
npm run dev -- -p 3030
```

**初始化预置数据**（可选）

```bash
curl -X POST http://localhost:8080/api/seed
```

---

## 🏗️ 技术栈

```
前端: Next.js 16 + Tailwind CSS 4 + TypeScript
后端: FastAPI + SQLAlchemy + SQLite
端口: 前端 3030 / 后端 8080
```

---

## 📁 项目结构

```
keyforge/
│
├── start.sh                # Linux/macOS/WSL 一键启动
├── start.bat               # Windows 一键启动
├── .gitignore
├── README.md
│
├── backend/                # FastAPI 后端
│   ├── main.py             #   路由 + 健康测试 + 种子数据
│   ├── models.py           #   SQLAlchemy 数据模型
│   ├── schemas.py          #   Pydantic 请求/响应模型
│   ├── database.py         #   数据库连接配置
│   ├── requirements.txt
│   └── api_manager.db      #   SQLite 数据库（自动生成，不入库）
│
└── frontend/               # Next.js 前端
    ├── app/
    │   ├── page.tsx         #   主页面
    │   ├── layout.tsx
    │   ├── globals.css
    │   └── components/
    │       ├── Sidebar.tsx          # 侧边栏导航
    │       ├── Dashboard.tsx        # 仪表盘
    │       ├── SupplierDetail.tsx   # 供应商详情 + 密钥列表
    │       ├── SupplierForm.tsx     # 供应商表单弹窗
    │       ├── KeyForm.tsx          # 密钥表单弹窗
    │       ├── KeyDetailModal.tsx   # 密钥详情 + 配置复制
    │       ├── HealthTestPanel.tsx  # 健康测试面板
    │       └── Toast.tsx            # 提示消息
    └── lib/
        └── api.ts                   # API 客户端 + 类型定义
```

---

## 📡 API 端点

### 供应商

```
GET    /api/suppliers          # 列表
POST   /api/suppliers          # 创建
GET    /api/suppliers/:id      # 详情
PUT    /api/suppliers/:id      # 更新
DELETE /api/suppliers/:id      # 删除
```

### 密钥

```
GET    /api/keys?supplier_id=&status=   # 列表（支持筛选）
POST   /api/keys                        # 创建（含重复检查）
GET    /api/keys/:id                    # 详情
PUT    /api/keys/:id                    # 更新
DELETE /api/keys/:id                    # 删除
```

### 其他

```
POST   /api/health-test        # 批量健康测试
POST   /api/seed               # 初始化预置数据
```

---

## 💾 数据存储

所有数据存储在 `backend/api_manager.db` (SQLite)：

| 表 | 字段 |
|:---|:-----|
| **suppliers** | name, description, base_urls, docs_url, workbench_url, templates, models |
| **api_keys** | api_key, base_url, expire_at, remaining, status, latency, test_error, notes |

> ⚠️ 数据库文件包含所有密钥信息，请勿提交到 Git。

---

<p align="center">
  Made with ⚡ by KeyForge
</p>
