import type { ActiveFilter, DiffFilterOptions, DiffFilterKey } from '../types/api.js';

const filterDefinitions: Array<{ key: DiffFilterKey; label: string }> = [
  { key: 'ignoreWhitespace', label: '忽略空白字符' },
  { key: 'ignoreCase', label: '忽略大小写差异' },
  { key: 'ignoreComments', label: '忽略注释内容' }
];

export const defaultFilterOptions: DiffFilterOptions = {
  ignoreWhitespace: false,
  ignoreCase: false,
  ignoreComments: false
};

function parseBoolean(value: unknown) {
  return value === true || value === 'true' || value === 'on' || value === '1';
}

function stripLineComment(value: string) {
  const commentIndexes = [value.indexOf('//'), value.indexOf('#')].filter((index) => index >= 0);

  if (commentIndexes.length === 0) {
    return value;
  }

  return value.slice(0, Math.min(...commentIndexes)).trimEnd();
}

export function normalizeFilterOptions(rawOptions: Record<string, unknown>): DiffFilterOptions {
  return {
    ignoreWhitespace: parseBoolean(rawOptions.ignoreWhitespace),
    ignoreCase: parseBoolean(rawOptions.ignoreCase),
    ignoreComments: parseBoolean(rawOptions.ignoreComments)
  };
}

export function getActiveFilters(options: DiffFilterOptions): ActiveFilter[] {
  return filterDefinitions.filter((definition) => options[definition.key]);
}

export function normalizeComparableText(value: string, options: DiffFilterOptions) {
  let normalizedValue = value;

  if (options.ignoreComments) {
    normalizedValue = stripLineComment(normalizedValue);
  }

  if (options.ignoreWhitespace) {
    normalizedValue = normalizedValue.replace(/\s+/g, '');
  }

  if (options.ignoreCase) {
    normalizedValue = normalizedValue.toLowerCase();
  }

  return normalizedValue;
}

export function buildFilterInfo(options: DiffFilterOptions) {
  return {
    options,
    active: getActiveFilters(options)
  };
}
