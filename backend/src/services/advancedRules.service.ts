import type {
  ActiveAdvancedRule,
  AdvancedRuleIgnoredDifference,
  AdvancedRuleKey,
  AdvancedRuleOptions,
  AppliedAdvancedRulesInfo,
  TableSourceType
} from '../types/api.js';
import type { TableMatrix } from './tableDiff.service.js';

export interface TextAdvancedRuleResult {
  ignoredLine: boolean;
  compareContent: string;
  ignoredDifferences: AdvancedRuleIgnoredDifference[];
  warnings: string[];
}

export interface JsonAdvancedRuleResult {
  leftValue: unknown;
  rightValue: unknown;
  advancedRules: AppliedAdvancedRulesInfo;
}

export interface TableAdvancedRuleDecision {
  ignored: boolean;
  ignoredDifference?: AdvancedRuleIgnoredDifference;
}

const advancedRuleLabels: Record<AdvancedRuleKey, string> = {
  textLineKeyword: '忽略包含关键词的行',
  textRegexContent: '忽略正则匹配内容',
  jsonField: '忽略 JSON 字段',
  jsonPath: '忽略 JSON 路径',
  jsonArrayOrder: '忽略 JSON 数组顺序',
  tableColumn: '忽略表格列',
  tableRow: '忽略表格行',
  tableNumericTolerance: '表格数值误差范围'
};

function columnNumberToName(columnNumber: number) {
  let value = columnNumber;
  let columnName = '';

  while (value > 0) {
    const remainder = (value - 1) % 26;
    columnName = String.fromCharCode(65 + remainder) + columnName;
    value = Math.floor((value - 1) / 26);
  }

  return columnName;
}

export const defaultAdvancedRuleOptions: AdvancedRuleOptions = {
  enabled: false,
  textIgnoredLineKeywords: [],
  textIgnoredRegexPatterns: [],
  jsonIgnoredFields: [],
  jsonIgnoredPaths: [],
  jsonIgnoreArrayOrder: false,
  tableIgnoredColumns: [],
  tableIgnoredRows: [],
  tableNumericTolerance: null
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
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseRows(value: unknown) {
  return [...new Set(parseList(value).map(Number).filter((item) => Number.isInteger(item) && item > 0))];
}

function parseTableTolerance(rawOptions: Record<string, unknown>) {
  if (!parseBoolean(rawOptions.advancedTableNumericToleranceEnabled)) {
    return null;
  }

  const rawValue = rawOptions.advancedTableNumericTolerance;

  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return null;
  }

  const tolerance = Number(rawValue);

  return Number.isFinite(tolerance) && tolerance >= 0 ? tolerance : null;
}

export function normalizeAdvancedRuleOptions(rawOptions: Record<string, unknown>): AdvancedRuleOptions {
  return {
    enabled: parseBoolean(rawOptions.advancedRulesEnabled),
    textIgnoredLineKeywords: parseList(rawOptions.textIgnoredLineKeywords),
    textIgnoredRegexPatterns: parseList(rawOptions.textIgnoredRegexPatterns),
    jsonIgnoredFields: parseList(rawOptions.advancedJsonIgnoredFields),
    jsonIgnoredPaths: parseList(rawOptions.advancedJsonIgnoredPaths),
    jsonIgnoreArrayOrder: parseBoolean(rawOptions.advancedJsonIgnoreArrayOrder),
    tableIgnoredColumns: parseList(rawOptions.advancedTableIgnoredColumns),
    tableIgnoredRows: parseRows(rawOptions.advancedTableIgnoredRows),
    tableNumericTolerance: parseTableTolerance(rawOptions)
  };
}

export function getActiveAdvancedRules(options: AdvancedRuleOptions): ActiveAdvancedRule[] {
  if (!options.enabled) {
    return [];
  }

  const rules: ActiveAdvancedRule[] = [];

  if (options.textIgnoredLineKeywords.length > 0) {
    rules.push({ key: 'textLineKeyword', label: advancedRuleLabels.textLineKeyword });
  }

  if (options.textIgnoredRegexPatterns.length > 0) {
    rules.push({ key: 'textRegexContent', label: advancedRuleLabels.textRegexContent });
  }

  if (options.jsonIgnoredFields.length > 0) {
    rules.push({ key: 'jsonField', label: advancedRuleLabels.jsonField });
  }

  if (options.jsonIgnoredPaths.length > 0) {
    rules.push({ key: 'jsonPath', label: advancedRuleLabels.jsonPath });
  }

  if (options.jsonIgnoreArrayOrder) {
    rules.push({ key: 'jsonArrayOrder', label: advancedRuleLabels.jsonArrayOrder });
  }

  if (options.tableIgnoredColumns.length > 0) {
    rules.push({ key: 'tableColumn', label: advancedRuleLabels.tableColumn });
  }

  if (options.tableIgnoredRows.length > 0) {
    rules.push({ key: 'tableRow', label: advancedRuleLabels.tableRow });
  }

  if (options.tableNumericTolerance !== null) {
    rules.push({ key: 'tableNumericTolerance', label: advancedRuleLabels.tableNumericTolerance });
  }

  return rules;
}

export function buildAdvancedRulesInfo(
  options: AdvancedRuleOptions,
  ignoredDifferences: AdvancedRuleIgnoredDifference[] = [],
  warnings: string[] = []
): AppliedAdvancedRulesInfo {
  return {
    enabled: options.enabled,
    options,
    active: getActiveAdvancedRules(options),
    ignoredDifferences: options.enabled ? ignoredDifferences : [],
    warnings: options.enabled ? [...new Set(warnings)] : []
  };
}

export function mergeAdvancedRulesInfo(
  options: AdvancedRuleOptions,
  infos: AppliedAdvancedRulesInfo[]
): AppliedAdvancedRulesInfo {
  return buildAdvancedRulesInfo(
    options,
    infos.flatMap((info) => info.ignoredDifferences),
    infos.flatMap((info) => info.warnings)
  );
}

function formatPreview(value: unknown) {
  const preview = value === undefined ? 'undefined' : typeof value === 'string' ? value : JSON.stringify(value);
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

function normalizeJsonPath(path: string) {
  return path.replace(/^\$\./, '').replace(/^\$/, '');
}

function matchesConfiguredJsonPath(path: string, configuredPath: string) {
  const normalizedPath = normalizeJsonPath(path);
  const normalizedConfiguredPath = normalizeJsonPath(configuredPath);

  return normalizedPath === normalizedConfiguredPath || path === configuredPath;
}

function shouldIgnoreJsonPath(options: AdvancedRuleOptions, path: string) {
  return options.jsonIgnoredPaths.some((configuredPath) => matchesConfiguredJsonPath(path, configuredPath));
}

function shouldIgnoreJsonField(options: AdvancedRuleOptions, key: string) {
  return options.jsonIgnoredFields.includes(key);
}

function createIgnoredDifference(input: AdvancedRuleIgnoredDifference) {
  return input;
}

export function applyTextAdvancedRules({
  content,
  lineNumber,
  options,
  side
}: {
  content: string;
  lineNumber: number;
  options: AdvancedRuleOptions;
  side: 'left' | 'right';
}): TextAdvancedRuleResult {
  if (!options.enabled) {
    return {
      ignoredLine: false,
      compareContent: content,
      ignoredDifferences: [],
      warnings: []
    };
  }

  const ignoredDifferences: AdvancedRuleIgnoredDifference[] = [];
  const keyword = options.textIgnoredLineKeywords.find((item) => content.includes(item));

  if (keyword) {
    ignoredDifferences.push(
      createIgnoredDifference({
        rule: 'textLineKeyword',
        label: advancedRuleLabels.textLineKeyword,
        path: `${side}:line:${lineNumber}`,
        leftValue: side === 'left' ? content : null,
        rightValue: side === 'right' ? content : null,
        reason: `行内容包含关键词 ${keyword}`
      })
    );

    return {
      ignoredLine: true,
      compareContent: '',
      ignoredDifferences,
      warnings: []
    };
  }

  let compareContent = content;
  const warnings: string[] = [];

  for (const pattern of options.textIgnoredRegexPatterns) {
    try {
      const regex = new RegExp(pattern, 'g');
      const nextContent = compareContent.replace(regex, '');

      if (nextContent !== compareContent) {
        ignoredDifferences.push(
          createIgnoredDifference({
            rule: 'textRegexContent',
            label: advancedRuleLabels.textRegexContent,
            path: `${side}:line:${lineNumber}`,
            leftValue: side === 'left' ? compareContent : null,
            rightValue: side === 'right' ? compareContent : null,
            reason: `已忽略正则 /${pattern}/ 匹配内容`
          })
        );
      }

      compareContent = nextContent;
    } catch (error) {
      warnings.push(`文本正则 /${pattern}/ 无效，已跳过。`);
    }
  }

  return {
    ignoredLine: false,
    compareContent,
    ignoredDifferences,
    warnings
  };
}

interface JsonPairResult {
  leftValue: unknown;
  rightValue: unknown;
  omit: boolean;
}

function applyJsonAdvancedRulesPair({
  ignoredDifferences,
  key,
  leftExists,
  leftValue,
  options,
  path,
  rightExists,
  rightValue
}: {
  ignoredDifferences: AdvancedRuleIgnoredDifference[];
  key: string;
  leftExists: boolean;
  leftValue: unknown;
  options: AdvancedRuleOptions;
  path: string;
  rightExists: boolean;
  rightValue: unknown;
}): JsonPairResult {
  if (key !== '$' && shouldIgnoreJsonField(options, key)) {
    if (stableSerialize(leftValue) !== stableSerialize(rightValue) || leftExists !== rightExists) {
      ignoredDifferences.push({
        rule: 'jsonField',
        label: advancedRuleLabels.jsonField,
        path,
        leftValue: leftExists ? formatPreview(leftValue) : null,
        rightValue: rightExists ? formatPreview(rightValue) : null,
        reason: `字段 ${key} 已被高级规则忽略`
      });
    }

    return { leftValue: undefined, rightValue: undefined, omit: true };
  }

  if (shouldIgnoreJsonPath(options, path)) {
    if (stableSerialize(leftValue) !== stableSerialize(rightValue) || leftExists !== rightExists) {
      ignoredDifferences.push({
        rule: 'jsonPath',
        label: advancedRuleLabels.jsonPath,
        path,
        leftValue: leftExists ? formatPreview(leftValue) : null,
        rightValue: rightExists ? formatPreview(rightValue) : null,
        reason: `路径 ${normalizeJsonPath(path)} 已被高级规则忽略`
      });
    }

    return { leftValue: undefined, rightValue: undefined, omit: true };
  }

  if (Array.isArray(leftValue) && Array.isArray(rightValue)) {
    const maxLength = Math.max(leftValue.length, rightValue.length);
    const normalizedLeft: unknown[] = [];
    const normalizedRight: unknown[] = [];

    for (let index = 0; index < maxLength; index += 1) {
      const childResult = applyJsonAdvancedRulesPair({
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

    if (options.jsonIgnoreArrayOrder) {
      const sortedLeft = [...normalizedLeft].sort((left, right) =>
        stableSerialize(left).localeCompare(stableSerialize(right))
      );
      const sortedRight = [...normalizedRight].sort((left, right) =>
        stableSerialize(left).localeCompare(stableSerialize(right))
      );

      if (
        stableSerialize(normalizedLeft) !== stableSerialize(normalizedRight) &&
        stableSerialize(sortedLeft) === stableSerialize(sortedRight)
      ) {
        ignoredDifferences.push({
          rule: 'jsonArrayOrder',
          label: advancedRuleLabels.jsonArrayOrder,
          path,
          leftValue: formatPreview(leftValue),
          rightValue: formatPreview(rightValue),
          reason: '数组元素顺序差异已被高级规则忽略'
        });
      }

      return { leftValue: sortedLeft, rightValue: sortedRight, omit: false };
    }

    return { leftValue: normalizedLeft, rightValue: normalizedRight, omit: false };
  }

  if (isRecord(leftValue) && isRecord(rightValue)) {
    const keys = [
      ...Object.keys(leftValue),
      ...Object.keys(rightValue).filter((childKey) => !hasOwn(leftValue, childKey))
    ];
    const normalizedLeft: Record<string, unknown> = {};
    const normalizedRight: Record<string, unknown> = {};

    for (const childKey of keys) {
      const childPath = formatObjectPath(path, childKey);
      const childResult = applyJsonAdvancedRulesPair({
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

    return { leftValue: normalizedLeft, rightValue: normalizedRight, omit: false };
  }

  return { leftValue, rightValue, omit: false };
}

export function applyJsonAdvancedRules(
  leftValue: unknown,
  rightValue: unknown,
  options: AdvancedRuleOptions
): JsonAdvancedRuleResult {
  if (!options.enabled) {
    return {
      leftValue,
      rightValue,
      advancedRules: buildAdvancedRulesInfo(options)
    };
  }

  const ignoredDifferences: AdvancedRuleIgnoredDifference[] = [];
  const normalized = applyJsonAdvancedRulesPair({
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
    advancedRules: buildAdvancedRulesInfo(options, ignoredDifferences)
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

function getHeaderName(rows: TableMatrix, columnIndex: number) {
  return rows[0]?.[columnIndex]?.trim() ?? '';
}

function shouldIgnoreTableColumn({
  columnIndex,
  leftRows,
  options,
  rightRows
}: {
  columnIndex: number;
  leftRows: TableMatrix;
  options: AdvancedRuleOptions;
  rightRows: TableMatrix;
}) {
  const columnName = columnNumberToName(columnIndex + 1);
  const leftHeader = getHeaderName(leftRows, columnIndex);
  const rightHeader = getHeaderName(rightRows, columnIndex);

  return options.tableIgnoredColumns.some((configuredColumn) => {
    const byName = configuredColumn === leftHeader || configuredColumn === rightHeader;
    const byLetter = configuredColumn.toUpperCase() === columnName;
    const byNumber = Number(configuredColumn) === columnIndex + 1;

    return byName || byLetter || byNumber;
  });
}

function parseNumber(value: string | null) {
  if (value === null || value.trim() === '') {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function tablePath({
  columnName,
  rowNumber,
  sheetName,
  sourceType
}: {
  columnName: string;
  rowNumber: number | null;
  sheetName: string | null;
  sourceType: TableSourceType;
}) {
  if (sourceType === 'excel') {
    return `${sheetName ?? 'Sheet'}!${columnName}${rowNumber ?? '-'}`;
  }

  return `R${rowNumber ?? '-'}C${columnName}`;
}

export function evaluateTableAdvancedRules({
  columnIndex,
  leftRows,
  leftValue,
  options,
  rightRows,
  rightValue,
  rowIndex,
  rowNumber,
  sheetName,
  sourceType
}: {
  columnIndex: number;
  leftRows: TableMatrix;
  leftValue: string | null;
  options: AdvancedRuleOptions;
  rightRows: TableMatrix;
  rightValue: string | null;
  rowIndex: number;
  rowNumber: number | null;
  sheetName: string | null;
  sourceType: TableSourceType;
}): TableAdvancedRuleDecision {
  if (!options.enabled) {
    return { ignored: false };
  }

  const columnName = columnNumberToName(columnIndex + 1);
  const path = tablePath({ columnName, rowNumber, sheetName, sourceType });

  if (shouldIgnoreTableColumn({ columnIndex, leftRows, options, rightRows })) {
    return {
      ignored: true,
      ignoredDifference: {
        rule: 'tableColumn',
        label: advancedRuleLabels.tableColumn,
        path,
        leftValue,
        rightValue,
        reason: `列 ${columnName} 已被高级规则忽略`
      }
    };
  }

  if (options.tableIgnoredRows.includes(rowNumber ?? rowIndex + 1)) {
    return {
      ignored: true,
      ignoredDifference: {
        rule: 'tableRow',
        label: advancedRuleLabels.tableRow,
        path,
        leftValue,
        rightValue,
        reason: `第 ${rowNumber ?? rowIndex + 1} 行已被高级规则忽略`
      }
    };
  }

  if (options.tableNumericTolerance !== null) {
    const leftNumber = parseNumber(leftValue);
    const rightNumber = parseNumber(rightValue);

    if (
      leftNumber !== null &&
      rightNumber !== null &&
      Math.abs(leftNumber - rightNumber) <= options.tableNumericTolerance
    ) {
      return {
        ignored: true,
        ignoredDifference: {
          rule: 'tableNumericTolerance',
          label: advancedRuleLabels.tableNumericTolerance,
          path,
          leftValue,
          rightValue,
          reason: `数值差值 ${Math.abs(leftNumber - rightNumber)} 小于或等于误差范围 ${options.tableNumericTolerance}`
        }
      };
    }
  }

  return { ignored: false };
}
