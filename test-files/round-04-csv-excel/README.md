# Round 04 CSV / Excel

本轮用于测试 CSV 和 Excel 差异检测。

## CSV
- `csv-left.csv`
- `csv-right.csv`

预期差异：姓名修改、角色修改、新增一行。

## Excel
- `excel-left.xlsx`
- `excel-right.xlsx`

预期差异：`Users!B2` 单元格修改，`Legacy` 工作表删除，`Audit` 工作表新增。
