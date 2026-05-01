import type { RequestFileType, SupportedFileType } from '../types/api.js';

const supportedRequestTypes = new Set<RequestFileType>(['auto', 'text', 'json', 'csv', 'excel']);

export function normalizeRequestedFileType(value: unknown): RequestFileType | null {
  if (typeof value !== 'string' || value.trim() === '') {
    return 'auto';
  }

  return supportedRequestTypes.has(value as RequestFileType) ? (value as RequestFileType) : null;
}

function hasJsonFileName(fileName: string | null | undefined) {
  return Boolean(fileName?.toLowerCase().endsWith('.json'));
}

function hasCsvFileName(fileName: string | null | undefined) {
  return Boolean(fileName?.toLowerCase().endsWith('.csv'));
}

function hasExcelFileName(fileName: string | null | undefined) {
  const normalizedFileName = fileName?.toLowerCase();

  return Boolean(normalizedFileName?.endsWith('.xlsx') || normalizedFileName?.endsWith('.xls'));
}

function canParseJson(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue.startsWith('{') && !trimmedValue.startsWith('[')) {
    return false;
  }

  try {
    JSON.parse(trimmedValue);
    return true;
  } catch {
    return false;
  }
}

export function detectFileType({
  requestedFileType,
  leftFileName,
  rightFileName,
  leftText,
  rightText
}: {
  requestedFileType: RequestFileType;
  leftFileName?: string | null;
  rightFileName?: string | null;
  leftText: string;
  rightText: string;
}): SupportedFileType {
  if (
    requestedFileType === 'text' ||
    requestedFileType === 'json' ||
    requestedFileType === 'csv' ||
    requestedFileType === 'excel'
  ) {
    return requestedFileType;
  }

  if (hasExcelFileName(leftFileName) || hasExcelFileName(rightFileName)) {
    return 'excel';
  }

  if (hasJsonFileName(leftFileName) || hasJsonFileName(rightFileName)) {
    return 'json';
  }

  if (hasCsvFileName(leftFileName) || hasCsvFileName(rightFileName)) {
    return 'csv';
  }

  if (canParseJson(leftText) && canParseJson(rightText)) {
    return 'json';
  }

  return 'text';
}
