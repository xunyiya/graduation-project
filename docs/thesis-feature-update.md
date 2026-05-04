# 论文第五章与第六章材料：新增功能实现与测试说明

## 第五章可用内容：新增功能实现说明

### 5.x 对比任务中心
系统在原有历史记录基础上新增对比任务中心。用户完成双文件对比或多版本对比后，后端会自动写入 `compare_jobs`、`compare_job_files` 和 `compare_results`。其中，`compare_jobs` 保存任务标题、文件类型、输入模式、算法、耗时和差异数量；`compare_job_files` 保存参与文件角色；`compare_results` 保存完整差异结果和规则配置。前端 `/jobs` 页面可查看任务列表、任务详情并恢复完整结果。

### 5.x 文件元数据管理
系统新增 `uploaded_files` 表和 `/api/files` 接口，用于记录上传文件元信息。记录内容包括原始文件名、文件类型、MIME 类型、文件大小、SHA-256 哈希、来源和创建时间。前端 `/files` 页面只展示安全字段，不直接暴露后端存储路径。

### 5.x 筛选规则预设
系统新增规则预设功能，用户可以将常用基础过滤、高级规则和归一化配置保存为预设。对比页面提供预设选择、应用、保存和管理入口。预设数据存储在 `filter_presets` 表中，并支持按文件类型筛选和设为默认。

### 5.x 用户默认设置
系统新增用户默认设置功能。注册成功后自动创建 `user_settings` 记录，用户可以在 `/settings` 页面配置默认文件类型、默认过滤规则、默认高级规则、默认归一化规则和主题。对比页面加载时自动读取默认配置；如果用户选择规则预设，则预设优先级高于默认设置。

### 5.x 差异备注与标记
系统新增差异备注功能。用户在差异列表中点击“备注”按钮后，可以对单条差异填写备注、选择标签并设置是否已处理。备注保存到 `diff_annotations` 表，通过 `job_id` 和 `diff_id` 定位具体差异项。任务详情恢复结果时会同步加载备注并在差异列表中显示标记。

### 5.x 导出记录与审计追踪
系统在 HTML/PDF 导出成功后写入 `export_records`。如果导出请求携带 `jobId`，导出记录会关联对应任务；如果未携带，也会保存为未关联导出记录。任务中心可查看某任务的导出记录，也可查看最近导出记录，用于展示结果导出与审计追踪流程。

### 5.x 多版本连续对比记录
多版本对比完成后，系统保存 `version_chains` 和 `version_chain_files`。`version_chains` 保存版本链标题、文件类型、总体摘要和趋势；`version_chain_files` 保存每个版本文件的顺序、标签和文件名。任务中心新增“多版本记录”区域，可展示 `v1 -> v2 -> v3` 版本链、区间统计、趋势摘要和差异预览。

### 5.x 数据看板
系统新增 `/dashboard` 数据看板页面。后端通过 `getDashboardStats(userId)` 聚合 `compare_jobs`、`compare_results`、`export_records`、`version_chains` 等表，统计总任务数、文件类型分布、差异类型分布、导出次数、多版本次数和最近 7 天趋势。前端使用 CSS 条形图展示统计结果，不引入复杂图表依赖。

## 第六章可用内容：新增功能测试用例

| 编号 | 测试模块 | 测试内容 | 预期结果 |
| --- | --- | --- | --- |
| TC-DB-01 | 数据库结构 | 初始化数据库后检查所有业务表 | `users`、`compare_jobs`、`export_records` 等表均创建成功 |
| TC-DB-02 | 外键约束 | 删除上传文件记录 | `compare_job_files.file_id` 和 `version_chain_files.file_id` 置空 |
| TC-DB-03 | 外键约束 | 删除用户 | 用户关联的任务、历史、设置、版本链级联删除 |
| TC-JOB-01 | 对比任务 | 创建对比任务并关联左右文件 | 任务和文件关系保存成功 |
| TC-JOB-02 | 对比结果 | 保存完整 JSON 差异结果 | 读取任务详情时能恢复完整结果 |
| TC-JOB-03 | 用户隔离 | 用户 A 读取用户 B 的任务 | 返回空或 404，不能访问 |
| TC-PRESET-01 | 规则预设 | 保存 JSON 过滤规则预设 | 预设可在列表中查看 |
| TC-PRESET-02 | 规则预设 | 设置默认预设 | 同类型其他默认预设自动取消 |
| TC-SETTINGS-01 | 用户设置 | 注册后读取默认设置 | 返回 auto、light 和默认规则 |
| TC-SETTINGS-02 | 用户设置 | 更新并重置设置 | 更新生效，重置后恢复默认值 |
| TC-ANNOTATION-01 | 差异备注 | 对 diffId 添加备注 | 备注可按任务读取 |
| TC-ANNOTATION-02 | 差异备注 | 更新标签和处理状态 | 标签和 resolved 状态正确保存 |
| TC-EXPORT-01 | 导出记录 | 导出 HTML/PDF 报告 | 生成对应 `export_records` |
| TC-EXPORT-02 | 导出记录 | 删除关联任务 | 导出记录保留，`job_id` 置空 |
| TC-CHAIN-01 | 多版本记录 | 保存版本链和版本文件 | 版本数量、标签和趋势保存成功 |
| TC-CHAIN-02 | 多版本详情 | 恢复多版本完整结果 | 能展示区间差异和趋势摘要 |
| TC-DASHBOARD-01 | 数据看板 | 聚合任务、结果、导出、版本链 | 统计卡片和趋势数据正确 |
| TC-DASHBOARD-02 | 用户隔离 | 不同用户分别查看看板 | 仅统计当前用户数据 |

## 已新增自动化测试文件
- `backend/test/databaseSchema.test.mjs`
- `backend/test/compareJob.service.test.mjs`
- `backend/test/filterPreset.service.test.mjs`
- `backend/test/userSettings.service.test.mjs`
- `backend/test/diffAnnotation.service.test.mjs`
- `backend/test/exportRecord.service.test.mjs`
- `backend/test/versionChainRecord.service.test.mjs`
- `backend/test/dashboard.service.test.mjs`

## 系统演示截图建议
论文演示截图可以按以下顺序截取：

1. 登录与注册页面：展示用户隔离的入口。
2. 数据对比页面：展示双文件上传、过滤规则、高级规则和归一化设置。
3. 差异结果页面：展示统计卡片、差异列表和文本/JSON/表格视图。
4. 差异备注弹窗或侧栏：展示备注、标签和处理状态。
5. 规则预设管理：展示预设列表、默认预设和编辑功能。
6. 个人设置页面：展示默认文件类型、默认规则和主题配置。
7. 文件记录页面：展示文件名、类型、大小、哈希前缀和来源。
8. 对比任务中心：展示任务列表、任务详情和恢复结果按钮。
9. 导出记录区域：展示 HTML/PDF 导出格式、文件名、所属任务和导出时间。
10. 多版本记录区域：展示版本链、区间差异统计和趋势摘要。
11. 数据看板页面：展示统计卡片、文件类型分布、差异类型分布、最近 7 天趋势和最近任务列表。

## 验证命令
论文测试章节可说明使用以下命令进行自动化验证：

```bash
npm run build
npm test
npm run typecheck
```

其中，`npm test` 会先构建后端，再运行 `backend/test/*.test.mjs`，覆盖核心算法、数据库服务、API 权限和新增高级功能。
