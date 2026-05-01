# 示例测试数据说明

## 文本测试
准备两份文本文件：
- 一个包含新增、删除、修改
- 一个包含空白差异、大小写差异、注释差异

## JSON 测试
准备两份 JSON：
- 一个包含节点新增和删除
- 一个包含值修改
- 一个包含嵌套层级变化

## CSV 测试
准备两份 CSV：
- 一个包含整行新增
- 一个包含单元格变化
- 一个包含列头变化

## Excel 测试
准备两份 Excel：
- 一个包含工作表新增
- 一个包含单元格变化
- 一个包含多个工作表同时变化
# 示例数据

## 文本 diff MVP

本轮已补充两份纯文本示例文件：

- `docs/sample-data/text-left.txt`
- `docs/sample-data/text-right.txt`

可在前端“数据对比”页面分别上传这两个文件，验证新增、删除、修改三类差异展示。

## JSON diff

本轮已补充两份 JSON 示例文件：

- `docs/sample-data/json-left.json`
- `docs/sample-data/json-right.json`

也可以使用根目录下 `test-files/round-03-json-diff` 中的文件进行上传测试。前端选择“自动识别”时会根据 `.json` 文件名进入 JSON 树形差异视图。

## CSV / Excel diff

本轮已补充 CSV 示例文件：

- `docs/sample-data/csv-left.csv`
- `docs/sample-data/csv-right.csv`

根目录下 `test-files/round-04-csv-excel` 还包含：

- `csv-left.csv`
- `csv-right.csv`
- `excel-left.xlsx`
- `excel-right.xlsx`

可在前端“数据对比”页面选择“自动识别”，分别上传左右文件测试 CSV/Excel 表格差异。
