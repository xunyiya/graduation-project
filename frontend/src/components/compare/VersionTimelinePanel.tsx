import type { VersionChainResponse, VersionIntervalCompare, VersionTrendDirection } from '../../types/api';

interface VersionTimelinePanelProps {
  activeIntervalId: string | null;
  response: VersionChainResponse;
  onSelectInterval: (intervalId: string) => void;
}

const trendLabels: Record<VersionTrendDirection, string> = {
  stable: '整体平稳',
  increasing: '差异递增',
  decreasing: '差异递减',
  mixed: '波动变化'
};

function getIntervalTone(interval: VersionIntervalCompare) {
  if (interval.summary.total === 0) {
    return 'stable';
  }

  if (interval.summary.removed > interval.summary.added && interval.summary.removed >= interval.summary.modified) {
    return 'removed';
  }

  if (interval.summary.added >= interval.summary.modified) {
    return 'added';
  }

  return 'modified';
}

export function VersionTimelinePanel({
  activeIntervalId,
  response,
  onSelectInterval
}: VersionTimelinePanelProps) {
  const { trend } = response;

  return (
    <section className="version-timeline-panel" aria-label="多版本对比时间线">
      <div className="version-trend-heading">
        <div>
          <strong>变化趋势摘要</strong>
          <span>
            {response.versions.length} 个版本，{trend.intervalCount} 个连续区间
          </span>
        </div>
        <em>{trendLabels[trend.direction]}</em>
      </div>

      <div className="version-trend-grid">
        <article>
          <span>累计差异</span>
          <strong>{trend.totalDifferences}</strong>
        </article>
        <article>
          <span>新增</span>
          <strong>{trend.added}</strong>
        </article>
        <article>
          <span>删除</span>
          <strong>{trend.removed}</strong>
        </article>
        <article>
          <span>修改</span>
          <strong>{trend.modified}</strong>
        </article>
        <article>
          <span>最密集区间</span>
          <strong>{trend.peakDifferenceCount}</strong>
          <small>{trend.peakIntervalLabel ?? '暂无差异'}</small>
        </article>
      </div>

      <div className="version-node-row" aria-label="版本序列">
        {response.versions.map((version, index) => (
          <div className="version-node" key={version.id}>
            <span>v{index + 1}</span>
            <strong>{version.label}</strong>
          </div>
        ))}
      </div>

      <div className="version-interval-list" aria-label="版本区间">
        {response.intervals.map((interval) => (
          <button
            className={`version-interval-card ${getIntervalTone(interval)}${
              interval.id === activeIntervalId ? ' active' : ''
            }`}
            key={interval.id}
            onClick={() => onSelectInterval(interval.id)}
            type="button"
          >
            <span>{interval.label}</span>
            <strong>{interval.summary.total}</strong>
            <small>
              +{interval.summary.added} / -{interval.summary.removed} / ~{interval.summary.modified}
            </small>
          </button>
        ))}
      </div>
    </section>
  );
}
