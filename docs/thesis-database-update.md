# 论文第四章材料：数据库设计改进说明

## 4.x 数据库设计改进背景
系统早期数据库只包含 `users` 和 `history_records` 两张表。其中，`users` 负责用户认证，`history_records` 负责保存一次对比后的完整结果 JSON。该结构实现简单，但随着系统功能扩展，逐渐暴露出以下不足：

1. 对比任务缺少独立实体，无法记录任务标题、文件类型、算法、耗时和截断状态。
2. 文件元信息无法追踪，论文中难以说明上传文件来源、大小和哈希校验。
3. 导出行为无法审计，无法展示 HTML/PDF 报告生成记录。
4. 筛选规则、默认设置、差异备注等用户个性化数据缺少持久化位置。
5. 多版本连续对比无法表达版本链和版本文件顺序。
6. 数据看板需要按任务、类型、时间和差异数量统计，而单一历史 JSON 不便于查询。

因此，本系统在保留旧表的基础上，对 SQLite 数据库结构进行了扩展，形成面向“对比任务中心”的数据库模型。

## 4.x 数据库设计目标
- 兼容已有历史记录功能，保证旧功能不失效。
- 将一次对比抽象为任务，分别保存任务元信息、参与文件和完整结果。
- 对上传文件、导出报告、版本链、差异备注等关键业务行为进行追踪。
- 支持用户级规则预设和默认设置。
- 为统计看板提供可聚合的数据来源。
- 使用外键约束保证用户数据隔离和业务数据一致性。

## 4.x 表关系图文字版
表关系可用如下文字描述替代图示：

1. `users` 是所有用户业务数据的根表。
2. `history_records`、`uploaded_files`、`compare_jobs`、`export_records`、`filter_presets`、`diff_annotations`、`version_chains` 均通过 `user_id` 关联 `users.id`。
3. `user_settings.user_id` 同时作为主键和外键，与 `users` 形成一对一关系。
4. `compare_jobs` 与 `compare_results` 形成一对一关系，一次任务对应一份完整结果。
5. `compare_jobs` 与 `compare_job_files` 形成一对多关系，一次任务可包含左文件、右文件或多个版本文件。
6. `uploaded_files` 可被 `compare_job_files` 和 `version_chain_files` 引用，文件元数据删除后引用字段置空。
7. `compare_jobs` 与 `export_records` 形成一对多关系，一次任务可被多次导出。
8. `compare_jobs` 与 `diff_annotations` 形成一对多关系，一次任务下可对多条差异添加备注。
9. `version_chains` 与 `version_chain_files` 形成一对多关系，一个版本链包含多个版本文件。

## 4.x 各表作用说明
| 表名 | 主要作用 |
| --- | --- |
| users | 保存用户账号和认证信息 |
| history_records | 保存旧版历史记录，保证兼容性 |
| uploaded_files | 保存上传文件元数据，包括文件名、大小、哈希和来源 |
| compare_jobs | 保存对比任务元信息，例如类型、模式、算法、耗时、差异数量 |
| compare_job_files | 保存任务参与文件及其角色 |
| compare_results | 保存任务完整结果、过滤配置、高级规则、归一化和性能信息 |
| export_records | 保存 HTML/PDF 报告导出记录 |
| filter_presets | 保存用户常用筛选规则预设 |
| user_settings | 保存用户默认文件类型、默认规则和主题 |
| diff_annotations | 保存某条差异的备注、标签和处理状态 |
| version_chains | 保存多版本连续对比的版本链摘要和趋势 |
| version_chain_files | 保存版本链中的每个版本文件 |

## 4.x 可直接放入论文的三线表内容

### 表 4-x 用户表 users
| 字段名 | 数据类型 | 约束 | 字段说明 |
| --- | --- | --- | --- |
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 用户编号 |
| username | TEXT | NOT NULL UNIQUE | 用户名 |
| password_hash | TEXT | NOT NULL | 密码哈希 |
| created_at | TEXT | NOT NULL | 创建时间 |

### 表 4-x 对比任务表 compare_jobs
| 字段名 | 数据类型 | 约束 | 字段说明 |
| --- | --- | --- | --- |
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 任务编号 |
| user_id | INTEGER | NOT NULL, FK | 所属用户 |
| title | TEXT | NOT NULL | 任务标题 |
| file_type | TEXT | NOT NULL | 文件类型 |
| input_mode | TEXT | NOT NULL | 输入模式 |
| status | TEXT | NOT NULL | 任务状态 |
| algorithm | TEXT |  | 对比算法 |
| duration_ms | INTEGER | DEFAULT 0 | 运行耗时 |
| result_count | INTEGER | DEFAULT 0 | 差异数量 |
| result_truncated | INTEGER | NOT NULL DEFAULT 0 | 是否截断 |
| created_at | TEXT | NOT NULL | 创建时间 |
| updated_at | TEXT | NOT NULL | 更新时间 |

### 表 4-x 对比结果表 compare_results
| 字段名 | 数据类型 | 约束 | 字段说明 |
| --- | --- | --- | --- |
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 结果编号 |
| job_id | INTEGER | NOT NULL UNIQUE, FK | 所属任务 |
| summary | TEXT | NOT NULL | 差异统计 JSON |
| filters | TEXT | NOT NULL | 基础过滤 JSON |
| advanced_rules | TEXT | NOT NULL | 高级规则 JSON |
| normalization | TEXT | NOT NULL | 归一化配置 JSON |
| performance | TEXT | NOT NULL | 性能信息 JSON |
| result_json | TEXT | NOT NULL | 完整差异结果 JSON |
| received | TEXT | NOT NULL | 请求摘要 JSON |
| created_at | TEXT | NOT NULL | 创建时间 |

### 表 4-x 文件记录表 uploaded_files
| 字段名 | 数据类型 | 约束 | 字段说明 |
| --- | --- | --- | --- |
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 文件记录编号 |
| user_id | INTEGER | NOT NULL, FK | 所属用户 |
| original_name | TEXT | NOT NULL | 原始文件名 |
| stored_name | TEXT |  | 服务端存储名 |
| file_type | TEXT | NOT NULL | 文件类型 |
| mime_type | TEXT |  | MIME 类型 |
| size_bytes | INTEGER | NOT NULL DEFAULT 0 | 文件大小 |
| sha256 | TEXT |  | 文件哈希 |
| storage_path | TEXT |  | 存储路径 |
| source_type | TEXT | NOT NULL DEFAULT upload | 文件来源 |
| created_at | TEXT | NOT NULL | 创建时间 |

### 表 4-x 导出记录表 export_records
| 字段名 | 数据类型 | 约束 | 字段说明 |
| --- | --- | --- | --- |
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 导出记录编号 |
| user_id | INTEGER | NOT NULL, FK | 所属用户 |
| job_id | INTEGER | FK | 关联任务 |
| export_type | TEXT | NOT NULL | 导出格式 |
| file_name | TEXT | NOT NULL | 导出文件名 |
| options | TEXT | NOT NULL | 导出选项 JSON |
| created_at | TEXT | NOT NULL | 导出时间 |

### 表 4-x 规则预设表 filter_presets
| 字段名 | 数据类型 | 约束 | 字段说明 |
| --- | --- | --- | --- |
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 预设编号 |
| user_id | INTEGER | NOT NULL, FK | 所属用户 |
| name | TEXT | NOT NULL | 预设名称 |
| description | TEXT |  | 预设说明 |
| file_type | TEXT | NOT NULL DEFAULT auto | 适用类型 |
| filters | TEXT | NOT NULL | 基础过滤 JSON |
| advanced_rules | TEXT | NOT NULL | 高级规则 JSON |
| normalization | TEXT | NOT NULL | 归一化 JSON |
| is_default | INTEGER | NOT NULL DEFAULT 0 | 是否默认 |
| created_at | TEXT | NOT NULL | 创建时间 |
| updated_at | TEXT | NOT NULL | 更新时间 |

### 表 4-x 差异备注表 diff_annotations
| 字段名 | 数据类型 | 约束 | 字段说明 |
| --- | --- | --- | --- |
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 备注编号 |
| user_id | INTEGER | NOT NULL, FK | 所属用户 |
| job_id | INTEGER | NOT NULL, FK | 所属任务 |
| diff_id | TEXT | NOT NULL | 差异项编号 |
| note | TEXT | NOT NULL | 备注内容 |
| tag | TEXT |  | 标签 |
| resolved | INTEGER | NOT NULL DEFAULT 0 | 是否已处理 |
| created_at | TEXT | NOT NULL | 创建时间 |
| updated_at | TEXT | NOT NULL | 更新时间 |

### 表 4-x 多版本链表 version_chains
| 字段名 | 数据类型 | 约束 | 字段说明 |
| --- | --- | --- | --- |
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 版本链编号 |
| user_id | INTEGER | NOT NULL, FK | 所属用户 |
| title | TEXT | NOT NULL | 版本链标题 |
| file_type | TEXT | NOT NULL | 文件类型 |
| summary | TEXT | NOT NULL | 版本链摘要 JSON |
| trend | TEXT | NOT NULL | 趋势摘要 JSON |
| created_at | TEXT | NOT NULL | 创建时间 |

### 表 4-x 版本链文件表 version_chain_files
| 字段名 | 数据类型 | 约束 | 字段说明 |
| --- | --- | --- | --- |
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 文件明细编号 |
| chain_id | INTEGER | NOT NULL, FK | 所属版本链 |
| file_id | INTEGER | FK | 关联文件记录 |
| version_index | INTEGER | NOT NULL | 版本序号 |
| version_label | TEXT | NOT NULL | 版本标签 |
| file_name | TEXT | NOT NULL | 文件名 |
| created_at | TEXT | NOT NULL | 创建时间 |

## 4.x 小结
改进后的数据库结构从“单表历史记录”扩展为“任务中心 + 文件元数据 + 结果详情 + 用户配置 + 审计追踪 + 多版本分析”的完整模型。该结构既保留了旧功能，又为高级查询、统计分析和论文演示提供了稳定的数据基础。
