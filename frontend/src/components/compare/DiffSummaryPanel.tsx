import type { DiffSummary, FileType } from '../../types/api';
import type { DensityRegion } from './diffDensity';

interface DiffSummaryPanelProps {
  activeIndex: number;
  denseRegion: DensityRegion | null;
  diffCount: number;
  fileType: FileType;
  onJump: (diffId: string) => void;
  summary: DiffSummary;
}

const summaryItems = [
  { key: 'total', label: '总数' },
  { key: 'added', label: '新增' },
  { key: 'removed', label: '删除' },
  { key: 'modified', label: '修改' }
] as const;

const fileTypeLabels: Record<FileType, string> = {
  text: '文本',
  json: 'JSON',
  csv: 'CSV',
  excel: 'Excel'
};

export function DiffSummaryPanel({
  activeIndex,
  denseRegion,
  diffCount,
  fileType,
  onJump,
  summary
}: DiffSummaryPanelProps) {
  return (
    <section className="summary-panel" aria-label="差异统计">
      <div className="summary-heading">
        <strong>{fileTypeLabels[fileType]} 差异统计</strong>
        <span>
          {diffCount === 0 || activeIndex < 0 ? '未定位差异' : `当前第 ${activeIndex + 1} / ${diffCount} 项`}
        </span>
      </div>
      <div className="summary-grid">
        {summaryItems.map((item) => (
          <article className={`summary-card ${item.key}`} key={item.key}>
            <span>{item.label}</span>
            <strong>{summary[item.key]}</strong>
          </article>
        ))}
        <article className="summary-card dense">
          <span>最密集区域</span>
          {denseRegion ? (
            <button onClick={() => onJump(denseRegion.diffId)} type="button">
              <strong>{denseRegion.count}</strong>
              <small>{denseRegion.label}</small>
              <em>{denseRegion.detail}</em>
            </button>
          ) : (
            <>
              <strong>0</strong>
              <small>暂无集中差异</small>
            </>
          )}
        </article>
      </div>
    </section>
  );
}
