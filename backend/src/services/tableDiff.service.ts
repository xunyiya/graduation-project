import type {
  AdvancedRuleIgnoredDifference,
  AdvancedRuleOptions,
  AppliedAdvancedRulesInfo,
  AppliedNormalizationInfo,
  DiffItemMeta,
  DiffLineType,
  DiffSummary,
  NormalizationOptions,
  TableDiffItem,
  TableSourceType
} from '../types/api.js';
import {
  buildAdvancedRulesInfo,
  defaultAdvancedRuleOptions,
  evaluateTableAdvancedRules
} from './advancedRules.service.js';
import {
  buildNormalizationInfo,
  defaultNormalizationOptions,
  normalizeTableMatrices,
  type NormalizedTableRowLabel
} from './normalization.service.js';
import { buildPerformanceInfo, defaultResultLimit } from './performance.service.js';

export type TableMatrix = string[][];

interface CompareTableOptions {
  sourceType: TableSourceType;
  sheetName: string | null;
  idPrefix: string;
  normalizationOptions?: NormalizationOptions;
  advancedRuleOptions?: AdvancedRuleOptions;
}

export function createEmptySummary(): DiffSummary {
  return {
    total: 0,
    added: 0,
    removed: 0,
    modified: 0
  };
}

export function mergeSummary(target: DiffSummary, source: DiffSummary) {
  target.total += source.total;
  target.added += source.added;
  target.removed += source.removed;
  target.modified += source.modified;
}

export function columnNumberToName(columnNumber: number) {
  let value = columnNumber;
  let columnName = '';

  while (value > 0) {
    const remainder = (value - 1) % 26;
    columnName = String.fromCharCode(65 + remainder) + columnName;
    value = Math.floor((value - 1) / 26);
  }

  return columnName;
}

function getCellValue(matrix: TableMatrix, rowIndex: number, columnIndex: number) {
  return matrix[rowIndex]?.[columnIndex];
}

function hasCell(matrix: TableMatrix, rowIndex: number, columnIndex: number) {
  return getCellValue(matrix, rowIndex, columnIndex) !== undefined;
}

function buildCellPath({
  columnName,
  keyLabel,
  rowNumber,
  sheetName,
  sourceType
}: {
  columnName: string;
  keyLabel?: string | null;
  rowNumber: number;
  sheetName: string | null;
  sourceType: TableSourceType;
}) {
  if (keyLabel) {
    const prefix = sourceType === 'excel' ? `${sheetName ?? 'Sheet'}!key(${keyLabel})` : `key(${keyLabel})`;

    return `${prefix}.${columnName}`;
  }

  if (sourceType === 'excel') {
    return `${sheetName ?? 'Sheet'}!${columnName}${rowNumber}`;
  }

  return `R${rowNumber}C${columnName}`;
}

function createTableMeta({
  columnName,
  columnNumber,
  leftValue,
  path,
  rightValue,
  rowNumber,
  scope,
  sheetName,
  type
}: {
  columnName: string | null;
  columnNumber: number | null;
  leftValue: string | null;
  path: string;
  rightValue: string | null;
  rowNumber: number | null;
  scope: 'sheet' | 'cell';
  sheetName: string | null;
  type: DiffLineType;
}): DiffItemMeta {
  return {
    diffId: `table-${path}`,
    kind: 'table-diff',
    type,
    label: scope === 'sheet' ? `工作表 ${path}` : `单元格 ${path}`,
    path,
    location: {
      kind: 'table',
      sheetName,
      rowNumber,
      columnNumber,
      columnName
    },
    leftValue,
    rightValue
  };
}

export function createSheetDiffItem({
  sheetName,
  type
}: {
  sheetName: string;
  type: 'added' | 'removed';
}): TableDiffItem {
  return {
    kind: 'table-diff',
    id: `excel:sheet:${sheetName}`,
    type,
    meta: createTableMeta({
      columnName: null,
      columnNumber: null,
      leftValue: type === 'removed' ? '工作表存在' : null,
      path: sheetName,
      rightValue: type === 'added' ? '工作表存在' : null,
      rowNumber: null,
      scope: 'sheet',
      sheetName,
      type
    }),
    scope: 'sheet',
    sourceType: 'excel',
    sheetName,
    rowNumber: null,
    columnNumber: null,
    columnName: null,
    path: sheetName,
    leftValue: type === 'removed' ? '工作表存在' : null,
    rightValue: type === 'added' ? '工作表存在' : null
  };
}

export function compareTableMatrices(
  leftRows: TableMatrix,
  rightRows: TableMatrix,
  options: CompareTableOptions
) {
  const normalizationOptions = options.normalizationOptions ?? defaultNormalizationOptions;
  const advancedRuleOptions = options.advancedRuleOptions ?? defaultAdvancedRuleOptions;
  const normalizedTable = normalizeTableMatrices(leftRows, rightRows, {
    options: normalizationOptions,
    sheetName: options.sheetName,
    sourceType: options.sourceType
  });
  const normalizedLeftRows = normalizedTable.leftRows;
  const normalizedRightRows = normalizedTable.rightRows;
  const result: TableDiffItem[] = [];
  const summary = createEmptySummary();
  const advancedIgnoredDifferences: AdvancedRuleIgnoredDifference[] = [];
  const rowCount = Math.max(normalizedLeftRows.length, normalizedRightRows.length);

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const columnCount = Math.max(
      normalizedLeftRows[rowIndex]?.length ?? 0,
      normalizedRightRows[rowIndex]?.length ?? 0
    );
    const rowLabel: NormalizedTableRowLabel | undefined = normalizedTable.rowLabels[rowIndex];

    for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
      const leftExists = hasCell(normalizedLeftRows, rowIndex, columnIndex);
      const rightExists = hasCell(normalizedRightRows, rowIndex, columnIndex);

      if (!leftExists && !rightExists) {
        continue;
      }

      const leftValue = leftExists ? (getCellValue(normalizedLeftRows, rowIndex, columnIndex) ?? '') : null;
      const rightValue = rightExists ? (getCellValue(normalizedRightRows, rowIndex, columnIndex) ?? '') : null;

      if (leftValue === rightValue) {
        continue;
      }

      const type = leftExists && rightExists ? 'modified' : leftExists ? 'removed' : 'added';
      const rowNumber = rowLabel?.leftRowNumber ?? rowLabel?.rightRowNumber ?? rowIndex + 1;
      const columnNumber = columnIndex + 1;
      const columnName = columnNumberToName(columnNumber);
      const path = buildCellPath({
        columnName,
        keyLabel: rowLabel?.keyLabel,
        rowNumber,
        sheetName: options.sheetName,
        sourceType: options.sourceType
      });
      const advancedDecision = evaluateTableAdvancedRules({
        columnIndex,
        leftRows: normalizedLeftRows,
        leftValue,
        options: advancedRuleOptions,
        rightRows: normalizedRightRows,
        rightValue,
        rowIndex,
        rowNumber,
        sheetName: options.sheetName,
        sourceType: options.sourceType
      });

      if (advancedDecision.ignored) {
        if (advancedDecision.ignoredDifference) {
          advancedIgnoredDifferences.push({
            ...advancedDecision.ignoredDifference,
            path
          });
        }
        continue;
      }

      summary[type] += 1;
      summary.total += 1;

      if (result.length < defaultResultLimit) {
        result.push({
          kind: 'table-diff',
          id: `${options.idPrefix}:${path}`,
          type,
          meta: createTableMeta({
            columnName,
            columnNumber,
            leftValue,
            path,
            rightValue,
            rowNumber,
            scope: 'cell',
            sheetName: options.sheetName,
            type
          }),
          scope: 'cell',
          sourceType: options.sourceType,
          sheetName: options.sheetName,
          rowNumber,
          columnNumber,
          columnName,
          path,
          leftValue,
          rightValue
        });
      }
    }
  }

  return {
    summary,
    result,
    advancedRules: buildAdvancedRulesInfo(
      advancedRuleOptions,
      advancedIgnoredDifferences
    ) as AppliedAdvancedRulesInfo,
    normalization: buildNormalizationInfo(
      normalizationOptions,
      normalizedTable.ignoredDifferences,
      normalizedTable.warnings
    ) as AppliedNormalizationInfo,
    performance: buildPerformanceInfo({
      algorithm: normalizedTable.usedPrimaryKey
        ? `${options.sourceType}-primary-key-cell-scan`
        : `${options.sourceType}-cell-scan`,
      resultCount: result.length,
      resultTruncated: summary.total > result.length,
      warnings:
        summary.total > result.length
          ? ['表格差异数量较多，接口只返回前部分差异用于页面展示。']
          : []
    })
  };
}
