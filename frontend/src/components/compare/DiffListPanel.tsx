import type { DiffLineType } from '../../types/api';
import type { DiffListEntry } from './diffNavigation';
import { VirtualList } from './VirtualList';

interface DiffListPanelProps {
  activeDiffId: string | null;
  entries: DiffListEntry[];
  onJump: (diffId: string) => void;
}

const typeLabels: Record<DiffLineType, string> = {
  unchanged: '无变化',
  added: '新增',
  removed: '删除',
  modified: '修改'
};

const kindLabels: Record<DiffListEntry['kind'], string> = {
  'text-line': '文本',
  'json-node': 'JSON',
  'table-diff': '表格'
};

function formatValue(value: string | null) {
  if (value === null || value === '') {
    return '-';
  }

  return value.length > 42 ? `${value.slice(0, 42)}...` : value;
}

export function DiffListPanel({ activeDiffId, entries, onJump }: DiffListPanelProps) {
  const activeIndex = entries.findIndex((entry) => entry.diffId === activeDiffId);

  function jumpByOffset(offset: number) {
    if (entries.length === 0) {
      return;
    }

    const startIndex = activeIndex >= 0 ? activeIndex : 0;
    const nextIndex = (startIndex + offset + entries.length) % entries.length;
    onJump(entries[nextIndex].diffId);
  }

  return (
    <section className="diff-list-panel" aria-label="差异列表">
      <div className="diff-list-toolbar">
        <div>
          <strong>差异列表</strong>
          <span>{entries.length} 项</span>
        </div>
        <div className="diff-jump-actions">
          <button disabled={entries.length === 0} onClick={() => jumpByOffset(-1)} type="button">
            上一个
          </button>
          <button disabled={entries.length === 0} onClick={() => jumpByOffset(1)} type="button">
            下一个
          </button>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="diff-list-empty">暂无差异项</div>
      ) : (
        <VirtualList
          activeIndex={activeIndex}
          ariaLabel="差异列表虚拟滚动区域"
          className="diff-list-body"
          getKey={(entry) => entry.diffId}
          height={300}
          itemHeight={84}
          items={entries}
          overscan={6}
          renderItem={(entry, index) => (
            <button
              className={`diff-list-item ${entry.type}${entry.diffId === activeDiffId ? ' active' : ''}`}
              onClick={() => onJump(entry.diffId)}
              type="button"
            >
              <span className="diff-list-index">{index + 1}</span>
              <span className="diff-list-main">
                <strong>{entry.label}</strong>
                <code>{entry.path}</code>
                <small>
                  {formatValue(entry.leftValue)} {'->'} {formatValue(entry.rightValue)}
                </small>
              </span>
              <span className="diff-list-badges">
                <em>{kindLabels[entry.kind]}</em>
                <em>{typeLabels[entry.type]}</em>
              </span>
            </button>
          )}
        />
      )}
    </section>
  );
}
