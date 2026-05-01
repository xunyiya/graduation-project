import { compareCsvText } from './csvDiff.service.js';
import { compareExcelBuffers } from './excelDiff.service.js';
import { compareJsonText } from './jsonDiff.service.js';
import { compareTextLines } from './textDiff.service.js';
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
  AppliedFilterInfo,
  AppliedNormalizationInfo,
  DiffSummary,
  DiffPerformanceInfo,
  DiffResultItem,
  DiffFilterOptions,
  NormalizationOptions,
  SupportedFileType,
  VersionChainResponse,
  VersionInfo,
  VersionIntervalCompare,
  VersionTrendDirection
} from '../types/api.js';

export interface VersionChainInput {
  buffer: Buffer;
  fileName: string | null;
  label?: string;
  size: number;
  text?: string;
}

interface IntervalDiffResult {
  summary: DiffSummary;
  result: DiffResultItem[];
  advancedRules?: AppliedAdvancedRulesInfo;
  normalization?: AppliedNormalizationInfo;
  performance: DiffPerformanceInfo;
}

function createVersionInfo(version: VersionChainInput, index: number): VersionInfo {
  return {
    id: `v${index + 1}`,
    label: version.label ?? `v${index + 1}`,
    fileName: version.fileName,
    index,
    size: version.size
  };
}

function getText(version: VersionChainInput) {
  return version.text ?? version.buffer.toString('utf8');
}

async function compareInterval({
  advancedRuleOptions,
  fileType,
  filterOptions,
  fromVersion,
  normalizationOptions,
  toVersion
}: {
  advancedRuleOptions: AdvancedRuleOptions;
  fileType: SupportedFileType;
  filterOptions: DiffFilterOptions;
  fromVersion: VersionChainInput;
  normalizationOptions: NormalizationOptions;
  toVersion: VersionChainInput;
}): Promise<IntervalDiffResult> {
  if (fileType === 'json') {
    return compareJsonText(
      getText(fromVersion),
      getText(toVersion),
      normalizationOptions,
      advancedRuleOptions
    );
  }

  if (fileType === 'csv') {
    return compareCsvText(getText(fromVersion), getText(toVersion), normalizationOptions, advancedRuleOptions);
  }

  if (fileType === 'excel') {
    return compareExcelBuffers(
      fromVersion.buffer,
      toVersion.buffer,
      normalizationOptions,
      advancedRuleOptions
    );
  }

  return compareTextLines(getText(fromVersion), getText(toVersion), filterOptions, advancedRuleOptions);
}

function buildTrend(intervals: VersionIntervalCompare[]) {
  const summary = intervals.reduce(
    (current, interval) => {
      current.totalDifferences += interval.summary.total;
      current.added += interval.summary.added;
      current.removed += interval.summary.removed;
      current.modified += interval.summary.modified;

      if (interval.summary.total > current.peakDifferenceCount) {
        current.peakIntervalId = interval.id;
        current.peakIntervalLabel = interval.label;
        current.peakDifferenceCount = interval.summary.total;
      }

      return current;
    },
    {
      intervalCount: intervals.length,
      totalDifferences: 0,
      peakIntervalId: null as string | null,
      peakIntervalLabel: null as string | null,
      peakDifferenceCount: 0,
      added: 0,
      removed: 0,
      modified: 0,
      direction: 'stable' as VersionTrendDirection
    }
  );
  const totals = intervals.map((interval) => interval.summary.total);
  const increasing = totals.length > 1 && totals.every((value, index) => index === 0 || value >= totals[index - 1]);
  const decreasing = totals.length > 1 && totals.every((value, index) => index === 0 || value <= totals[index - 1]);
  const allSame = totals.every((value) => value === totals[0]);

  if (totals.length <= 1 || allSame) {
    summary.direction = 'stable';
  } else if (increasing) {
    summary.direction = 'increasing';
  } else if (decreasing) {
    summary.direction = 'decreasing';
  } else {
    summary.direction = 'mixed';
  }

  return summary;
}

export async function compareVersionChain({
  advancedRuleOptions = defaultAdvancedRuleOptions,
  fileType,
  filterInfo,
  filterOptions,
  normalizationOptions = defaultNormalizationOptions,
  versions
}: {
  advancedRuleOptions?: AdvancedRuleOptions;
  fileType: SupportedFileType;
  filterInfo: AppliedFilterInfo;
  filterOptions: DiffFilterOptions;
  normalizationOptions?: NormalizationOptions;
  versions: VersionChainInput[];
}): Promise<VersionChainResponse> {
  const versionInfos = versions.map(createVersionInfo);
  const intervals: VersionIntervalCompare[] = [];
  const advancedRuleInfos: AppliedAdvancedRulesInfo[] = [];
  const normalizationInfos: AppliedNormalizationInfo[] = [];

  for (let index = 0; index < versions.length - 1; index += 1) {
    const fromInfo = versionInfos[index];
    const toInfo = versionInfos[index + 1];
    const diff = await compareInterval({
      advancedRuleOptions,
      fileType,
      filterOptions,
      fromVersion: versions[index],
      normalizationOptions,
      toVersion: versions[index + 1]
    });
    const advancedRules = diff.advancedRules ?? buildAdvancedRulesInfo(advancedRuleOptions);
    const normalization = diff.normalization ?? buildNormalizationInfo(normalizationOptions);

    advancedRuleInfos.push(advancedRules);
    normalizationInfos.push(normalization);
    intervals.push({
      id: `${fromInfo.id}-${toInfo.id}`,
      fromVersionId: fromInfo.id,
      toVersionId: toInfo.id,
      label: `${fromInfo.label} -> ${toInfo.label}`,
      summary: diff.summary,
      result: diff.result,
      advancedRules,
      normalization,
      performance: diff.performance
    });
  }

  return {
    success: true,
    fileType,
    versions: versionInfos,
    intervals,
    trend: buildTrend(intervals),
    filters: filterInfo,
    advancedRules:
      advancedRuleInfos.length > 0
        ? mergeAdvancedRulesInfo(advancedRuleOptions, advancedRuleInfos)
        : buildAdvancedRulesInfo(advancedRuleOptions),
    normalization:
      normalizationInfos.length > 0
        ? mergeNormalizationInfo(normalizationOptions, normalizationInfos)
        : buildNormalizationInfo(normalizationOptions),
    message: `已完成 ${Math.max(0, versions.length - 1)} 个版本区间的连续对比。`,
    received: {
      versionCount: versions.length,
      intervalCount: intervals.length,
      totalSize: versions.reduce((total, version) => total + version.size, 0)
    }
  };
}

export function emptyVersionChainResponse({
  fileType,
  filterInfo,
  message
}: {
  fileType: SupportedFileType;
  filterInfo: AppliedFilterInfo;
  message: string;
}): VersionChainResponse {
  return {
    success: false,
    fileType,
    versions: [],
    intervals: [],
    trend: {
      intervalCount: 0,
      totalDifferences: 0,
      peakIntervalId: null,
      peakIntervalLabel: null,
      peakDifferenceCount: 0,
      added: 0,
      removed: 0,
      modified: 0,
      direction: 'stable'
    },
    filters: filterInfo,
    advancedRules: buildAdvancedRulesInfo(defaultAdvancedRuleOptions),
    normalization: buildNormalizationInfo(defaultNormalizationOptions),
    message,
    received: {}
  };
}
