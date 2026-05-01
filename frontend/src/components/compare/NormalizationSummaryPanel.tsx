import type { AppliedNormalizationInfo } from '../../types/api';

interface NormalizationSummaryPanelProps {
  normalization?: AppliedNormalizationInfo;
}

export function NormalizationSummaryPanel({ normalization }: NormalizationSummaryPanelProps) {
  if (!normalization?.enabled) {
    return null;
  }

  return (
    <section className="normalization-summary-panel" aria-label="归一化处理结果">
      <div className="normalization-summary-heading">
        <div>
          <strong>归一化处理</strong>
          <span>已忽略 {normalization.ignoredDifferences.length} 项归一化差异</span>
        </div>
        <div className="filter-tags">
          {normalization.active.length > 0 ? (
            normalization.active.map((rule) => <strong key={rule.key}>{rule.label}</strong>)
          ) : (
            <em>未启用具体规则</em>
          )}
        </div>
      </div>

      {normalization.warnings.length > 0 && (
        <div className="normalization-warnings">
          {normalization.warnings.map((warning) => (
            <span key={warning}>{warning}</span>
          ))}
        </div>
      )}

      {normalization.ignoredDifferences.length > 0 && (
        <div className="ignored-diff-list">
          {normalization.ignoredDifferences.slice(0, 12).map((item, index) => (
            <article className="ignored-diff-item" key={`${item.rule}-${item.path}-${index}`}>
              <span>{item.label}</span>
              <code>{item.path}</code>
              <small>
                {item.leftValue ?? '-'} {'->'} {item.rightValue ?? '-'}
              </small>
              <em>{item.reason}</em>
            </article>
          ))}
          {normalization.ignoredDifferences.length > 12 && (
            <p>还有 {normalization.ignoredDifferences.length - 12} 项已忽略差异未在页面展开。</p>
          )}
        </div>
      )}
    </section>
  );
}
