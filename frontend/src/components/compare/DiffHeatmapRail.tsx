import type { HeatmapMarker } from './diffDensity';

interface DiffHeatmapRailProps {
  activeDiffId: string | null;
  markers: HeatmapMarker[];
  onJump: (diffId: string) => void;
}

export function DiffHeatmapRail({ activeDiffId, markers, onJump }: DiffHeatmapRailProps) {
  if (markers.length === 0) {
    return (
      <aside className="diff-heatmap-rail empty" aria-label="文本差异分布热力图">
        <span>分布</span>
      </aside>
    );
  }

  return (
    <aside className="diff-heatmap-rail" aria-label="文本差异分布热力图">
      <span>分布</span>
      <div className="heatmap-track">
        {markers.map((marker) => (
          <button
            aria-label={`跳转到 ${marker.label}`}
            className={`heatmap-marker ${marker.type}${marker.diffId === activeDiffId ? ' active' : ''}`}
            key={marker.diffId}
            onClick={() => onJump(marker.diffId)}
            style={{ top: `${Math.min(98, Math.max(0, marker.position * 100))}%` }}
            title={marker.label}
            type="button"
          />
        ))}
      </div>
    </aside>
  );
}
