# Sealos DevBox 部署指南

## 🎯 部署方式说明

Sealos DevBox **不需要Docker**，它使用更简化的方式：
- 通过 `entrypoint.sh` 脚本启动应用
- 直接在服务器上运行Node.js进程
- 自动管理应用生命周期

## 📋 部署前准备

### 1. 构建前端
```bash
# 安装依赖
npm install

# 构建前端
npm run build
```

### 2. 构建后端
```bash
# 进入后端目录
cd server

# 安装依赖
npm install

# 构建后端
npm run build

# 返回根目录
cd ..
```

### 3. 准备静态文件
```bash
# 将前端构建产物复制到public目录
cp -r dist public
```

## 🚀 Sealos DevBox 部署步骤

### 步骤1: 创建DevBox项目
1. 登录 [Sealos DevBox](https://devbox.sealos.run)
2. 点击"创建项目"
3. 选择"从代码仓库导入"
4. 连接你的GitHub仓库

### 步骤2: 配置项目
- **项目名称**: tanva-app
- **端口**: 3000 (前端), 4000 (后端)
- **环境变量**: 配置数据库、JWT等

### 步骤3: 环境变量配置
```bash
# 数据库配置
DATABASE_URL="file:./dev.db"

# JWT配置
JWT_SECRET="your-jwt-secret"
JWT_REFRESH_SECRET="your-refresh-secret"

# Cookie配置
COOKIE_SECRET="your-cookie-secret"

# CORS配置
CORS_ORIGIN="https://your-domain.com"

# 端口配置
PORT=4000
HOST=0.0.0.0
```

### 步骤4: 发布应用
1. 在DevBox中点击"发布版本"
2. 系统会自动使用 `entrypoint.sh` 作为启动脚本
3. 等待构建和部署完成

## 🔧 启动流程

`entrypoint.sh` 脚本会：
1. ✅ 检查构建产物是否存在
2. 🔧 启动后端服务（NestJS API）
3. ⏳ 等待后端服务就绪
4. 🌐 启动前端服务（静态文件服务）
5. 🎯 监听3000端口提供前端访问

## 📊 访问地址

部署完成后：
- **前端应用**: `https://your-app.sealos.run`
- **后端API**: `https://your-app.sealos.run/api`
- **API文档**: `https://your-app.sealos.run/api/docs`

## 🛠️ 优势对比

### Sealos DevBox vs Docker
| 特性 | Sealos DevBox | Docker |
|------|---------------|--------|
| 部署复杂度 | ⭐ 简单 | ⭐⭐⭐ 复杂 |
| 启动速度 | ⭐⭐⭐ 快 | ⭐⭐ 中等 |
| 资源占用 | ⭐⭐⭐ 低 | ⭐⭐ 中等 |
| 管理复杂度 | ⭐⭐⭐ 简单 | ⭐ 复杂 |

## 🔍 故障排除

### 常见问题
1. **构建失败**: 确保在开发环境完成所有构建
2. **启动失败**: 检查 `entrypoint.sh` 权限和执行路径
3. **端口冲突**: 确保端口配置正确
4. **环境变量**: 在Sealos控制台正确配置

### 日志查看
在Sealos DevBox控制台可以查看：
- 应用启动日志
- 运行时日志
- 错误信息

## 📈 监控和维护

- **实时监控**: Sealos控制台提供实时监控
- **日志管理**: 自动日志收集和查看
- **版本管理**: 支持多版本部署和回滚
- **自动扩缩容**: 根据负载自动调整资源
