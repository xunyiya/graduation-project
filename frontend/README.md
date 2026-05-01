# 前端工程

本目录是 React + TypeScript + Vite 前端工程。

## 目录说明
- `src/components`：通用布局和可复用组件。
- `src/pages`：路由页面。
- `src/routes`：React Router 路由配置。
- `src/services`：请求后端 API 的前端服务层。
- `src/styles`：全局样式。
- `src/types`：前端共享类型定义。

## 常用命令
```bash
npm run dev --workspace frontend
npm run build --workspace frontend
npm run typecheck --workspace frontend
```

## 当前页面
- `/`：工作台状态页。
- `/compare`：数据对比页，支持纯文本分栏 diff、JSON 树形 diff、CSV/Excel 表格差异视图、差异列表、差异跳转和结果导出。
- `/history`：历史记录页，使用 localStorage 保存对比基本信息和完整结果，支持查看、删除和重新打开。
