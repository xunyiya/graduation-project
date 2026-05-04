import {
  defaultAdvancedRuleFormState,
  defaultNormalizationFormState,
  type AdvancedRuleFormState,
  type NormalizationFormState
} from '../components/compare/CompareInputForm';
import type { DiffFilterOptions } from '../types/api';

const defaultFilterOptions: DiffFilterOptions = {
  ignoreWhitespace: false,
  ignoreCase: false,
  ignoreComments: false
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readBoolean(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function readListText(value: unknown) {
  if (Array.isArray(value)) {
    return value.join(', ');
  }

  return typeof value === 'string' ? value : '';
}

function readNumberText(value: unknown, fallback: string) {
  return typeof value === 'number' && Number.isFinite(value)
    ? String(value)
    : typeof value === 'string'
      ? value
      : fallback;
}

export function normalizeFiltersForForm(value: unknown): DiffFilterOptions {
  if (!isRecord(value)) {
    return defaultFilterOptions;
  }

  return {
    ignoreWhitespace: readBoolean(value.ignoreWhitespace),
    ignoreCase: readBoolean(value.ignoreCase),
    ignoreComments: readBoolean(value.ignoreComments)
  };
}

export function normalizeAdvancedRulesForForm(value: unknown): AdvancedRuleFormState {
  if (!isRecord(value)) {
    return defaultAdvancedRuleFormState;
  }

  const tableNumericTolerance = value.tableNumericTolerance;

  return {
    ...defaultAdvancedRuleFormState,
    enabled: readBoolean(value.enabled, defaultAdvancedRuleFormState.enabled),
    textIgnoredLineKeywords: readListText(value.textIgnoredLineKeywords),
    textIgnoredRegexPatterns: readListText(value.textIgnoredRegexPatterns),
    jsonIgnoredFields: readListText(value.jsonIgnoredFields),
    jsonIgnoredPaths: readListText(value.jsonIgnoredPaths),
    jsonIgnoreArrayOrder: readBoolean(value.jsonIgnoreArrayOrder),
    tableIgnoredColumns: readListText(value.tableIgnoredColumns),
    tableIgnoredRows: readListText(value.tableIgnoredRows),
    tableNumericToleranceEnabled: readBoolean(
      value.tableNumericToleranceEnabled,
      tableNumericTolerance !== null && tableNumericTolerance !== undefined
    ),
    tableNumericTolerance: readNumberText(
      tableNumericTolerance,
      defaultAdvancedRuleFormState.tableNumericTolerance
    )
  };
}

export function normalizeNormalizationForForm(value: unknown): NormalizationFormState {
  if (!isRecord(value)) {
    return defaultNormalizationFormState;
  }

  const numericTolerance = value.numericTolerance;

  return {
    ...defaultNormalizationFormState,
    enabled: readBoolean(value.enabled, defaultNormalizationFormState.enabled),
    ignoreJsonFieldOrder: readBoolean(
      value.ignoreJsonFieldOrder,
      defaultNormalizationFormState.ignoreJsonFieldOrder
    ),
    ignoredJsonFields: readListText(value.ignoredJsonFields),
    emptyValuesEquivalent: readBoolean(value.emptyValuesEquivalent),
    numericToleranceEnabled: readBoolean(
      value.numericToleranceEnabled,
      numericTolerance !== null && numericTolerance !== undefined
    ),
    numericTolerance: readNumberText(numericTolerance, defaultNormalizationFormState.numericTolerance),
    normalizeDateFormat: readBoolean(value.normalizeDateFormat),
    tablePrimaryKeyColumns: readListText(value.tablePrimaryKeyColumns)
  };
}

export function applyThemePreference(theme: 'light' | 'dark') {
  document.documentElement.dataset.theme = theme;
}
