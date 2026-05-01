import type { DiffLineItem, DiffLineSide, DiffLineType, InlineSegment } from '../../types/api';
import { DiffHeatmapRail } from './DiffHeatmapRail';
import { buildTextHeatmapMarkers } from './diffDensity';
import { getDiffDomId } from './diffNavigation';
import { VirtualList } from './VirtualList';

interface DiffResultViewerProps {
  activeDiffId: string | null;
  onJump: (diffId: string) => void;
  result: DiffLineItem[];
}

function getSideClass(type: DiffLineType, side: 'left' | 'right') {
  if (type === 'removed' && side === 'left') {
    return 'removed';
  }

  if (type === 'added' && side === 'right') {
    return 'added';
  }

  if (type === 'modified') {
    return 'modified';
  }

  return '';
}

function DiffCell({
  side,
  type,
  value
}: {
  side: 'left' | 'right';
  type: DiffLineType;
  value: DiffLineSide | null;
}) {
  return (
    <div className={`diff-cell ${getSideClass(type, side)}`}>
      <span className="line-number">{value?.lineNumber ?? ''}</span>
      <code>{value ? renderSegments(value.segments) : ''}</code>
    </div>
  );
}

function renderSegments(segments: InlineSegment[]) {
  return segments.map((segment, index) =>
    segment.type === 'changed' ? (
      <mark className="inline-diff" key={`${segment.type}-${index}`}>
        {segment.text}
      </mark>
    ) : (
      <span key={`${segment.type}-${index}`}>{segment.text}</span>
    )
  );
}

export function DiffResultViewer({ activeDiffId, onJump, result }: DiffResultViewerProps) {
  const activeIndex = result.findIndex((row) => row.meta.diffId === activeDiffId);
  const heatmapMarkers = buildTextHeatmapMarkers(result);

  if (result.length === 0) {
    return (
      <section className="empty-state">
        <strong>暂无差异结果</strong>
        <span>提交两段文本或两个文本文件后，这里会显示逐行对比结果。</span>
      </section>
    );
  }

  return (
    <section className="diff-viewer" aria-label="左右分栏差异结果">
      <div className="diff-viewer-layout">
        <div className="diff-main-region">
          <div className="diff-header">
            <span>左侧</span>
            <span>右侧</span>
          </div>
          <VirtualList
            activeIndex={activeIndex}
            ariaLabel="文本差异虚拟滚动区域"
            className="diff-body"
            getKey={(row) => row.meta.diffId}
            height={620}
            itemHeight={42}
            items={result}
            renderItem={(row) => (
              <div
                className={`diff-row ${row.type}${row.meta.diffId === activeDiffId ? ' active-target' : ''}`}
                id={getDiffDomId(row.meta.diffId)}
              >
                <DiffCell side="left" type={row.type} value={row.left} />
                <DiffCell side="right" type={row.type} value={row.right} />
              </div>
            )}
          />
        </div>
        <DiffHeatmapRail activeDiffId={activeDiffId} markers={heatmapMarkers} onJump={onJump} />
      </div>
    </section>
  );
}
