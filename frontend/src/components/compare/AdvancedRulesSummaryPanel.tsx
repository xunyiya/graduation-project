import type { AppliedAdvancedRulesInfo } from '../../types/api';

interface AdvancedRulesSummaryPanelProps {
  advancedRules?: AppliedAdvancedRulesInfo;
}

export function AdvancedRulesSummaryPanel({ advancedRules }: AdvancedRulesSummaryPanelProps) {
  if (!advancedRules?.enabled) {
    return null;
  }

  return (
    <section className="advanced-rules-summary-panel" aria-label="高级过滤规则处理结果">
      <div className="normalization-summary-heading">
        <div>
          <strong>高级过滤规则</strong>
          <span>已忽略 {advancedRules.ignoredDifferences.length} 项自定义规则差异</span>
        </div>
        <div className="filter-tags">
          {advancedRules.active.length > 0 ? (
            advancedRules.active.map((rule) => <strong key={rule.key}>{rule.label}</strong>)
          ) : (
            <em>未启用具体规则</em>
          )}
        </div>
      </div>

      {advancedRules.warnings.length > 0 && (
        <div className="normalization-warnings">
          {advancedRules.warnings.map((warning) => (
            <span key={warning}>{warning}</span>
          ))}
        </div>
      )}

      {advancedRules.ignoredDifferences.length > 0 && (
        <div className="ignored-diff-list">
          {advancedRules.ignoredDifferences.slice(0, 12).map((item, index) => (
            <article className="ignored-diff-item" key={`${item.rule}-${item.path}-${index}`}>
              <span>{item.label}</span>
              <code>{item.path}</code>
              <small>
                {item.leftValue ?? '-'} {'->'} {item.rightValue ?? '-'}
              </small>
              <em>{item.reason}</em>
            </article>
          ))}
          {advancedRules.ignoredDifferences.length > 12 && (
            <p>还有 {advancedRules.ignoredDifferences.length - 12} 项已忽略差异未在页面展开。</p>
          )}
        </div>
      )}
    </section>
  );
}
