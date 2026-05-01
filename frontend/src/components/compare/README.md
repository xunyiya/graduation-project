# compare

放置对比页面组件，包括输入表单、统计面板、错误提示、差异列表、文本左右分栏 diff、JSON 树形差异视图和 CSV/Excel 表格差异视图。

差异列表和跳转能力统一读取后端返回的 `meta.diffId`、`meta.path` 和 `meta.location`，各具体视图只负责渲染和滚动定位。
