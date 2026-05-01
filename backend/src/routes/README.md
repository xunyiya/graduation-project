# routes

放置 API 路由。当前统一挂载在 `/api` 下。

- `/api/auth`：注册、登录、退出登录、获取当前用户。
- `/api/diff`：文件和文本差异对比。
- `/api/export`：HTML/PDF 导出。
- `/api/history`：需要登录的历史记录接口，按当前用户隔离。
- `/api/health`：后端健康检查。
