#!/bin/bash

# Tanva 应用启动脚本
# 适用于 Sealos DevBox 部署

echo "🚀 启动 Tanva 应用..."

# 进入Tanva项目目录
cd Tanva

# 设置环境变量
export NODE_ENV=production
export PORT=${PORT:-4000}
export HOST=${HOST:-0.0.0.0}

# 检查构建产物是否存在
if [ ! -d "server/dist" ]; then
    echo "❌ 后端构建产物不存在，请先运行 npm run build"
    exit 1
fi

if [ ! -d "dist" ]; then
    echo "❌ 前端构建产物不存在，请先运行前端构建"
    exit 1
fi

# 启动后端服务（后台运行）
echo "🔧 启动后端服务..."
cd server
node dist/main.js &
BACKEND_PID=$!
cd ..

# 等待后端服务启动
echo "⏳ 等待后端服务启动..."
sleep 5

# 检查后端服务是否正常启动
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ 后端服务启动失败"
    exit 1
fi

echo "✅ 后端服务已启动 (PID: $BACKEND_PID)"

# 启动前端服务
echo "🌐 启动前端服务..."
# 使用 serve 提供静态文件服务，直接使用前端构建产物目录
npx serve -s dist -l 3000 -n

# 注意：serve 命令会阻塞，这是正确的行为
# Sealos DevBox 会管理进程的生命周期
