# API 设计草案

## 健康检查
GET /api/health

## 用户认证
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET /api/auth/me

认证采用 JWT Bearer Token。前端登录或注册成功后保存 token，后续请求通过 `Authorization: Bearer <token>` 访问需要登录的接口。

### 注册 / 登录请求
```json
{
  "username": "alice",
  "password": "password"
}
```

### 注册 / 登录响应
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "alice",
      "createdAt": "2026-04-29T12:00:00.000Z"
    },
    "token": "jwt-token"
  }
}
```

用户密码使用 bcryptjs 哈希后存储，接口不会返回 `passwordHash`。

## 文件对比
POST /api/diff/compare

### 请求参数
- leftFile / leftText
- rightFile / rightText
- fileType=auto|text|json
- ignoreWhitespace：是否忽略空白字符
- ignoreCase：是否忽略大小写差异
- ignoreComments：是否忽略 `//` 和 `#` 单行注释

当前阶段支持纯文本、JSON、CSV 和 Excel。`fileType=auto` 时，后端会根据 `.json`、`.csv`、`.xlsx` 文件名识别类型；无文件时，如果左右文本都能解析为 JSON，也会进入 JSON 对比。

文本过滤逻辑在后端预处理阶段执行：先把每行转换成用于比较的 `compareKey`，再进入 diff 阶段，原始内容仍用于前端展示。

### 文本返回结构
```json
{
  "success": true,
  "fileType": "text",
  "summary": {
    "total": 3,
    "added": 1,
    "removed": 1,
    "modified": 1
  },
  "result": [
    {
      "kind": "text-line",
      "id": 1,
      "type": "unchanged|added|removed|modified",
      "left": {
        "lineNumber": 1,
        "content": "left line",
        "segments": [
          {
            "type": "unchanged|changed",
            "text": "left"
          }
        ]
      },
      "right": {
        "lineNumber": 1,
        "content": "right line",
        "segments": [
          {
            "type": "unchanged|changed",
            "text": "right"
          }
        ]
      }
    }
  ],
  "filters": {
    "options": {
      "ignoreWhitespace": true,
      "ignoreCase": false,
      "ignoreComments": true
    },
    "active": [
      {
        "key": "ignoreWhitespace",
        "label": "忽略空白字符"
      }
    ]
  },
  "performance": {
    "algorithm": "text-lcs",
    "resultLimit": 5000,
    "resultCount": 12,
    "resultTruncated": false,
    "warnings": []
  },
  "message": "文本逐行对比完成。"
}
```

### JSON 返回结构
```json
{
  "success": true,
  "fileType": "json",
  "summary": {
    "total": 3,
    "added": 1,
    "removed": 1,
    "modified": 1
  },
  "result": [
    {
      "kind": "json-node",
      "id": "$",
      "type": "unchanged|added|removed|modified",
      "key": "$",
      "path": "$",
      "valueType": "object|array|string|number|boolean|null",
      "leftPreview": "{...}",
      "rightPreview": "{...}",
      "children": []
    }
  ],
  "message": "JSON 树形对比完成。"
}
```

### CSV / Excel 返回结构
```json
{
  "success": true,
  "fileType": "csv|excel",
  "summary": {
    "total": 3,
    "added": 1,
    "removed": 1,
    "modified": 1
  },
  "result": [
    {
      "kind": "table-diff",
      "id": "excel:Users:Users!B2",
      "type": "added|removed|modified",
      "scope": "sheet|cell",
      "sourceType": "csv|excel",
      "sheetName": "Users",
      "rowNumber": 2,
      "columnNumber": 2,
      "columnName": "B",
      "path": "Users!B2",
      "leftValue": "Ada",
      "rightValue": "Ada Lovelace"
    }
  ],
  "message": "CSV 表格对比完成。"
}
```

## 统一结果模型说明
- `summary` 在 text/json/csv/excel 中统一表示差异总数、新增数、删除数、修改数。
- `result` 统一是数组，每个元素都有 `kind`、`type` 和 `meta`。
- `meta` 是交互层统一入口，用于差异列表和跳转定位：
  - `diffId`：前端跳转和高亮使用的稳定 ID
  - `label`：差异列表展示标题
  - `path`：人类可读的位置描述
  - `location`：结构化位置，按 text/json/table 区分
  - `leftValue` / `rightValue`：差异列表预览值
- text 使用 `kind=text-line`，表达行级左右内容和字符级 segments。
- json 使用 `kind=json-node`，表达节点路径、预览值和 children。
- csv/excel 使用 `kind=table-diff`，表达表格位置、工作表、行列、原值和新值。
- `performance` 用于描述本次 diff 的算法、结果数量上限、是否截断和性能提示。

### 差异项通用字段
```json
{
  "kind": "text-line|json-node|table-diff",
  "type": "added|removed|modified|unchanged",
  "meta": {
    "diffId": "json-$.project.version",
    "kind": "json-node",
    "type": "modified",
    "label": "version",
    "path": "$.project.version",
    "location": {
      "kind": "json",
      "path": "$.project.version"
    },
    "leftValue": "1",
    "rightValue": "2"
  }
}
```

## 导出 HTML
POST /api/export/html

## 导出 PDF
POST /api/export/pdf

### 导出请求结构
```json
{
  "compareResult": {},
  "selectedDiffId": "text-1",
  "options": {
    "exportAllDifferences": true,
    "includeSummary": true,
    "includeFileInfo": true
  }
}
```

HTML 导出返回 `text/html` 附件，PDF 导出返回 `application/pdf` 附件。导出模块只消费当前对比结果和导出配置，不依赖历史记录。

## 历史记录
GET /api/history
POST /api/history
GET /api/history/:id
DELETE /api/history/:id

历史记录需要登录后访问，未登录返回 `401`。后端使用 SQLite 持久化，数据库默认位置为 `/Users/xunyi/Desktop/毕设系统/backend/data/app.db`。

### 保存历史记录
```json
{
  "compareResult": {
    "success": true,
    "fileType": "text",
    "summary": {},
    "result": [],
    "filters": {},
    "performance": {}
  }
}
```

后端会从 `compareResult` 中提取 `fileType`、文件名、`summary` 和 `filters`，并把完整 `compareResult` 以 JSON 字符串形式存入 `history_records` 表。

### 历史记录响应
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "createdAt": "2026-04-29T12:00:00.000Z",
      "fileType": "text",
      "fileNames": {
        "left": "left.txt",
        "right": "right.txt"
      },
      "summary": {},
      "filters": {},
      "compareResult": {}
    }
  ]
}
```

所有历史记录查询、读取和删除都会附带 `userId` 条件，保证用户只能操作自己的记录。
