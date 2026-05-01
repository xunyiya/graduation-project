# routes

放置 React Router 路由配置。新增页面时优先在这里注册路由。

- `AppRouter.tsx`：声明页面路由。
- `ProtectedRoute.tsx`：登录态保护，未登录访问 `/compare` 和 `/history` 时跳转 `/login`。
