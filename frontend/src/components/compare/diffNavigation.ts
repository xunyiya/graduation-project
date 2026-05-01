import type { DiffLineType, DiffResultItem } from '../../types/api';

export interface DiffListEntry {
  diffId: string;
  type: DiffLineType;
  kind: DiffResultItem['kind'];
  label: string;
  path: string;
  leftValue: string | null;
  rightValue: string | null;
}

export function getDiffDomId(diffId: string) {
  return `diff-target-${encodeURIComponent(diffId)}`;
}

function isChangedItem(item: DiffResultItem) {
  return item.type === 'added' || item.type === 'removed' || item.type === 'modified';
}

function collectEntries(item: DiffResultItem, entries: DiffListEntry[]) {
  if (isChangedItem(item)) {
    entries.push({
      diffId: item.meta.diffId,
      type: item.meta.type,
      kind: item.meta.kind,
      label: item.meta.label,
      path: item.meta.path,
      leftValue: item.meta.leftValue,
      rightValue: item.meta.rightValue
    });
  }

  if (item.kind === 'json-node') {
    item.children.forEach((child) => collectEntries(child, entries));
  }
}

export function flattenChangedDiffItems(result: DiffResultItem[]) {
  const entries: DiffListEntry[] = [];
  result.forEach((item) => collectEntries(item, entries));
  return entries;
}
