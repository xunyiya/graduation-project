import type { DiffPerformanceInfo } from '../../types/api';

interface PerformanceNoticeProps {
  performance: DiffPerformanceInfo;
}

export function PerformanceNotice({ performance }: PerformanceNoticeProps) {
  if (!performance.resultTruncated && performance.warnings.length === 0) {
    return null;
  }

  return (
    <section className="performance-notice">
      <strong>性能模式：{performance.algorithm}</strong>
      <span>
        已返回 {performance.resultCount} 条结果，上限 {performance.resultLimit}
        {performance.resultTruncated ? '，结果已截断' : ''}
      </span>
      {performance.warnings.map((warning) => (
        <small key={warning}>{warning}</small>
      ))}
    </section>
  );
}
