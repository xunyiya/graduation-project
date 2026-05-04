import { useEffect, useState } from 'react';

import type { DiffAnnotation, DiffAnnotationTag } from '../../types/api';
import type { DiffListEntry } from './diffNavigation';

interface DiffAnnotationPanelProps {
  annotation: DiffAnnotation | null;
  diff: DiffListEntry | null;
  disabled: boolean;
  saving: boolean;
  onCancel: () => void;
  onSave: (input: { note: string; tag: DiffAnnotationTag | null; resolved: boolean }) => void;
}

const annotationTags: DiffAnnotationTag[] = ['待复查', '已确认', '正常变化', '异常变化'];

function formatValue(value: string | null) {
  return value === null || value === '' ? '-' : value;
}

export function DiffAnnotationPanel({
  annotation,
  diff,
  disabled,
  saving,
  onCancel,
  onSave
}: DiffAnnotationPanelProps) {
  const [note, setNote] = useState('');
  const [tag, setTag] = useState<DiffAnnotationTag | ''>('');
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    setNote(annotation?.note ?? '');
    setTag(annotation?.tag ?? '');
    setResolved(annotation?.resolved ?? false);
  }, [annotation, diff?.diffId]);

  if (!diff) {
    return null;
  }

  return (
    <section className="annotation-panel" aria-label="差异备注">
      <div className="annotation-heading">
        <div>
          <span className="eyebrow">Annotation</span>
          <h2>差异备注</h2>
        </div>
        <button onClick={onCancel} type="button">
          关闭
        </button>
      </div>

      <div className="annotation-diff-grid">
        <span>差异 ID</span>
        <code>{diff.diffId}</code>
        <span>差异路径</span>
        <code>{diff.path}</code>
        <span>原值</span>
        <code>{formatValue(diff.leftValue)}</code>
        <span>新值</span>
        <code>{formatValue(diff.rightValue)}</code>
      </div>

      {disabled && (
        <div className="performance-notice">
          <span>当前结果未关联对比任务，暂时不能保存备注。</span>
        </div>
      )}

      <label>
        备注
        <textarea
          className="annotation-note"
          disabled={disabled}
          onChange={(event) => setNote(event.currentTarget.value)}
          placeholder="记录确认结果、复查说明或处理意见"
          rows={4}
          value={note}
        />
      </label>

      <div className="annotation-form-row">
        <label>
          标签
          <select
            disabled={disabled}
            onChange={(event) => setTag(event.currentTarget.value as DiffAnnotationTag | '')}
            value={tag}
          >
            <option value="">不设置</option>
            {annotationTags.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="check-row">
          <input
            checked={resolved}
            disabled={disabled}
            onChange={(event) => setResolved(event.currentTarget.checked)}
            type="checkbox"
          />
          已处理
        </label>
      </div>

      <div className="annotation-actions">
        <button
          className="primary-button"
          disabled={disabled || !note.trim() || saving}
          onClick={() => onSave({ note: note.trim(), tag: tag || null, resolved })}
          type="button"
        >
          {saving ? '保存中' : '保存备注'}
        </button>
      </div>
    </section>
  );
}
