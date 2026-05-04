import { useEffect, useState } from 'react';

import {
  defaultAdvancedRuleFormState,
  defaultNormalizationFormState,
  type AdvancedRuleFormState,
  type NormalizationFormState
} from '../components/compare/CompareInputForm';
import {
  applyThemePreference,
  normalizeAdvancedRulesForForm,
  normalizeFiltersForForm,
  normalizeNormalizationForForm
} from '../services/ruleState.service';
import {
  fetchUserSettings,
  resetUserSettings,
  updateUserSettings
} from '../services/userSettings.service';
import type { DiffFilterKey, DiffFilterOptions, RequestFileType, UserTheme } from '../types/api';

const defaultFilterOptions: DiffFilterOptions = {
  ignoreWhitespace: false,
  ignoreCase: false,
  ignoreComments: false
};

const filterControls: Array<{ key: DiffFilterKey; label: string }> = [
  { key: 'ignoreWhitespace', label: '忽略空白' },
  { key: 'ignoreCase', label: '忽略大小写' },
  { key: 'ignoreComments', label: '忽略注释' }
];

export function SettingsPage() {
  const [defaultFileType, setDefaultFileType] = useState<RequestFileType>('auto');
  const [filters, setFilters] = useState<DiffFilterOptions>(defaultFilterOptions);
  const [advancedRules, setAdvancedRules] = useState<AdvancedRuleFormState>(defaultAdvancedRuleFormState);
  const [normalization, setNormalization] =
    useState<NormalizationFormState>(defaultNormalizationFormState);
  const [theme, setTheme] = useState<UserTheme>('light');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUserSettings()
      .then((settings) => {
        setDefaultFileType(settings.defaultFileType);
        setFilters(normalizeFiltersForForm(settings.defaultFilters));
        setAdvancedRules(normalizeAdvancedRulesForForm(settings.defaultAdvancedRules));
        setNormalization(normalizeNormalizationForForm(settings.defaultNormalization));
        setTheme(settings.theme);
        applyThemePreference(settings.theme);
      })
      .catch((requestError: unknown) => {
        setError(requestError instanceof Error ? requestError.message : '个人设置加载失败');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  function updateFilter(key: DiffFilterKey, enabled: boolean) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [key]: enabled
    }));
  }

  function updateAdvancedRules(nextState: Partial<AdvancedRuleFormState>) {
    setAdvancedRules((currentState) => ({
      ...currentState,
      ...nextState
    }));
  }

  function updateNormalization(nextState: Partial<NormalizationFormState>) {
    setNormalization((currentState) => ({
      ...currentState,
      ...nextState
    }));
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    setNotice('');

    try {
      const settings = await updateUserSettings({
        defaultFileType,
        defaultFilters: filters,
        defaultAdvancedRules: advancedRules,
        defaultNormalization: normalization,
        theme
      });

      applyThemePreference(settings.theme);
      setNotice('个人默认设置已保存。');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '个人设置保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setSaving(true);
    setError('');
    setNotice('');

    try {
      const settings = await resetUserSettings();

      setDefaultFileType(settings.defaultFileType);
      setFilters(normalizeFiltersForForm(settings.defaultFilters));
      setAdvancedRules(normalizeAdvancedRulesForForm(settings.defaultAdvancedRules));
      setNormalization(normalizeNormalizationForForm(settings.defaultNormalization));
      setTheme(settings.theme);
      applyThemePreference(settings.theme);
      setNotice('个人默认设置已重置。');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '个人设置重置失败');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="page-stack">
      <header className="page-heading page-hero compact-hero">
        <div>
          <p className="eyebrow">Settings</p>
          <h1>个人设置</h1>
          <p className="page-subtitle">
            配置进入对比页面时自动加载的默认文件类型、规则组合和界面主题。
          </p>
        </div>
        <div className="history-count-card">
          <span className="meta-label">配置状态</span>
          <strong>{loading ? '...' : 'Ready'}</strong>
          <small>user_settings / 当前账号</small>
        </div>
      </header>

      {error && <section className="error-message">{error}</section>}
      {notice && <section className="success-message">{notice}</section>}

      {loading ? (
        <div className="empty-state">
          <strong>正在加载个人设置</strong>
          <span>系统会读取当前账号保存到 SQLite 的默认配置。</span>
        </div>
      ) : (
        <section className="settings-grid" aria-label="个人设置表单">
          <section className="filter-panel settings-panel">
            <div className="panel-title">
              <div>
                <h2>默认输入</h2>
                <p>进入对比页面时优先使用这些默认配置。</p>
              </div>
            </div>
            <label>
              默认文件类型
              <select
                onChange={(event) => setDefaultFileType(event.currentTarget.value as RequestFileType)}
                value={defaultFileType}
              >
                <option value="auto">自动识别</option>
                <option value="text">纯文本</option>
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
                <option value="excel">Excel</option>
              </select>
            </label>
            <label>
              主题
              <select
                onChange={(event) => {
                  const nextTheme = event.currentTarget.value as UserTheme;
                  setTheme(nextTheme);
                  applyThemePreference(nextTheme);
                }}
                value={theme}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
          </section>

          <section className="filter-panel settings-panel">
            <div className="panel-title">
              <div>
                <h2>默认基础过滤</h2>
                <p>适合处理格式噪声和文本注释。</p>
              </div>
            </div>
            <div className="filter-options">
              {filterControls.map((filter) => (
                <label className="check-row" key={filter.key}>
                  <input
                    checked={filters[filter.key]}
                    onChange={(event) => updateFilter(filter.key, event.currentTarget.checked)}
                    type="checkbox"
                  />
                  {filter.label}
                </label>
              ))}
            </div>
          </section>

          <section className="filter-panel settings-panel normalization-panel">
            <div className="panel-title">
              <div>
                <h2>默认归一化</h2>
                <p>用于 JSON、CSV、Excel 的结构化预处理。</p>
              </div>
              <label className="switch-row">
                <input
                  checked={normalization.enabled}
                  onChange={(event) => updateNormalization({ enabled: event.currentTarget.checked })}
                  type="checkbox"
                />
                启用
              </label>
            </div>
            <div className="settings-rule-grid">
              <label className="check-row">
                <input
                  checked={normalization.ignoreJsonFieldOrder}
                  onChange={(event) =>
                    updateNormalization({ ignoreJsonFieldOrder: event.currentTarget.checked })
                  }
                  type="checkbox"
                />
                忽略 JSON 字段顺序
              </label>
              <label className="check-row">
                <input
                  checked={normalization.normalizeDateFormat}
                  onChange={(event) =>
                    updateNormalization({ normalizeDateFormat: event.currentTarget.checked })
                  }
                  type="checkbox"
                />
                日期归一化
              </label>
              <div className="inline-field-grid">
                <label className="check-row">
                  <input
                    checked={normalization.numericToleranceEnabled}
                    onChange={(event) =>
                      updateNormalization({ numericToleranceEnabled: event.currentTarget.checked })
                    }
                    type="checkbox"
                  />
                  数值容差
                </label>
                <label>
                  容差
                  <input
                    min="0"
                    onChange={(event) => updateNormalization({ numericTolerance: event.currentTarget.value })}
                    step="0.001"
                    type="number"
                    value={normalization.numericTolerance}
                  />
                </label>
              </div>
              <label>
                主键列
                <input
                  onChange={(event) =>
                    updateNormalization({ tablePrimaryKeyColumns: event.currentTarget.value })
                  }
                  placeholder="id, userId 或 A"
                  value={normalization.tablePrimaryKeyColumns}
                />
              </label>
            </div>
          </section>

          <section className="filter-panel settings-panel advanced-rules-panel">
            <div className="panel-title">
              <div>
                <h2>默认高级规则</h2>
                <p>保存常用的行、字段和表格列忽略规则。</p>
              </div>
              <label className="switch-row">
                <input
                  checked={advancedRules.enabled}
                  onChange={(event) => updateAdvancedRules({ enabled: event.currentTarget.checked })}
                  type="checkbox"
                />
                启用
              </label>
            </div>
            <div className="settings-rule-grid">
              <label>
                忽略文本关键词
                <input
                  onChange={(event) =>
                    updateAdvancedRules({ textIgnoredLineKeywords: event.currentTarget.value })
                  }
                  placeholder="debug, trace"
                  value={advancedRules.textIgnoredLineKeywords}
                />
              </label>
              <label>
                忽略 JSON 字段
                <input
                  onChange={(event) => updateAdvancedRules({ jsonIgnoredFields: event.currentTarget.value })}
                  placeholder="updatedAt, timestamp"
                  value={advancedRules.jsonIgnoredFields}
                />
              </label>
              <label>
                忽略表格列
                <input
                  onChange={(event) => updateAdvancedRules({ tableIgnoredColumns: event.currentTarget.value })}
                  placeholder="备注, updatedAt, C"
                  value={advancedRules.tableIgnoredColumns}
                />
              </label>
            </div>
          </section>

          <section className="settings-actions">
            <button className="primary-button" disabled={saving} onClick={() => void handleSave()} type="button">
              {saving ? '保存中' : '保存个人设置'}
            </button>
            <button className="secondary-button" disabled={saving} onClick={() => void handleReset()} type="button">
              重置默认设置
            </button>
          </section>
        </section>
      )}
    </section>
  );
}
