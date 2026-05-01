import { parseCsvText } from './csvParser.service.js';
import { compareTableMatrices } from './tableDiff.service.js';
import type { AdvancedRuleOptions, NormalizationOptions } from '../types/api.js';

export function compareCsvText(
  leftText: string,
  rightText: string,
  normalizationOptions?: NormalizationOptions,
  advancedRuleOptions?: AdvancedRuleOptions
) {
  const leftRows = parseCsvText(leftText);
  const rightRows = parseCsvText(rightText);

  return compareTableMatrices(leftRows, rightRows, {
    sourceType: 'csv',
    sheetName: null,
    idPrefix: 'csv',
    normalizationOptions,
    advancedRuleOptions
  });
}
