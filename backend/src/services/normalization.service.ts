import type {
  ActiveNormalizationRule,
  AppliedNormalizationInfo,
  NormalizationIgnoredDifference,
  NormalizationOptions,
  NormalizationRuleKey,
  TableSourceType
} from '../types/api.js';
import type { TableMatrix } from './tableDiff.service.js';

export interface NormalizedTableRowLabel {
  keyLabel: string | null;
  leftRowNumber: number | null;
  rightRowNumber: number | null;
}

export interface NormalizedTablePair {
  leftRows: TableMatrix;
  rightRows: TableMatrix;
  rowLabels: NormalizedTableRowLabel[];
  usedPrimaryKey: boolean;
  ignoredDifferences: NormalizationIgnoredDifference[];
  warnings: string[];
}

const normalizationRuleLabels: Record<NormalizationRuleKey, string> = {
  jsonFieldOrder: '忽略 JSON 字段顺序',
  jsonIgnoredFields: '忽略指定 JSON 字段',
  emptyValueEquivalence: '空值等价',
  numericTolerance: '数值容差',
  dateFormat: '日期格式归一化',
  tablePrimaryKey: '表格主键列对齐'
};

export const defaultNormalizationOptions: NormalizationOptions = {
  enabled: false,
  ignoreJsonFieldOrder: true,
  ignoredJsonFields: [],
  emptyValuesEquivalent: false,
  numericTolerance: null,
  normalizeDateFormat: false,
  tablePrimaryKeyColumns: []
};

function parseBoolean(value: unknown) {
  return value === true || value === 'true' || value === 'on' || value === '1';
}

function parseList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(parseList);
  }

  if (typeof value !== 'string') {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseNumericTolerance(rawOptions: Record<string, unknown>) {
  if (!parseBoolean(rawOptions.numericToleranceEnabled)) {
    return null;
  }

  const rawValue = rawOptions.numericTolerance;

  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return null;
  }

  const tolerance = Number(rawValue);

  return Number.isFinite(tolerance) && tolerance >= 0 ? tolerance : null;
}

export function normalizeNormalizationOptions(rawOptions: Record<string, unknown>): NormalizationOptions {
  return {
    enabled: parseBoolean(rawOptions.normalizationEnabled),
    ignoreJsonFieldOrder:
      rawOptions.ignoreJsonFieldOrder === undefined
        ? defaultNormalizationOptions.ignoreJsonFieldOrder
        : parseBoolean(rawOptions.ignoreJsonFieldOrder),
    ignoredJsonFields: parseList(rawOptions.ignoredJsonFields),
    emptyValuesEquivalent: parseBoolean(rawOptions.emptyValuesEquivalent),
    numericTolerance: parseNumericTolerance(rawOptions),
    normalizeDateFormat: parseBoolean(rawOptions.normalizeDateFormat),
    tablePrimaryKeyColumns: parseList(rawOptions.tablePrimaryKeyColumns)
  };
}

export function getActiveNormalizationRules(options: NormalizationOptions): ActiveNormalizationRule[] {
  if (!options.enabled) {
    return [];
  }

  const rules: ActiveNormalizationRule[] = [];

  if (options.ignoreJsonFieldOrder) {
    rules.push({ key: 'jsonFieldOrder', label: normalizationRuleLabels.jsonFieldOrder });
  }

  if (options.ignoredJsonFields.length > 0) {
    rules.push({ key: 'jsonIgnoredFields', label: normalizationRuleLabels.jsonIgnoredFields });
  }

  if (options.emptyValuesEquivalent) {
    rules.push({ key: 'emptyValueEquivalence', label: normalizationRuleLabels.emptyValueEquivalence });
  }

  if (options.numericTolerance !== null) {
    rules.push({ key: 'numericTolerance', label: normalizationRuleLabels.numericTolerance });
  }

  if (options.normalizeDateFormat) {
    rules.push({ key: 'dateFormat', label: normalizationRuleLabels.dateFormat });
  }

  if (options.tablePrimaryKeyColumns.length > 0) {
    rules.push({ key: 'tablePrimaryKey', label: normalizationRuleLabels.tablePrimaryKey });
  }

  return rules;
}

export function buildNormalizationInfo(
  options: NormalizationOptions,
  ignoredDifferences: NormalizationIgnoredDifference[] = [],
  warnings: string[] = []
): AppliedNormalizationInfo {
  return {
    enabled: options.enabled,
    options,
    active: getActiveNormalizationRules(options),
    ignoredDifferences: options.enabled ? ignoredDifferences : [],
    warnings: options.enabled ? warnings : []
  };
}

export function mergeNormalizationInfo(
  options: NormalizationOptions,
  infos: AppliedNormalizationInfo[]
): AppliedNormalizationInfo {
  return buildNormalizationInfo(
    options,
    infos.flatMap((info) => info.ignoredDifferences),
    [...new Set(infos.flatMap((info) => info.warnings))]
  );
}

function formatPreview(value: unknown) {
  if (value === undefined) {
    return 'undefined';
  }

  const preview = typeof value === 'string' ? value : JSON.stringify(value);
  const safePreview = preview ?? String(value);

  return safePreview.length > 160 ? `${safePreview.slice(0, 157)}...` : safePreview;
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(',')}]`;
  }

  if (typeof value === 'object' && value !== null) {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSerialize((value as Record<string, unknown>)[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(value) ?? String(value);
}

function addIgnoredDifference(
  ignoredDifferences: NormalizationIgnoredDifference[],
  input: NormalizationIgnoredDifference
) {
  ignoredDifferences.push(input);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOwn(value: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function formatObjectPath(parentPath: string, key: string) {
  return parentPath === '$' ? `$.${key}` : `${parentPath}.${key}`;
}

function formatArrayPath(parentPath: string, index: number) {
  return `${parentPath}[${index}]`;
}

function shouldIgnoreJsonField(options: NormalizationOptions, key: string, path: string) {
  return options.ignoredJsonFields.some((field) => field === key || field === path);
}

function isEmptyLike(value: unknown) {
  return value === null || value === undefined || value === '';
}

function normalizeDateString(value: string) {
  const match = value.trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T].*)?$/);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

interface NormalizeJsonPairResult {
  leftValue: unknown;
  rightValue: unknown;
  omit: boolean;
}

function normalizeJsonPairValue({
  ignoredDifferences,
  key,
  leftExists,
  leftValue,
  options,
  path,
  rightExists,
  rightValue
}: {
  ignoredDifferences: NormalizationIgnoredDifference[];
  key: string;
  leftExists: boolean;
  leftValue: unknown;
  options: NormalizationOptions;
  path: string;
  rightExists: boolean;
  rightValue: unknown;
}): NormalizeJsonPairResult {
  if (key !== '$' && shouldIgnoreJsonField(options, key, path)) {
    if (stableSerialize(leftValue) !== stableSerialize(rightValue)) {
      addIgnoredDifference(ignoredDifferences, {
        rule: 'jsonIgnoredFields',
        label: normalizationRuleLabels.jsonIgnoredFields,
        path,
        leftValue: leftExists ? formatPreview(leftValue) : null,
        rightValue: rightExists ? formatPreview(rightValue) : null,
        reason: `字段 ${key} 已配置为忽略字段`
      });
    }

    return {
      leftValue: undefined,
      rightValue: undefined,
      omit: true
    };
  }

  if (options.emptyValuesEquivalent && isEmptyLike(leftValue) && isEmptyLike(rightValue)) {
    if (!Object.is(leftValue, rightValue) || leftExists !== rightExists) {
      addIgnoredDifference(ignoredDifferences, {
        rule: 'emptyValueEquivalence',
        label: normalizationRuleLabels.emptyValueEquivalence,
        path,
        leftValue: leftExists ? formatPreview(leftValue) : null,
        rightValue: rightExists ? formatPreview(rightValue) : null,
        reason: 'null、空字符串和 undefined 已按等价空值处理'
      });
    }

    return {
      leftValue: null,
      rightValue: null,
      omit: false
    };
  }

  if (Array.isArray(leftValue) && Array.isArray(rightValue)) {
    const maxLength = Math.max(leftValue.length, rightValue.length);
    const normalizedLeft: unknown[] = [];
    const normalizedRight: unknown[] = [];

    for (let index = 0; index < maxLength; index += 1) {
      const childResult = normalizeJsonPairValue({
        ignoredDifferences,
        key: `[${index}]`,
        leftExists: index < leftValue.length,
        leftValue: leftValue[index],
        options,
        path: formatArrayPath(path, index),
        rightExists: index < rightValue.length,
        rightValue: rightValue[index]
      });

      if (!childResult.omit) {
        normalizedLeft.push(childResult.leftValue);
        normalizedRight.push(childResult.rightValue);
      }
    }

    return {
      leftValue: normalizedLeft,
      rightValue: normalizedRight,
      omit: false
    };
  }

  if (isRecord(leftValue) && isRecord(rightValue)) {
    const keys = [
      ...Object.keys(leftValue),
      ...Object.keys(rightValue).filter((childKey) => !hasOwn(leftValue, childKey))
    ];
    const normalizedKeys = options.ignoreJsonFieldOrder ? keys.sort((a, b) => a.localeCompare(b)) : keys;
    const normalizedLeft: Record<string, unknown> = {};
    const normalizedRight: Record<string, unknown> = {};

    for (const childKey of normalizedKeys) {
      const childPath = formatObjectPath(path, childKey);
      const childResult = normalizeJsonPairValue({
        ignoredDifferences,
        key: childKey,
        leftExists: hasOwn(leftValue, childKey),
        leftValue: leftValue[childKey],
        options,
        path: childPath,
        rightExists: hasOwn(rightValue, childKey),
        rightValue: rightValue[childKey]
      });

      if (!childResult.omit) {
        normalizedLeft[childKey] = childResult.leftValue;
        normalizedRight[childKey] = childResult.rightValue;
      }
    }

    return {
      leftValue: normalizedLeft,
      rightValue: normalizedRight,
      omit: false
    };
  }

  if (
    options.numericTolerance !== null &&
    typeof leftValue === 'number' &&
    typeof rightValue === 'number' &&
    Number.isFinite(leftValue) &&
    Number.isFinite(rightValue) &&
    Math.abs(leftValue - rightValue) <= options.numericTolerance
  ) {
    if (!Object.is(leftValue, rightValue)) {
      addIgnoredDifference(ignoredDifferences, {
        rule: 'numericTolerance',
        label: normalizationRuleLabels.numericTolerance,
        path,
        leftValue: formatPreview(leftValue),
        rightValue: formatPreview(rightValue),
        reason: `数值差值 ${Math.abs(leftValue - rightValue)} 小于或等于容差 ${options.numericTolerance}`
      });
    }

    return {
      leftValue,
      rightValue: leftValue,
      omit: false
    };
  }

  if (options.normalizeDateFormat && typeof leftValue === 'string' && typeof rightValue === 'string') {
    const normalizedLeftDate = normalizeDateString(leftValue);
    const normalizedRightDate = normalizeDateString(rightValue);

    if (normalizedLeftDate && normalizedLeftDate === normalizedRightDate) {
      if (leftValue !== rightValue) {
        addIgnoredDifference(ignoredDifferences, {
          rule: 'dateFormat',
          label: normalizationRuleLabels.dateFormat,
          path,
          leftValue: formatPreview(leftValue),
          rightValue: formatPreview(rightValue),
          reason: `日期已归一化为 ${normalizedLeftDate}`
        });
      }

      return {
        leftValue: normalizedLeftDate,
        rightValue: normalizedLeftDate,
        omit: false
      };
    }
  }

  return {
    leftValue,
    rightValue,
    omit: false
  };
}

export function normalizeJsonPair(
  leftValue: unknown,
  rightValue: unknown,
  options: NormalizationOptions
) {
  if (!options.enabled) {
    return {
      leftValue,
      rightValue,
      normalization: buildNormalizationInfo(options)
    };
  }

  const ignoredDifferences: NormalizationIgnoredDifference[] = [];
  const normalized = normalizeJsonPairValue({
    ignoredDifferences,
    key: '$',
    leftExists: true,
    leftValue,
    options,
    path: '$',
    rightExists: true,
    rightValue
  });

  return {
    leftValue: normalized.leftValue,
    rightValue: normalized.rightValue,
    normalization: buildNormalizationInfo(options, ignoredDifferences)
  };
}

function columnNameToIndex(columnName: string) {
  const normalizedName = columnName.trim().toUpperCase();

  if (!/^[A-Z]+$/.test(normalizedName)) {
    return null;
  }

  let index = 0;

  for (const character of normalizedName) {
    index = index * 26 + character.charCodeAt(0) - 64;
  }

  return index - 1;
}

function resolvePrimaryKeyIndexes(header: string[], columns: string[]) {
  return columns.map((column) => {
    const byHeader = header.findIndex((headerName) => headerName.trim() === column);

    if (byHeader >= 0) {
      return byHeader;
    }

    return columnNameToIndex(column);
  });
}

function buildRowKey(row: string[], primaryKeyIndexes: number[], primaryKeyColumns: string[]) {
  return primaryKeyIndexes
    .map((columnIndex, index) => `${primaryKeyColumns[index]}=${row[columnIndex] ?? ''}`)
    .join('|');
}

function buildRowMap(rows: TableMatrix, primaryKeyIndexes: number[], primaryKeyColumns: string[]) {
  const rowMap = new Map<string, number>();
  const duplicateKeys = new Set<string>();

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const key = buildRowKey(rows[rowIndex] ?? [], primaryKeyIndexes, primaryKeyColumns);

    if (rowMap.has(key)) {
      duplicateKeys.add(key);
    } else {
      rowMap.set(key, rowIndex);
    }
  }

  return {
    rowMap,
    duplicateKeys
  };
}

function formatTablePathPrefix(sheetName: string | null, keyLabel: string) {
  return `${sheetName ? `${sheetName}!` : ''}key(${keyLabel})`;
}

export function normalizeTableMatrices(
  leftRows: TableMatrix,
  rightRows: TableMatrix,
  {
    options,
    sheetName,
    sourceType
  }: {
    options: NormalizationOptions;
    sheetName: string | null;
    sourceType: TableSourceType;
  }
): NormalizedTablePair {
  if (!options.enabled || options.tablePrimaryKeyColumns.length === 0) {
    return {
      leftRows,
      rightRows,
      rowLabels: leftRows.map((_, index) => ({
        keyLabel: null,
        leftRowNumber: index + 1,
        rightRowNumber: index + 1
      })),
      usedPrimaryKey: false,
      ignoredDifferences: [],
      warnings: []
    };
  }

  const warnings: string[] = [];
  const leftHeader = leftRows[0] ?? [];
  const rightHeader = rightRows[0] ?? [];
  const leftKeyIndexes = resolvePrimaryKeyIndexes(leftHeader, options.tablePrimaryKeyColumns);
  const rightKeyIndexes = resolvePrimaryKeyIndexes(rightHeader, options.tablePrimaryKeyColumns);
  const missingColumns = options.tablePrimaryKeyColumns.filter(
    (_column, index) => leftKeyIndexes[index] === null || rightKeyIndexes[index] === null
  );

  if (missingColumns.length > 0) {
    warnings.push(
      `${sourceType === 'excel' ? `工作表 ${sheetName ?? 'Sheet'}：` : ''}主键列 ${missingColumns.join(
        '、'
      )} 未同时出现在左右表头中，已回退到按行号对比。`
    );

    return {
      leftRows,
      rightRows,
      rowLabels: leftRows.map((_, index) => ({
        keyLabel: null,
        leftRowNumber: index + 1,
        rightRowNumber: index + 1
      })),
      usedPrimaryKey: false,
      ignoredDifferences: [],
      warnings
    };
  }

  const safeLeftKeyIndexes = leftKeyIndexes as number[];
  const safeRightKeyIndexes = rightKeyIndexes as number[];
  const leftMap = buildRowMap(leftRows, safeLeftKeyIndexes, options.tablePrimaryKeyColumns);
  const rightMap = buildRowMap(rightRows, safeRightKeyIndexes, options.tablePrimaryKeyColumns);
  const duplicateKeys = [...new Set([...leftMap.duplicateKeys, ...rightMap.duplicateKeys])];

  if (duplicateKeys.length > 0) {
    warnings.push(
      `${sourceType === 'excel' ? `工作表 ${sheetName ?? 'Sheet'}：` : ''}主键值 ${duplicateKeys
        .slice(0, 5)
        .join('、')} 存在重复，已回退到按行号对比。`
    );

    return {
      leftRows,
      rightRows,
      rowLabels: leftRows.map((_, index) => ({
        keyLabel: null,
        leftRowNumber: index + 1,
        rightRowNumber: index + 1
      })),
      usedPrimaryKey: false,
      ignoredDifferences: [],
      warnings
    };
  }

  const alignedLeftRows: TableMatrix = [leftRows[0] ?? []];
  const alignedRightRows: TableMatrix = [rightRows[0] ?? []];
  const rowLabels: NormalizedTableRowLabel[] = [
    {
      keyLabel: null,
      leftRowNumber: 1,
      rightRowNumber: 1
    }
  ];
  const ignoredDifferences: NormalizationIgnoredDifference[] = [];
  const rowKeys = [
    ...leftMap.rowMap.keys(),
    ...[...rightMap.rowMap.keys()].filter((key) => !leftMap.rowMap.has(key))
  ];

  for (const rowKey of rowKeys) {
    const leftRowIndex = leftMap.rowMap.get(rowKey);
    const rightRowIndex = rightMap.rowMap.get(rowKey);

    alignedLeftRows.push(leftRowIndex === undefined ? [] : leftRows[leftRowIndex]);
    alignedRightRows.push(rightRowIndex === undefined ? [] : rightRows[rightRowIndex]);
    rowLabels.push({
      keyLabel: rowKey,
      leftRowNumber: leftRowIndex === undefined ? null : leftRowIndex + 1,
      rightRowNumber: rightRowIndex === undefined ? null : rightRowIndex + 1
    });

    if (leftRowIndex !== undefined && rightRowIndex !== undefined && leftRowIndex !== rightRowIndex) {
      ignoredDifferences.push({
        rule: 'tablePrimaryKey',
        label: normalizationRuleLabels.tablePrimaryKey,
        path: formatTablePathPrefix(sheetName, rowKey),
        leftValue: `第 ${leftRowIndex + 1} 行`,
        rightValue: `第 ${rightRowIndex + 1} 行`,
        reason: '表格行已按主键列对齐，原始行号差异不计入正式 diff'
      });
    }
  }

  return {
    leftRows: alignedLeftRows,
    rightRows: alignedRightRows,
    rowLabels,
    usedPrimaryKey: true,
    ignoredDifferences,
    warnings
  };
}
