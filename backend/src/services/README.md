# services

放置后端业务服务。

- `filter.service.ts`：过滤和文本归一化逻辑，当前支持忽略空白、忽略大小写、忽略 `//` 与 `#` 单行注释。该模块属于预处理阶段，后续 JSON、CSV、Excel 可复用。
- `fileType.service.ts`：根据请求参数、文件名和内容自动识别当前对比类型。
- `textDiff.service.ts`：纯文本逐行 diff 和修改行字符级 segments 生成。
- `jsonDiff.service.ts`：JSON 解析、递归树形 diff 和节点统计。
- `csvParser.service.ts` / `csvDiff.service.ts`：CSV 解析和行列单元格 diff。
- `excelParser.service.ts` / `excelDiff.service.ts`：Excel `.xlsx` 解析、工作表 diff 和单元格 diff。
- `tableDiff.service.ts`：CSV/Excel 复用的二维表格单元格比较和位置格式化。
- `export.service.ts`：基于统一结果模型生成 HTML/PDF 导出内容。
- `performance.service.ts`：结果数量限制和性能提示元信息。
- `database.service.ts`：SQLite 数据库连接和表结构自动初始化。
- `user.service.ts` / `auth.service.ts`：用户注册登录、bcryptjs 密码哈希和 JWT 生成校验。
- `history.service.ts`：按用户隔离保存、读取、删除 SQLite 历史记录。
