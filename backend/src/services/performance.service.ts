import type { DiffPerformanceInfo } from '../types/api.js';

export const defaultResultLimit = 5000;
export const textExactLcsCellLimit = 2_000_000;
export const inlineDiffCellLimit = 200_000;

export function buildPerformanceInfo({
  algorithm,
  resultCount,
  resultLimit = defaultResultLimit,
  resultTruncated,
  warnings = []
}: {
  algorithm: string;
  resultCount: number;
  resultLimit?: number;
  resultTruncated: boolean;
  warnings?: string[];
}): DiffPerformanceInfo {
  return {
    algorithm,
    resultLimit,
    resultCount,
    resultTruncated,
    warnings
  };
}

export function emptyPerformanceInfo(algorithm = 'none'): DiffPerformanceInfo {
  return buildPerformanceInfo({
    algorithm,
    resultCount: 0,
    resultTruncated: false
  });
}
