# services

放置前端 API 请求封装。业务页面不直接拼接后端地址，统一通过这里访问 `/api`。

- `api.ts`：统一 fetch 封装，并自动附带 JWT Bearer token。
- `auth.service.ts` / `token.service.ts`：注册登录、当前用户和本地 token 管理。
- `history.service.ts`：SQLite 历史记录 API 调用，保存失败时保留 localStorage 兼容兜底。
- `export.service.ts`：HTML/PDF 导出请求。
