import type { DiffLineItem, DiffLineType, DiffResultItem, FileType, JsonDiffNode, TableDiffItem } from '../../types/api';

export interface DensityRegion {
  count: number;
  detail: string;
  diffId: string;
  label: string;
}

export interface HeatmapMarker {
  diffId: string;
  label: string;
  position: number;
  type: DiffLineType;
}

function isChangedType(type: DiffLineType) {
  return type === 'added' || type === 'removed' || type === 'modified';
}

function isTextLine(item: DiffResultItem): item is DiffLineItem {
  return item.kind === 'text-line';
}

function isJsonNode(item: DiffResultItem): item is JsonDiffNode {
  return item.kind === 'json-node';
}

function isTableDiffItem(item: DiffResultItem): item is TableDiffItem {
  return item.kind === 'table-diff';
}

export function buildTextHeatmapMarkers(result: DiffLineItem[]): HeatmapMarker[] {
  const total = Math.max(result.length - 1, 1);

  return result.flatMap((row, index) =>
    isChangedType(row.type)
      ? [
          {
            diffId: row.meta.diffId,
            label: row.meta.label,
            position: index / total,
            type: row.type
          }
        ]
      : []
  );
}

export function countJsonSubtreeDifferences(node: JsonDiffNode): number {
  const ownCount = isChangedType(node.type) ? 1 : 0;

  return ownCount + node.children.reduce((count, child) => count + countJsonSubtreeDifferences(child), 0);
}

export function buildJsonSubtreeCountMap(nodes: JsonDiffNode[]) {
  const countMap = new Map<string, number>();

  function walk(node: JsonDiffNode) {
    countMap.set(node.meta.diffId, countJsonSubtreeDifferences(node));
    node.children.forEach(walk);
  }

  nodes.forEach(walk);
  return countMap;
}

export function collectJsonDensityRegions(nodes: JsonDiffNode[]): DensityRegion[] {
  const regions: DensityRegion[] = [];

  function walk(node: JsonDiffNode) {
    const count = countJsonSubtreeDifferences(node);

    if (count > 0) {
      regions.push({
        count,
        detail: `${count} 个子树差异`,
        diffId: node.meta.diffId,
        label: node.path
      });
    }

    node.children.forEach(walk);
  }

  nodes.forEach(walk);
  return regions.sort((left, right) => right.count - left.count);
}

function getTextLineNumber(row: DiffLineItem) {
  return row.left?.lineNumber ?? row.right?.lineNumber ?? row.id;
}

function getDensestTextRegion(result: DiffLineItem[]): DensityRegion | null {
  const changedRows = result
    .map((row, index) => ({ index, row }))
    .filter(({ row }) => isChangedType(row.type));

  if (changedRows.length === 0) {
    return null;
  }

  const windowSize = Math.max(5, Math.ceil(result.length / 10));
  let bestStart = 0;
  let bestRows = changedRows.filter(({ index }) => index < windowSize);

  for (let start = 1; start < result.length; start += 1) {
    const end = start + windowSize;
    const rows = changedRows.filter(({ index }) => index >= start && index < end);

    if (rows.length > bestRows.length) {
      bestStart = start;
      bestRows = rows;
    }
  }

  const firstRow = result[bestStart];
  const lastRow = result[Math.min(result.length - 1, bestStart + windowSize - 1)];
  const firstLine = firstRow ? getTextLineNumber(firstRow) : 1;
  const lastLine = lastRow ? getTextLineNumber(lastRow) : firstLine;

  return {
    count: bestRows.length,
    detail: `${bestRows.length} 个差异集中在 ${windowSize} 行窗口内`,
    diffId: bestRows[0].row.meta.diffId,
    label: `第 ${firstLine}-${lastLine} 行`
  };
}

function tableRowGroupKey(item: TableDiffItem) {
  const rowNumber = item.rowNumber ?? 0;
  const blockStart = rowNumber > 0 ? Math.floor((rowNumber - 1) / 10) * 10 + 1 : 0;
  const blockEnd = blockStart > 0 ? blockStart + 9 : 0;

  return {
    blockEnd,
    blockStart,
    key: `${item.sheetName ?? 'CSV'}:${blockStart}`,
    label:
      blockStart > 0
        ? `${item.sheetName ?? 'CSV'} 第 ${blockStart}-${blockEnd} 行`
        : `${item.sheetName ?? 'CSV'} 未定位区域`
  };
}

export function collectTableDensityRegions(result: TableDiffItem[]): DensityRegion[] {
  const groups = new Map<string, DensityRegion>();

  for (const item of result) {
    if (!isChangedType(item.type)) {
      continue;
    }

    const group = tableRowGroupKey(item);
    const current = groups.get(group.key);

    if (current) {
      current.count += 1;
      current.detail = `${current.count} 个表格差异`;
    } else {
      groups.set(group.key, {
        count: 1,
        detail: '1 个表格差异',
        diffId: item.meta.diffId,
        label: group.label
      });
    }
  }

  return [...groups.values()].sort((left, right) => right.count - left.count);
}

export function getTableRowDensityClass(item: TableDiffItem, result: TableDiffItem[]) {
  if (!isChangedType(item.type)) {
    return '';
  }

  const rowKey = `${item.sheetName ?? 'CSV'}:${item.rowNumber ?? item.path}`;
  const rowCounts = new Map<string, number>();

  for (const diffItem of result) {
    if (!isChangedType(diffItem.type)) {
      continue;
    }

    const key = `${diffItem.sheetName ?? 'CSV'}:${diffItem.rowNumber ?? diffItem.path}`;
    rowCounts.set(key, (rowCounts.get(key) ?? 0) + 1);
  }

  const maxCount = Math.max(...rowCounts.values(), 1);
  const count = rowCounts.get(rowKey) ?? 0;
  const ratio = count / maxCount;

  if (ratio >= 0.67) {
    return 'density-high';
  }

  if (ratio >= 0.34) {
    return 'density-medium';
  }

  return 'density-low';
}

export function findDensestRegion(fileType: FileType, result: DiffResultItem[]): DensityRegion | null {
  if (fileType === 'text') {
    return getDensestTextRegion(result.filter(isTextLine));
  }

  if (fileType === 'json') {
    return collectJsonDensityRegions(result.filter(isJsonNode)).find((region) => region.label !== '$') ?? null;
  }

  if (fileType === 'csv' || fileType === 'excel') {
    return collectTableDensityRegions(result.filter(isTableDiffItem))[0] ?? null;
  }

  return null;
}
