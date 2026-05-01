import type { DiffFilterOptions, DiffFilterKey } from '../../types/api';

const filterDefinitions: Array<{ key: DiffFilterKey; label: string }> = [
  { key: 'ignoreWhitespace', label: '忽略空白字符' },
  { key: 'ignoreCase', label: '忽略大小写差异' },
  { key: 'ignoreComments', label: '忽略注释内容' }
];

interface ActiveFiltersPanelProps {
  filters: DiffFilterOptions;
}

export function ActiveFiltersPanel({ filters }: ActiveFiltersPanelProps) {
  const activeFilters = filterDefinitions.filter((definition) => filters[definition.key]);

  return (
    <section className="active-filters">
      <span>当前启用的文本过滤规则</span>
      <div className="filter-tags">
        {activeFilters.length > 0 ? (
          activeFilters.map((filter) => <strong key={filter.key}>{filter.label}</strong>)
        ) : (
          <em>未启用</em>
        )}
      </div>
    </section>
  );
}
