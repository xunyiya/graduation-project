import type { FilterPreset } from '../../types/api';

interface FilterPresetPanelProps {
  description: string;
  loading: boolean;
  name: string;
  presets: FilterPreset[];
  saving: boolean;
  selectedPresetId: string;
  showManager: boolean;
  onApply: () => void;
  onDescriptionChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onSave: () => void;
  onSelectedPresetIdChange: (value: string) => void;
  onToggleManager: () => void;
}

const fileTypeLabels = {
  auto: '自动',
  text: '文本',
  json: 'JSON',
  csv: 'CSV',
  excel: 'Excel'
};

export function FilterPresetPanel({
  description,
  loading,
  name,
  presets,
  saving,
  selectedPresetId,
  showManager,
  onApply,
  onDescriptionChange,
  onNameChange,
  onSave,
  onSelectedPresetIdChange,
  onToggleManager
}: FilterPresetPanelProps) {
  return (
    <section className="filter-panel filter-preset-panel">
      <div className="panel-title">
        <div>
          <h2>规则预设</h2>
          <p>保存常用过滤、高级规则和归一化配置，下次对比时可一键应用。</p>
        </div>
        <button className="secondary-button inline-button" onClick={onToggleManager} type="button">
          {showManager ? '收起管理' : '管理预设'}
        </button>
      </div>

      <div className="preset-toolbar">
        <label>
          选择预设
          <select
            disabled={loading || presets.length === 0}
            onChange={(event) => onSelectedPresetIdChange(event.currentTarget.value)}
            value={selectedPresetId}
          >
            <option value="">{loading ? '正在加载预设' : '请选择预设'}</option>
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name} · {fileTypeLabels[preset.fileType]}{preset.isDefault ? ' · 默认' : ''}
              </option>
            ))}
          </select>
        </label>
        <button disabled={!selectedPresetId} onClick={onApply} type="button">
          应用预设
        </button>
      </div>

      <div className="preset-save-grid">
        <label>
          预设名称
          <input
            onChange={(event) => onNameChange(event.currentTarget.value)}
            placeholder="例如：忽略日志 debug 行"
            value={name}
          />
        </label>
        <label>
          描述
          <input
            onChange={(event) => onDescriptionChange(event.currentTarget.value)}
            placeholder="可选，说明适用场景"
            value={description}
          />
        </label>
        <button disabled={!name.trim() || saving} onClick={onSave} type="button">
          {saving ? '保存中' : '保存当前规则为预设'}
        </button>
      </div>
    </section>
  );
}
