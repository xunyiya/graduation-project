# 数据差异对比可视化工具

## 项目简介
本项目是一个用于数据差异对比可视化的毕业设计系统，面向纯文本文件和结构化文件（JSON、CSV、Excel）提供差异检测、结果可视化、结果导出和历史记录管理功能。

## 项目目标
1. 支持纯文本、JSON、CSV、Excel 文件的差异对比
2. 支持文件上传、路径导入、文本粘贴三种输入方式
3. 支持忽略空白字符、忽略注释、忽略大小写等过滤规则
4. 支持分栏对比、高亮展示、树形结构视图、差异统计、差异跳转
5. 支持结果导出为 HTML 和 PDF
6. 支持用户登录、按用户隔离的历史比对记录保存和回溯
7. 支持大文件处理优化，如分块加载、增量渲染、虚拟滚动

## 技术栈
### 前端
- React
- TypeScript
- Vite
- React Router
- Context API

### 后端
- Node.js
- Express
- TypeScript
- multer
- exceljs
- csv-parse
- bcryptjs
- JWT
- SQLite

## 当前开发原则
1. 先做最小可运行版本，再逐步扩展
2. 先完成文本 diff，再完成 JSON，再完成 CSV/Excel
3. 先保证功能可用，再做导出、历史记录和性能优化
4. 每完成一个模块都补基础测试和文档

## 工程结构
```text
.
├── frontend/        # React + TypeScript + Vite 前端工程
├── backend/         # Node.js + Express + TypeScript 后端工程
├── docs/            # 毕设文档与开发规划
├── package.json     # npm workspace 统一脚本
└── package-lock.json
```

## 安装依赖
```bash
npm install
```

如果当前终端找不到 `npm`，但 Node 通过 Homebrew 安装在默认位置，可以临时执行：
```bash
export PATH="/opt/homebrew/bin:$PATH"
```

## 启动项目
同时启动前端和后端：
```bash
npm run dev
```

启动后访问：
- 前端：`http://localhost:5173`
- 后端健康检查：`http://localhost:3001/api/health`

SQLite 数据库默认自动创建在：
```text
/Users/xunyi/Desktop/毕设系统/backend/data/app.db
```

如需自定义路径或 JWT 密钥，可复制 `backend/.env.example` 为 `backend/.env` 后调整 `DATABASE_PATH`、`JWT_SECRET`。

也可以单独启动：
```bash
npm run dev:frontend
npm run dev:backend
```

## 验证命令
```bash
npm run typecheck
npm test
npm run build
```

## 当前阶段状态
- 已完成 `frontend` 和 `backend` 工程骨架。
- 已配置 React Router、Vite 代理、Express 路由、multer 文件上传。
- `/api/health` 可用于检查后端状态。
- `/api/diff/compare` 已支持纯文本逐行 diff、字符级行内高亮、空白/大小写/单行注释过滤。
- `/api/diff/compare` 已支持 JSON 自动识别、树结构解析、新增/删除/修改节点检测和树形结果返回。
- `/api/diff/compare` 已支持 CSV 行列差异和 Excel 工作表/单元格差异。
- 结果项已增加统一 `meta`，前端已支持统一差异统计、差异列表和差异跳转。
- `/api/export/html` 和 `/api/export/pdf` 已支持基于当前结果导出报告。
- `/login` 已支持注册、登录和保持登录状态，侧边栏显示当前用户和退出按钮。
- `/history` 已支持基于 SQLite 的用户隔离历史记录查看、删除和重新打开。
- 过滤逻辑在后端预处理阶段执行，diff 阶段比较预处理后的内容，前端展示保留原始文本。
- 大文本和大表格视图已加入虚拟滚动，后端结果集带性能元信息和截断提示。
- `test-files` 目录按开发轮次存放可上传测试文件。
- 浏览器 localStorage 仅作为历史记录保存失败时的兼容兜底，主流程走后端 SQLite。
