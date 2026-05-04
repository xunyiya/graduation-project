# 数据差异对比可视化工具

## 项目简介
本项目是一个面向毕业设计场景的数据差异分析平台，支持文本、JSON、CSV 和 Excel 文件的差异检测、结构化展示、规则过滤、结果导出、任务追踪和统计分析。系统从早期的简单历史记录逐步扩展为以 SQLite 为核心的数据管理平台，适合在论文中展示“对比处理、结果沉淀、审计追踪、统计看板”的完整闭环。

## 核心功能
- 文本、JSON、CSV、Excel 对比：支持自动识别或手动指定文件类型。
- 基础过滤：忽略空白、忽略大小写、忽略单行注释。
- 高级规则：忽略文本关键词、正则内容、JSON 字段/路径、数组顺序、表格列/行和数值容差。
- 归一化处理：JSON 字段顺序、空值等价、数值容差、日期格式、表格主键列对齐。
- 多版本连续对比：上传 v1、v2、v3 等多个版本，生成区间差异和趋势摘要。
- 对比任务中心：保存每次对比的任务元信息、参与文件和完整结果。
- 文件记录：保存上传文件元数据，包括大小、哈希、来源和文件类型。
- 筛选规则预设：保存常用规则，下次对比时一键应用。
- 用户默认设置：保存默认文件类型、默认过滤/高级/归一化规则和主题。
- 差异备注与标记：对单条差异添加备注、标签和处理状态。
- 导出记录：记录 HTML/PDF 报告导出行为，支撑审计追踪。
- 数据看板：统计任务数、差异数、导出次数、文件类型分布和 7 天趋势。

## 技术栈
前端：
- React
- TypeScript
- Vite
- React Router
- Context API

后端：
- Node.js
- Express
- TypeScript
- SQLite
- multer
- exceljs
- csv-parse
- bcryptjs
- JWT
- pdfkit

## 工程结构
```text
.
├── frontend/                 # React + TypeScript + Vite 前端工程
├── backend/                  # Node.js + Express + TypeScript 后端工程
├── docs/                     # 毕设文档、数据库说明和论文材料
├── test-files/               # 分轮次整理的上传测试文件
├── package.json              # npm workspace 统一脚本
└── package-lock.json
```

## 启动方式
安装依赖：
```bash
npm install
```

同时启动前端和后端：
```bash
npm run dev
```

单独启动：
```bash
npm run dev:frontend
npm run dev:backend
```

默认访问地址：
- 前端：`http://localhost:5173`
- 后端健康检查：`http://localhost:3001/api/health`

SQLite 数据库默认路径：
```text
backend/data/app.db
```

如需自定义数据库路径或 JWT 密钥，可复制 `backend/.env.example` 为 `backend/.env` 后调整：
```text
DATABASE_PATH=backend/data/app.db
JWT_SECRET=your-secret
```

## 验证命令
```bash
npm run build
npm test
npm run typecheck
```

其中：
- `npm run build`：构建前后端，前端执行 `tsc --noEmit && vite build`，后端执行 `tsc`。
- `npm test`：构建后端并运行 `backend/test/*.test.mjs`。
- `npm run typecheck`：对所有 workspace 执行 TypeScript 类型检查。

## 页面路径
- `/`：工作台首页。
- `/dashboard`：数据看板，展示统计卡片、分布图、7 天趋势和最近任务。
- `/compare`：数据对比工作台，支持双文件和多版本连续对比。
- `/jobs`：对比任务中心，展示任务详情、导出记录和多版本记录。
- `/history`：旧版历史记录，兼容 `history_records` 表。
- `/files`：文件记录，展示上传文件元数据。
- `/settings`：个人设置，配置默认规则和主题。
- `/login`：登录与注册。

## 数据库表说明
系统当前使用 SQLite，核心表包括：
- `users`：用户账号。
- `history_records`：旧版历史记录，保留兼容原历史功能。
- `uploaded_files`：上传文件元数据。
- `compare_jobs`：对比任务主表。
- `compare_job_files`：任务参与文件关联表。
- `compare_results`：任务完整结果表。
- `export_records`：导出审计记录。
- `filter_presets`：用户规则预设。
- `user_settings`：用户默认设置。
- `diff_annotations`：差异备注与标记。
- `version_chains`：多版本对比链。
- `version_chain_files`：版本链文件明细。

更完整的字段、外键和索引说明见 [docs/database-schema.md](docs/database-schema.md)。

## 测试覆盖
后端测试覆盖：
- 数据库表和关键索引创建。
- 外键级联删除和 `ON DELETE SET NULL`。
- 用户隔离访问。
- 对比任务创建、查询、删除和完整 JSON 结果恢复。
- 文件记录、规则预设、用户设置、差异备注、导出记录、版本链记录。
- 数据看板统计口径。
- 文本、JSON、CSV、Excel、多版本对比和导出服务。

## 论文材料
- [docs/database-schema.md](docs/database-schema.md)：数据库结构说明。
- [docs/thesis-database-update.md](docs/thesis-database-update.md)：第四章数据库设计改进材料。
- [docs/thesis-feature-update.md](docs/thesis-feature-update.md)：第五章功能实现与第六章测试材料。
