import { useState } from 'react';

import type { FilterPreset, RequestFileType } from '../../types/api';

interface FilterPresetManagerProps {
  busyPresetId: string | null;
  presets: FilterPreset[];
  onDelete: (presetId: string) => void;
  onSetDefault: (presetId: string) => void;
  onUpdate: (
    presetId: string,
    input: {
      name: string;
      description: string | null;
      fileType: RequestFileType;
    }
  ) => void;
}

const fileTypeLabels: Record<RequestFileType, string> = {
  auto: '自动',
  text: '文本',
  json: 'JSON',
  csv: 'CSV',
  excel: 'Excel'
};

export function FilterPresetManager({
  busyPresetId,
  presets,
  onDelete,
  onSetDefault,
  onUpdate
}: FilterPresetManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editFileType, setEditFileType] = useState<RequestFileType>('auto');

  function startEdit(preset: FilterPreset) {
    setEditingId(preset.id);
    setEditName(preset.name);
    setEditDescription(preset.description ?? '');
    setEditFileType(preset.fileType);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName('');
    setEditDescription('');
    setEditFileType('auto');
  }

  function submitEdit() {
    if (!editingId || !editName.trim()) {
      return;
    }

    onUpdate(editingId, {
      name: editName.trim(),
      description: editDescription.trim() || null,
      fileType: editFileType
    });
    cancelEdit();
  }

  return (
    <section className="filter-preset-manager" aria-label="规则预设管理">
      <div className="section-heading">
        <span className="eyebrow">Preset Manager</span>
        <h2>规则预设管理</h2>
      </div>

      {editingId && (
        <div className="preset-edit-row">
          <label>
            名称
            <input onChange={(event) => setEditName(event.currentTarget.value)} value={editName} />
          </label>
          <label>
            文件类型
            <select
              onChange={(event) => setEditFileType(event.currentTarget.value as RequestFileType)}
              value={editFileType}
            >
              <option value="auto">自动</option>
              <option value="text">文本</option>
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
              <option value="excel">Excel</option>
            </select>
          </label>
          <label>
            描述
            <input
              onChange={(event) => setEditDescription(event.currentTarget.value)}
              value={editDescription}
            />
          </label>
          <div className="preset-actions">
            <button disabled={busyPresetId === editingId} onClick={submitEdit} type="button">
              保存编辑
            </button>
            <button onClick={cancelEdit} type="button">
              取消
            </button>
          </div>
        </div>
      )}

      {presets.length === 0 ? (
        <div className="preset-empty">
          <strong>暂无规则预设</strong>
          <span>保存当前规则后，可在这里管理名称、默认状态和删除操作。</span>
        </div>
      ) : (
        <div className="preset-list">
          {presets.map((preset) => (
            <article className="preset-item" key={preset.id}>
              <div className="preset-main">
                <strong>
                  {preset.name}
                  {preset.isDefault ? <em>默认</em> : null}
                </strong>
                <span>
                  {fileTypeLabels[preset.fileType]} · {preset.description || '无描述'}
                </span>
              </div>
              <div className="preset-actions">
                <button disabled={busyPresetId === preset.id} onClick={() => startEdit(preset)} type="button">
                  编辑
                </button>
                <button
                  disabled={busyPresetId === preset.id || preset.isDefault}
                  onClick={() => onSetDefault(preset.id)}
                  type="button"
                >
                  设为默认
                </button>
                <button
                  className="danger-button"
                  disabled={busyPresetId === preset.id}
                  onClick={() => onDelete(preset.id)}
                  type="button"
                >
                  删除
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
