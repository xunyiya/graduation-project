# 后端工程

本目录是 Node.js + Express + TypeScript 后端工程。

## 目录说明
- `src/config`：环境变量和基础配置。
- `src/controllers`：接口控制器。
- `src/middleware`：上传、错误处理等中间件。
- `src/routes`：API 路由定义。
- `src/services`：diff、导出、认证、SQLite 历史记录等业务服务。
- `src/types`：后端共享类型定义。
- `data`：SQLite 数据库目录，默认数据库文件为 `data/app.db`。
- `uploads`：multer 临时上传目录。

## 环境变量
- `DATABASE_PATH`：SQLite 数据库路径，默认 `backend/data/app.db`。
- `JWT_SECRET`：JWT 签名密钥，本地开发可用 `.env.example` 示例值，正式环境应替换。
- `JWT_EXPIRES_IN`：JWT 过期时间，默认 `7d`。
- `UPLOAD_LIMIT_MB`：上传文件大小限制，默认 `200`。

## 常用命令
```bash
npm run dev --workspace backend
npm run build --workspace backend
npm run test --workspace backend
npm run start --workspace backend
```
