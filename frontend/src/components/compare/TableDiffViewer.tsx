import type { DiffLineType, TableDiffItem } from '../../types/api';
import { collectTableDensityRegions, getTableRowDensityClass } from './diffDensity';
import { getDiffDomId } from './diffNavigation';
import { VirtualList } from './VirtualList';

interface TableDiffViewerProps {
  activeDiffId: string | null;
  onJump: (diffId: string) => void;
  result: TableDiffItem[];
}

const diffLabels: Record<DiffLineType, string> = {
  unchanged: '无变化',
  added: '新增',
  removed: '删除',
  modified: '修改'
};

function formatNullableValue(value: string | number | null) {
  return value === null || value === '' ? '-' : value;
}

export function TableDiffViewer({ activeDiffId, onJump, result }: TableDiffViewerProps) {
  const activeIndex = result.findIndex((item) => item.meta.diffId === activeDiffId);
  const densityRegions = collectTableDensityRegions(result).slice(0, 6);

  if (result.length === 0) {
    return (
      <section className="empty-state">
        <strong>暂无表格差异</strong>
        <span>CSV/Excel 内容一致，或尚未提交表格文件。</span>
      </section>
    );
  }

  return (
    <section className="table-diff-viewer" aria-label="表格差异结果">
      <div className="table-diff-header">
        <strong>表格差异视图</strong>
      </div>

      {densityRegions.length > 0 && (
        <div className="table-density-map" aria-label="表格差异密集区域">
          <span>密集区域</span>
          <div>
            {densityRegions.map((region) => (
              <button
                className={region.diffId === activeDiffId ? 'active' : ''}
                key={`${region.label}-${region.diffId}`}
                onClick={() => onJump(region.diffId)}
                type="button"
              >
                <strong>{region.count}</strong>
                <span>{region.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="table-diff-grid header">
        <span>差异</span>
        <span>范围</span>
        <span>工作表</span>
        <span>行</span>
        <span>列</span>
        <span>位置</span>
        <span>原值</span>
        <span>新值</span>
      </div>
      <VirtualList
        activeIndex={activeIndex}
        ariaLabel="表格差异虚拟滚动区域"
        className="table-diff-scroll"
        getKey={(item) => item.meta.diffId}
        height={680}
        itemHeight={46}
        items={result}
        renderItem={(item) => (
          <div
            className={`table-diff-grid ${item.type} ${getTableRowDensityClass(item, result)}${
              item.meta.diffId === activeDiffId ? ' active-target' : ''
            }`}
            id={getDiffDomId(item.meta.diffId)}
          >
            <span>{diffLabels[item.type]}</span>
            <span>{item.scope === 'sheet' ? '工作表' : '单元格'}</span>
            <span>{item.sheetName ?? '-'}</span>
            <span>{formatNullableValue(item.rowNumber)}</span>
            <span>{formatNullableValue(item.columnName)}</span>
            <code>{item.path}</code>
            <code>{formatNullableValue(item.leftValue)}</code>
            <code>{formatNullableValue(item.rightValue)}</code>
          </div>
        )}
      />
    </section>
  );
}
