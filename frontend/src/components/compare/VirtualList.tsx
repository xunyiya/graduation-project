import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

interface VirtualListProps<T> {
  activeIndex?: number;
  ariaLabel?: string;
  className?: string;
  getKey: (item: T, index: number) => string | number;
  height: number;
  itemHeight: number;
  items: T[];
  overscan?: number;
  renderItem: (item: T, index: number) => ReactNode;
}

export function VirtualList<T>({
  activeIndex,
  ariaLabel,
  className,
  getKey,
  height,
  itemHeight,
  items,
  overscan = 8,
  renderItem
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(height / itemHeight) + overscan * 2;
  const endIndex = Math.min(items.length, startIndex + visibleCount);
  const visibleItems = useMemo(
    () => items.slice(startIndex, endIndex),
    [endIndex, items, startIndex]
  );

  useEffect(() => {
    if (activeIndex === undefined || activeIndex < 0 || !containerRef.current) {
      return;
    }

    const maxScrollTop = Math.max(0, totalHeight - height);
    const nextScrollTop = Math.min(
      maxScrollTop,
      Math.max(0, activeIndex * itemHeight - height / 2 + itemHeight / 2)
    );

    containerRef.current.scrollTop = nextScrollTop;
    setScrollTop(nextScrollTop);
  }, [activeIndex, height, itemHeight, totalHeight]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const nextScrollTop = Math.min(containerRef.current.scrollTop, Math.max(0, totalHeight - height));
    containerRef.current.scrollTop = nextScrollTop;
    setScrollTop(nextScrollTop);
  }, [height, items, totalHeight]);

  return (
    <div
      aria-label={ariaLabel}
      className={className}
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      ref={containerRef}
      role={ariaLabel ? 'list' : undefined}
      style={{ height, overflow: 'auto' }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map((item, offset) => {
          const index = startIndex + offset;

          return (
            <div
              key={getKey(item, index)}
              role={ariaLabel ? 'listitem' : undefined}
              style={{
                height: itemHeight,
                left: 0,
                position: 'absolute',
                right: 0,
                top: index * itemHeight
              }}
            >
              {renderItem(item, index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
