import { parseExcelBuffer } from './excelParser.service.js';
import {
  compareTableMatrices,
  createEmptySummary,
  createSheetDiffItem,
  mergeSummary
} from './tableDiff.service.js';
import { buildPerformanceInfo, defaultResultLimit } from './performance.service.js';
import {
  buildAdvancedRulesInfo,
  defaultAdvancedRuleOptions,
  mergeAdvancedRulesInfo
} from './advancedRules.service.js';
import {
  buildNormalizationInfo,
  defaultNormalizationOptions,
  mergeNormalizationInfo
} from './normalization.service.js';
import type {
  AdvancedRuleOptions,
  AppliedAdvancedRulesInfo,
  AppliedNormalizationInfo,
  NormalizationOptions,
  TableDiffItem
} from '../types/api.js';

export async function compareExcelBuffers(
  leftBuffer: Buffer,
  rightBuffer: Buffer,
  normalizationOptions: NormalizationOptions = defaultNormalizationOptions,
  advancedRuleOptions: AdvancedRuleOptions = defaultAdvancedRuleOptions
) {
  const leftSheets = await parseExcelBuffer(leftBuffer);
  const rightSheets = await parseExcelBuffer(rightBuffer);
  const leftSheetMap = new Map(leftSheets.map((sheet) => [sheet.name, sheet]));
  const rightSheetMap = new Map(rightSheets.map((sheet) => [sheet.name, sheet]));
  const sheetNames = [
    ...leftSheets.map((sheet) => sheet.name),
    ...rightSheets.map((sheet) => sheet.name).filter((name) => !leftSheetMap.has(name))
  ];
  const summary = createEmptySummary();
  const result: TableDiffItem[] = [];
  const normalizationInfos: AppliedNormalizationInfo[] = [];
  const advancedRuleInfos: AppliedAdvancedRulesInfo[] = [];

  for (const sheetName of sheetNames) {
    const leftSheet = leftSheetMap.get(sheetName);
    const rightSheet = rightSheetMap.get(sheetName);

    if (!leftSheet) {
      summary.added += 1;
      summary.total += 1;
      if (result.length < defaultResultLimit) {
        result.push(createSheetDiffItem({ sheetName, type: 'added' }));
      }
      continue;
    }

    if (!rightSheet) {
      summary.removed += 1;
      summary.total += 1;
      if (result.length < defaultResultLimit) {
        result.push(createSheetDiffItem({ sheetName, type: 'removed' }));
      }
      continue;
    }

    const sheetDiff = compareTableMatrices(leftSheet.rows, rightSheet.rows, {
      sourceType: 'excel',
      sheetName,
      idPrefix: `excel:${sheetName}`,
      normalizationOptions,
      advancedRuleOptions
    });

    advancedRuleInfos.push(sheetDiff.advancedRules);
    normalizationInfos.push(sheetDiff.normalization);
    mergeSummary(summary, sheetDiff.summary);
    if (result.length < defaultResultLimit) {
      result.push(...sheetDiff.result.slice(0, defaultResultLimit - result.length));
    }
  }

  return {
    summary,
    result,
    advancedRules:
      advancedRuleInfos.length > 0
        ? mergeAdvancedRulesInfo(advancedRuleOptions, advancedRuleInfos)
        : buildAdvancedRulesInfo(advancedRuleOptions),
    normalization:
      normalizationInfos.length > 0
        ? mergeNormalizationInfo(normalizationOptions, normalizationInfos)
        : buildNormalizationInfo(normalizationOptions),
    performance: buildPerformanceInfo({
      algorithm: 'excel-sheet-and-cell-scan',
      resultCount: result.length,
      resultTruncated: summary.total > result.length,
      warnings:
        summary.total > result.length
          ? ['Excel 差异数量较多，接口只返回前部分差异用于页面展示。']
          : []
    })
  };
}
