# 系统架构设计

## 总体架构
系统采用前后端分离架构。

### 前端职责
- 用户注册、登录状态维护
- 用户输入
- 参数配置
- 差异结果展示
- 历史记录查看
- 导出触发

### 后端职责
- 用户认证与鉴权
- 文件接收
- 文件格式识别
- 文件解析
- 差异计算
- 结果组织
- 导出生成
- 按用户隔离的历史记录持久化

## 前端模块
1. 输入模块
2. 配置模块
3. 文本差异展示模块
4. JSON 树形视图模块
5. CSV/Excel 表格视图模块
6. 统计与跳转模块
7. 导出与历史记录模块
8. 登录注册与路由保护模块

## 后端模块
1. 上传模块
2. 文件识别模块
3. 预处理模块
4. 文本 diff 模块
5. JSON diff 模块
6. CSV diff 模块
7. Excel diff 模块
8. 导出模块
9. 用户认证模块
10. SQLite 历史记录模块

## 当前文本 diff 流程
1. 上传模块接收两个文本文件，或读取左右两段粘贴文本
2. 预处理模块根据配置生成比较用内容：
   - 忽略空白字符
   - 忽略大小写差异
   - 忽略 `//` 和 `#` 单行注释
3. 文本 diff 模块基于预处理后的比较内容执行逐行 diff
4. 对修改行生成字符级 `segments`，供前端行内高亮展示
5. 响应中保留原始内容、统计信息和实际启用的过滤规则

过滤逻辑当前明确放在预处理阶段，便于后续 JSON 节点值、CSV 单元格、Excel 单元格复用文本归一化能力。

## 当前 JSON diff 流程
1. 文件识别模块根据 `fileType`、文件扩展名和内容解析结果判断是否为 JSON
2. JSON 解析模块将左右输入解析为对象、数组或基础值
3. JSON diff 模块递归比较对象属性和数组索引
4. 每个 JSON 节点返回统一的 `type`、`path`、`leftPreview`、`rightPreview` 和 `children`
5. 前端 JSON 树形视图根据 `children` 渲染展开/折叠，并按新增、删除、修改高亮节点

## 当前 CSV / Excel diff 流程
1. 文件识别模块根据 `fileType` 和文件扩展名识别 CSV 或 Excel
2. CSV parser 将文本解析为二维表格矩阵
3. Excel parser 使用 `exceljs` 读取 `.xlsx`，按工作表生成二维表格矩阵
4. CSV diff 对行列坐标逐单元格比较，返回 `table-diff` 结果
5. Excel diff 先识别工作表新增/删除，再对同名工作表逐单元格比较
6. 前端表格视图展示差异类型、工作表、行、列、位置、原值和新值

CSV/Excel 与 text/json 保持统一响应思路：`summary` 统一统计差异数量，`result` 统一为带 `kind` 和 `type` 的差异项数组。

## 当前结果层与交互层
1. 后端保留各类型原有结果字段，同时为每个差异项增加统一 `meta`
2. 前端差异统计面板只依赖统一 `summary`
3. 前端差异列表面板只依赖 `result[*].meta`
4. 前端跳转逻辑使用 `meta.diffId` 定位目标
5. 各视图负责各自展开和滚动：
   - 文本视图滚动到目标行
   - JSON 视图展开目标节点祖先路径并滚动到节点
   - CSV/Excel 表格视图滚动到目标表格行

这种迁移方式不会替换 text/json/csv/excel 的业务字段，后续导出、历史记录和差异跳转可以统一读取 `summary` 与 `meta`。

## 当前导出与历史记录
1. 导出模块：
   - 前端提供导出配置面板，可选择 HTML/PDF、是否导出全部差异、是否包含统计摘要、是否包含文件信息
   - 后端 `/api/export/html` 根据当前对比结果生成 HTML 附件
   - 后端 `/api/export/pdf` 使用 `pdfkit` 生成 PDF 附件
   - 导出模块只读取 `compareResult`、`options` 和 `selectedDiffId`
2. 历史记录模块：
   - 前端在每次对比成功后调用 `/api/history`，把基本信息和完整结果保存到后端
   - 后端使用 SQLite `history_records` 表持久化，`compareResult` 以 JSON 字符串保存
   - 历史页通过 `/api/history` 加载当前登录用户的记录，并支持查看、删除、重新打开某次结果
   - localStorage 仅作为保存失败时的兼容兜底

## 当前用户认证与数据隔离
1. 用户系统：
   - `/api/auth/register` 注册用户，密码使用 bcryptjs 哈希后写入 `users.password_hash`
   - `/api/auth/login` 校验密码并返回 JWT
   - `/api/auth/me` 根据 JWT 返回当前用户
   - `/api/auth/logout` 用于前端退出流程，JWT 主动清理在前端完成
2. 前端登录态：
   - token 封装在 `token.service.ts`
   - API 请求统一通过 `api.ts` 自动附带 `Authorization: Bearer <token>`
   - `/compare` 和 `/history` 由受保护路由拦截，未登录跳转 `/login`
3. 历史记录隔离：
   - `/api/history` 路由统一经过鉴权中间件
   - 查询、读取和删除均使用 `WHERE user_id = 当前用户 id`
   - 接口不返回 `passwordHash`

导出和历史记录相互独立：历史记录不调用导出服务，导出服务也不读取 localStorage。
