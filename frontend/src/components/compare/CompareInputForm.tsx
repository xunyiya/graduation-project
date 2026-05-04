import type { FormEvent } from 'react';

import type { DiffFilterKey, DiffFilterOptions, RequestFileType } from '../../types/api';

interface CompareInputFormProps {
  advancedRules: AdvancedRuleFormState;
  filters: DiffFilterOptions;
  normalization: NormalizationFormState;
  requestFileType: RequestFileType;
  submitting: boolean;
  onAdvancedRulesChange: (nextState: Partial<AdvancedRuleFormState>) => void;
  onFilterChange: (key: DiffFilterKey, enabled: boolean) => void;
  onNormalizationChange: (nextState: Partial<NormalizationFormState>) => void;
  onRequestFileTypeChange: (fileType: RequestFileType) => void;
  onSubmit: (formData: FormData) => void;
}

const filterControls: Array<{ key: DiffFilterKey; label: string }> = [
  { key: 'ignoreWhitespace', label: '忽略空白字符' },
  { key: 'ignoreCase', label: '忽略大小写差异' },
  { key: 'ignoreComments', label: '忽略注释内容（// 和 #）' }
];

export const advancedRulesStorageKey = 'data-diff-visualizer-advanced-rules';
export const normalizationStorageKey = 'data-diff-visualizer-normalization';

export interface AdvancedRuleFormState {
  enabled: boolean;
  textIgnoredLineKeywords: string;
  textIgnoredRegexPatterns: string;
  jsonIgnoredFields: string;
  jsonIgnoredPaths: string;
  jsonIgnoreArrayOrder: boolean;
  tableIgnoredColumns: string;
  tableIgnoredRows: string;
  tableNumericToleranceEnabled: boolean;
  tableNumericTolerance: string;
}

export interface NormalizationFormState {
  enabled: boolean;
  ignoreJsonFieldOrder: boolean;
  ignoredJsonFields: string;
  emptyValuesEquivalent: boolean;
  numericToleranceEnabled: boolean;
  numericTolerance: string;
  normalizeDateFormat: boolean;
  tablePrimaryKeyColumns: string;
}

export const defaultAdvancedRuleFormState: AdvancedRuleFormState = {
  enabled: false,
  textIgnoredLineKeywords: '',
  textIgnoredRegexPatterns: '',
  jsonIgnoredFields: 'timestamp, updatedAt, createTime',
  jsonIgnoredPaths: '',
  jsonIgnoreArrayOrder: false,
  tableIgnoredColumns: '',
  tableIgnoredRows: '',
  tableNumericToleranceEnabled: false,
  tableNumericTolerance: '0.01'
};

export const defaultNormalizationFormState: NormalizationFormState = {
  enabled: false,
  ignoreJsonFieldOrder: true,
  ignoredJsonFields: 'timestamp, updatedAt, createTime',
  emptyValuesEquivalent: false,
  numericToleranceEnabled: false,
  numericTolerance: '0.01',
  normalizeDateFormat: false,
  tablePrimaryKeyColumns: ''
};

export function loadAdvancedRuleFormState() {
  if (typeof window === 'undefined') {
    return defaultAdvancedRuleFormState;
  }

  try {
    const storedValue = window.localStorage.getItem(advancedRulesStorageKey);

    if (!storedValue) {
      return defaultAdvancedRuleFormState;
    }

    return {
      ...defaultAdvancedRuleFormState,
      ...(JSON.parse(storedValue) as Partial<AdvancedRuleFormState>)
    };
  } catch {
    return defaultAdvancedRuleFormState;
  }
}

export function loadNormalizationFormState() {
  if (typeof window === 'undefined') {
    return defaultNormalizationFormState;
  }

  try {
    const storedValue = window.localStorage.getItem(normalizationStorageKey);

    if (!storedValue) {
      return defaultNormalizationFormState;
    }

    return {
      ...defaultNormalizationFormState,
      ...(JSON.parse(storedValue) as Partial<NormalizationFormState>)
    };
  } catch {
    return defaultNormalizationFormState;
  }
}

export function CompareInputForm({
  advancedRules,
  filters,
  normalization,
  requestFileType,
  submitting,
  onAdvancedRulesChange,
  onFilterChange,
  onNormalizationChange,
  onRequestFileTypeChange,
  onSubmit
}: CompareInputFormProps) {
  function updateAdvancedRules(nextState: Partial<AdvancedRuleFormState>) {
    onAdvancedRulesChange(nextState);
  }

  function updateNormalization(nextState: Partial<NormalizationFormState>) {
    onNormalizationChange(nextState);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(advancedRulesStorageKey, JSON.stringify(advancedRules));
      window.localStorage.setItem(normalizationStorageKey, JSON.stringify(normalization));
    }
    onSubmit(new FormData(event.currentTarget));
  }

  return (
    <form className="compare-form" onSubmit={handleSubmit}>
      <section className="filter-panel compare-config-panel">
        <div className="panel-title">
          <div>
            <h2>输入配置</h2>
            <p>选择识别方式后，上传文件或粘贴内容均可参与对比。</p>
          </div>
        </div>
        <label>
          文件类型
          <select
            name="fileType"
            onChange={(event) => onRequestFileTypeChange(event.currentTarget.value as RequestFileType)}
            value={requestFileType}
          >
            <option value="auto">自动识别</option>
            <option value="text">纯文本</option>
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
            <option value="excel">Excel（.xlsx）</option>
          </select>
        </label>
      </section>

      <div className="compare-input-grid">
        <section className="input-panel input-panel-left">
          <div className="panel-title compact">
            <h2>左侧数据</h2>
            <span>原始版本</span>
          </div>
          <label>
            左侧文件
            <input
              accept=".txt,.json,.csv,.xlsx,text/plain,application/json,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              name="leftFile"
              type="file"
            />
          </label>
          <label>
            左侧文本
            <textarea name="leftText" placeholder="粘贴左侧文本，或仅上传左侧文件" rows={10} />
          </label>
        </section>

        <section className="input-panel input-panel-right">
          <div className="panel-title compact">
            <h2>右侧数据</h2>
            <span>目标版本</span>
          </div>
          <label>
            右侧文件
            <input
              accept=".txt,.json,.csv,.xlsx,text/plain,application/json,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              name="rightFile"
              type="file"
            />
          </label>
          <label>
            右侧文本
            <textarea name="rightText" placeholder="粘贴右侧文本，或仅上传右侧文件" rows={10} />
          </label>
        </section>
      </div>

      <section className="filter-panel">
        <div className="panel-title">
          <div>
            <h2>文本过滤配置</h2>
            <p>过滤规则仅影响文本类内容，适合减少格式噪声。</p>
          </div>
        </div>
        <div className="filter-options">
          {filterControls.map((filter) => (
            <label className="check-row" key={filter.key}>
              <input
                checked={filters[filter.key]}
                name={filter.key}
                onChange={(event) => onFilterChange(filter.key, event.currentTarget.checked)}
                type="checkbox"
                value="true"
              />
              {filter.label}
            </label>
          ))}
        </div>
      </section>

      <section className="filter-panel normalization-panel">
        <div className="panel-title">
          <div>
            <h2>归一化设置</h2>
            <p>在正式 diff 前对 JSON、CSV、Excel 执行规则型预处理，减少结构化数据中的噪声差异。</p>
          </div>
          <label className="switch-row">
            <input
              checked={normalization.enabled}
              name="normalizationEnabled"
              onChange={(event) => updateNormalization({ enabled: event.currentTarget.checked })}
              type="checkbox"
              value="true"
            />
            启用
          </label>
        </div>

        <div className="normalization-grid">
          <div className="normalization-group">
            <strong>JSON 规则</strong>
            <label className="check-row">
              <input
                checked={normalization.ignoreJsonFieldOrder}
                name="ignoreJsonFieldOrder"
                onChange={(event) => updateNormalization({ ignoreJsonFieldOrder: event.currentTarget.checked })}
                type="checkbox"
                value="true"
              />
              忽略字段顺序
            </label>
            <label className="check-row">
              <input
                checked={normalization.emptyValuesEquivalent}
                name="emptyValuesEquivalent"
                onChange={(event) => updateNormalization({ emptyValuesEquivalent: event.currentTarget.checked })}
                type="checkbox"
                value="true"
              />
              null、空字符串、undefined 视为等价
            </label>
            <label className="check-row">
              <input
                checked={normalization.normalizeDateFormat}
                name="normalizeDateFormat"
                onChange={(event) => updateNormalization({ normalizeDateFormat: event.currentTarget.checked })}
                type="checkbox"
                value="true"
              />
              日期格式归一化
            </label>
            <label>
              忽略字段
              <input
                name="ignoredJsonFields"
                onChange={(event) => updateNormalization({ ignoredJsonFields: event.currentTarget.value })}
                placeholder="timestamp, updatedAt, createTime"
                value={normalization.ignoredJsonFields}
              />
            </label>
            <div className="inline-field-grid">
              <label className="check-row">
                <input
                  checked={normalization.numericToleranceEnabled}
                  name="numericToleranceEnabled"
                  onChange={(event) =>
                    updateNormalization({ numericToleranceEnabled: event.currentTarget.checked })
                  }
                  type="checkbox"
                  value="true"
                />
                启用数值容差
              </label>
              <label>
                容差
                <input
                  min="0"
                  name="numericTolerance"
                  onChange={(event) => updateNormalization({ numericTolerance: event.currentTarget.value })}
                  step="0.001"
                  type="number"
                  value={normalization.numericTolerance}
                />
              </label>
            </div>
          </div>

          <div className="normalization-group">
            <strong>CSV / Excel 规则</strong>
            <label>
              主键列
              <input
                name="tablePrimaryKeyColumns"
                onChange={(event) => updateNormalization({ tablePrimaryKeyColumns: event.currentTarget.value })}
                placeholder="id, userId 或 A"
                value={normalization.tablePrimaryKeyColumns}
              />
            </label>
            <p>
              填写后将按主键值对齐数据行，行顺序变化会作为归一化忽略项记录。
            </p>
          </div>
        </div>
      </section>

      <section className="filter-panel advanced-rules-panel">
        <div className="panel-title">
          <div>
            <h2>高级过滤规则</h2>
            <p>保存最近一次配置。规则按文件类型生效，不适用的规则会被后端忽略。</p>
          </div>
          <label className="switch-row">
            <input
              checked={advancedRules.enabled}
              name="advancedRulesEnabled"
              onChange={(event) => updateAdvancedRules({ enabled: event.currentTarget.checked })}
              type="checkbox"
              value="true"
            />
            启用
          </label>
        </div>

        <div className="advanced-rules-grid">
          <div className="normalization-group">
            <strong>Text 专用</strong>
            <label>
              忽略行关键词
              <input
                name="textIgnoredLineKeywords"
                onChange={(event) => updateAdvancedRules({ textIgnoredLineKeywords: event.currentTarget.value })}
                placeholder="debug, trace, generated"
                value={advancedRules.textIgnoredLineKeywords}
              />
            </label>
            <label>
              忽略正则内容
              <textarea
                className="compact-textarea"
                name="textIgnoredRegexPatterns"
                onChange={(event) => updateAdvancedRules({ textIgnoredRegexPatterns: event.currentTarget.value })}
                placeholder={'version=\\d+\nrequestId=[a-z0-9-]+'}
                rows={3}
                value={advancedRules.textIgnoredRegexPatterns}
              />
            </label>
            <p>仅文本对比生效；JSON、CSV、Excel 不使用文本行规则。</p>
          </div>

          <div className="normalization-group">
            <strong>JSON 专用</strong>
            <label>
              忽略字段
              <input
                name="advancedJsonIgnoredFields"
                onChange={(event) => updateAdvancedRules({ jsonIgnoredFields: event.currentTarget.value })}
                placeholder="timestamp, updatedAt"
                value={advancedRules.jsonIgnoredFields}
              />
            </label>
            <label>
              忽略路径
              <input
                name="advancedJsonIgnoredPaths"
                onChange={(event) => updateAdvancedRules({ jsonIgnoredPaths: event.currentTarget.value })}
                placeholder="user.profile.lastLogin, $.meta.traceId"
                value={advancedRules.jsonIgnoredPaths}
              />
            </label>
            <label className="check-row">
              <input
                checked={advancedRules.jsonIgnoreArrayOrder}
                name="advancedJsonIgnoreArrayOrder"
                onChange={(event) => updateAdvancedRules({ jsonIgnoreArrayOrder: event.currentTarget.checked })}
                type="checkbox"
                value="true"
              />
              忽略数组顺序
            </label>
            <p>仅 JSON 对比生效；数组顺序规则适合元素内容可直接排序比较的数组。</p>
          </div>

          <div className="normalization-group">
            <strong>CSV / Excel 专用</strong>
            <label>
              忽略列
              <input
                name="advancedTableIgnoredColumns"
                onChange={(event) => updateAdvancedRules({ tableIgnoredColumns: event.currentTarget.value })}
                placeholder="updatedAt, C, 4"
                value={advancedRules.tableIgnoredColumns}
              />
            </label>
            <label>
              忽略行
              <input
                name="advancedTableIgnoredRows"
                onChange={(event) => updateAdvancedRules({ tableIgnoredRows: event.currentTarget.value })}
                placeholder="1, 5, 12"
                value={advancedRules.tableIgnoredRows}
              />
            </label>
            <div className="inline-field-grid">
              <label className="check-row">
                <input
                  checked={advancedRules.tableNumericToleranceEnabled}
                  name="advancedTableNumericToleranceEnabled"
                  onChange={(event) =>
                    updateAdvancedRules({ tableNumericToleranceEnabled: event.currentTarget.checked })
                  }
                  type="checkbox"
                  value="true"
                />
                启用数值误差
              </label>
              <label>
                误差范围
                <input
                  min="0"
                  name="advancedTableNumericTolerance"
                  onChange={(event) => updateAdvancedRules({ tableNumericTolerance: event.currentTarget.value })}
                  step="0.001"
                  type="number"
                  value={advancedRules.tableNumericTolerance}
                />
              </label>
            </div>
            <p>仅 CSV/Excel 生效；列可填表头名、列字母或列序号，行号从 1 开始。</p>
          </div>
        </div>
      </section>

      <div className="form-actions">
        <button className="primary-button" disabled={submitting} type="submit">
          {submitting ? '对比中' : '开始对比'}
        </button>
        <span>对比完成后将自动保存到当前账号历史记录。</span>
      </div>
    </form>
  );
}
