# 环境配置速查表

面向当前仓库的真实配置，按开发（Dev）与生产（Prod）环境拆分。所有路径都以仓库根目录为参考。若某些值尚未提供，则标注为「待补充」并说明用途。

## 开发环境（当前正在使用）

### 前端：`.env.local`

| 变量 | 当前值 | 说明 |
| --- | --- | --- |
| `VITE_AI_LANGUAGE` | `zh` | 控制应用默认语言 |
| `VITE_GOOGLE_GEMINI_API_KEY` | `AIzaSyDUKP60M4YLpyyStCOvntwDtPX0zvl5F64` | Google Gemini 直连 Key |
| `VITE_AUTH_MODE` | `server` | 前端认证模式（与后端联调） |
| `DEV_ORIGIN` | `http://localhost:5173` | 本地调试页面地址 |
| `VITE_LOCAL_IP` | `192.168.2.115` | 局域网访问时用于提示的本机 IP |
| `VITE_API_BASE` | `/api` | Vite 代理到后端的基础路径 |

> 说明：前端无需再存放 147 API Key，所有 147/Google 请求都透过后端。

### 根目录：`.env`

| 变量 | 当前值 | 说明 |
| --- | --- | --- |
| `BANANA_API_KEY` | `sk-YO5bqpHjJ7zcm2iuukjsybBEKn9roLMrH4wLFYu15TBhY5lt` | 147（Banana）API Key，供脚本/演示页面直接使用 |

### 后端：`server/.env`

| 变量 | 当前值 | 说明 |
| --- | --- | --- |
| `PORT` / `HOST` | `4000` / `0.0.0.0` | API 监听地址 |
| `DATABASE_URL` | `postgresql://litai@localhost:5432/tanva?schema=public` | 开发数据库 |
| `JWT_ACCESS_SECRET` | `replace-with-strong-secret` | ⚠️ 开发环境占位；生产需换成随机字符串 |
| `JWT_REFRESH_SECRET` | `replace-with-strong-secret-2` | 同上 |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | `900s` / `30d` | Token 生命周期 |
| `COOKIE_SECRET` | `replace-with-cookie-secret` | Fastify cookie 加密密钥 |
| `COOKIE_SECURE` / `COOKIE_SAMESITE` / `COOKIE_DOMAIN` | `false` / `lax` / `localhost` | 仅供本地开发；生产需开启 secure 并设置真实域名 |
| `LOCAL_NETWORK_IP` | `192.168.2.115` | 本地调试广播 IP |
| `CORS_ORIGIN` | `http://localhost:5173,http://localhost:3000,http://192.168.2.115:5173,http://192.168.2.115:3000,https://tai.tanva.tgtai.com` | 允许的来源（含一条生产域名测试用） |
| `OSS_REGION` | `oss-cn-shenzhen` | OSS 区域 |
| `OSS_BUCKET` | `tai-tanva-ai` | OSS 存储桶 |
| `OSS_ACCESS_KEY_ID` | `your-oss-access-key-id` | OSS AK |
| `OSS_ACCESS_KEY_SECRET` | `your-oss-access-key-secret` | OSS SK |
| `OSS_ENDPOINT` | `oss-cn-shenzhen.aliyuncs.com` | 私网/公网 endpoint |
| `OSS_CDN_HOST` | `tai.tanva.tgtai.com` | CDN 加速域名 |
| `DEFAULT_AI_PROVIDER` | `gemini` | 默认为 Google |
| `GOOGLE_GEMINI_API_KEY` | `your-google-gemini-api-key` | Google 服务端 Key |
| `GEMINI_MODEL` / `GEMINI_TEXT_MODEL` | `gemini-2.5-flash-image` / `gemini-2.0-flash` | 默认模型 |
| `BANANA_API_KEY` | `your-banana-api-key` | 147 API Key（服务端用） |
| `ENABLE_COST_TRACKING` | `true` | 成本统计开关 |
| `COST_TRACKING_DATABASE_URL` | `sqlite:///./cost_tracking.db` | 统计数据存放路径 |
| `LOG_LEVEL` / `ENABLE_API_METRICS` | `debug` / `true` | 日志与指标开关 |

### OSS 配置（当前开发环境）

```ini
region=oss-cn-shenzhen
accessKeyId=your-oss-access-key-id
accessKeySecret=your-oss-access-key-secret
bucket=tai-tanva-ai
endpoint=oss-cn-shenzhen.aliyuncs.com
```

> 生产环境如需隔离存储，请替换为对应地域、AK/SK、Bucket 与 Endpoint。

## 生产环境（建议配置）

### 前端：`.env.production`

| 变量 | 推荐值 | 说明 |
| --- | --- | --- |
| `VITE_AI_LANGUAGE` | `zh` 或 `en` | 根据目标用户选择 |
| `VITE_AUTH_MODE` | `server` | 生产环境同样依赖后端 |
| `VITE_API_BASE` | `https://<your-domain>/api` | 需替换成实际域名（如 `https://tai.tanva.tgtai.com/api`） |
| `VITE_API_URL` | `https://<your-domain>` | 供前端直接展示/跳转 |
| `VITE_GOOGLE_GEMINI_API_KEY` | `AIzaSyDUKP60M4YLpyyStCOvntwDtPX0zvl5F64` | 与开发共用的 Google Key |
| 其他 `VITE_*` | 视需求追加 | 例如默认分辨率、轮询频率 |

> 若需在浏览器直接访问 147 API，请在前端 `.env.production` 中添加 `BANANA_API_KEY`，但更安全的做法是始终走后端代理。

### 根目录：`.env.production`（可选）

如需在演示页面/脚本中使用生产 Key，可准备一个独立的 `.env.production`，仅包含必要的 `BANANA_API_KEY` 或其他脚本所需变量，部署时避免暴露在前端。

### 后端：`server/.env.production`

| 变量 | 推荐值 | 说明 |
| --- | --- | --- |
| `PORT` / `HOST` | `4000` / `0.0.0.0` | 保持默认即可 |
| `NODE_ENV` | `production` | 可新增此变量用于日志策略 |
| `DATABASE_URL` | `postgresql://tanva_user:<strong_password>@<db-host>:5432/tanva?schema=public` | 指向云数据库，务必使用强口令 |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | `<随机 32+ 字符>` | 使用 `node -e "crypto.randomBytes(32).toString('hex')"` 生成 |
| `COOKIE_SECRET` | `<随机 32+ 字符>` | 与 JWT 不同的密钥 |
| `COOKIE_SECURE` | `true` | 启用 HTTPS cookie |
| `COOKIE_SAMESITE` | `lax` 或 `none` | 若多域访问需要 `none` 并配合 `COOKIE_SECURE=true` |
| `COOKIE_DOMAIN` | `tai.tanva.tgtai.com` | 替换为正式域名 |
| `CORS_ORIGIN` | `https://tai.tanva.tgtai.com`（必要时含 `www`） | 列出所有允许的前端来源 |
| `OSS_REGION` / `OSS_BUCKET` / `OSS_ACCESS_KEY_ID` / `OSS_ACCESS_KEY_SECRET` / `OSS_ENDPOINT` / `OSS_CDN_HOST` | `<沿用或换成生产桶>` | 若生产与开发隔离，请在此处放入生产 OSS 信息 |
| `DEFAULT_AI_PROVIDER` | `gemini` 或 `banana` | 根据业务场景决定默认提供商 |
| `GOOGLE_GEMINI_API_KEY` / `GEMINI_MODEL` / `GEMINI_TEXT_MODEL` | `AIzaSyDUKP60M4YLpyyStCOvntwDtPX0zvl5F64` / `gemini-2.5-flash-image` / `gemini-2.0-flash` | 与开发共用的 Google Key 与默认模型 |
| `BANANA_API_KEY` | `sk-WBd9sGus7I68Wwl9ivwfIBP148GzuF7ypLISfdUqlW5Ipj5P` | 与开发共用的 147（Banana）Key |
| `ENABLE_COST_TRACKING` / `COST_TRACKING_DATABASE_URL` | `true` / `postgresql://...` 或 `sqlite:///./cost_tracking.db` | 建议生产写入持久数据库 |
| `LOG_LEVEL` | `info` | 生产降低日志噪音 |
| `ENABLE_API_METRICS` | `true` | 如需 Prometheus/监控可保持开启 |

### 仍需补充/确认的项目

- **生产数据库凭据**：当前仓库未提供，需要在部署前创建并写入 `DATABASE_URL`。
- **生产版 JWT / Cookie 密钥**：`server/.env.production` 中必须替换为全新的随机值。
- **正式域名配置**：`COOKIE_DOMAIN`、`CORS_ORIGIN` 及前端 `VITE_API_BASE` / `VITE_API_URL` 需要统一替换为真实域名。
- **OSS 生产凭据**：如不复用开发桶，需要提供新的 `OSS_ACCESS_KEY_ID/SECRET` 与 `OSS_BUCKET`。
- **Google & 147 API Key（生产专用）**：目前文档仅记录开发 Key，生产部署前请替换。

> 建议在 CI/CD 中分别注入 `.env.development` 与 `.env.production`，避免将生产密钥直接提交到仓库。


### 生成安全密钥

生产环境部署前，需要将 `JWT_ACCESS_SECRET`、`JWT_REFRESH_SECRET`、`COOKIE_SECRET` 更改为新的随机值。可以使用以下命令生成强随机字符串（示例生成 48 字节 / 96 字符的十六进制）：

```
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

本次提供的一组示例值（部署时可直接使用，或按需重新生成）：

```
JWT_ACCESS_SECRET=8f7a09423277757d593c4408853e3055153e51724c722639d4d8751cc32fc3a3421e60ddcb72d8492d053c75c1c5fe16
JWT_REFRESH_SECRET=1eb3a74a50f1598f9e278759a4b705c7d8c8f9bde65c3e9ff713b43275000f19cf60b5d37b6255e9231cac8b38f6cec1
COOKIE_SECRET=17d49626ad6839e591dea0384088ed9d8ef1776f32ab6c69a2d13a705b13e643380553f040c3ade93f0bb3c1eddd0442
```

>
> 将这些密钥分别写入生产环境的 `server/.env.production`，并确保不再提交到版本库。
>
