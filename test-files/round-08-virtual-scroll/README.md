# Round 08 - Virtual Scroll Stress Samples

用于手动验证前端虚拟滚动性能和差异定位准确性。

- `left.txt` / `right.txt`：约 3000 行文本，包含分散的修改和新增行。
- `left.csv` / `right.csv`：约 2500 行表格数据，包含大量 `updatedAt` 变化以及分散的 `name`、`score` 差异。

建议验证：

1. 使用文本对比上传 `left.txt` / `right.txt`，观察文本 diff 长列表和差异列表是否滚动顺滑。
2. 点击“差异列表”的上一个/下一个，确认虚拟滚动能准确定位到目标差异。
3. 点击文本右侧热力图标记，确认结果区能跳转到对应差异位置。
4. 使用 CSV 对比上传 `left.csv` / `right.csv`，确认表格视图按需渲染，密集区域按钮仍能跳转。
