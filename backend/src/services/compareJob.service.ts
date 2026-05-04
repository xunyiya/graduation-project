import type {
  AppliedAdvancedRulesInfo,
  AppliedFilterInfo,
  AppliedNormalizationInfo,
  CompareResponse,
  DiffPerformanceInfo,
  DiffResultItem,
  DiffSummary,
  SupportedFileType,
  VersionChainResponse
} from '../types/api.js';
import { buildAdvancedRulesInfo, defaultAdvancedRuleOptions } from './advancedRules.service.js';
import { database } from './database.service.js';
import { buildNormalizationInfo, defaultNormalizationOptions } from './normalization.service.js';

export type CompareJobInputMode = 'pair' | 'versions';

export interface CompareJobRecord {
  id: number;
  userId: number;
  title: string;
  fileType: SupportedFileType;
  inputMode: CompareJobInputMode;
  status: string;
  algorithm: string | null;
  durationMs: number;
  resultCount: number;
  resultTruncated: boolean;
  createdAt: string;
  updatedAt: string;
  files: CompareJobFileRecord[];
  result: CompareResultRecord | null;
}

export interface CompareJobFileRecord {
  id: number;
  jobId: number;
  fileId: number | null;
  role: string;
  versionIndex: number | null;
  displayName: string;
  createdAt: string;
}

export interface CompareResultRecord {
  id: number;
  jobId: number;
  summary: DiffSummary;
  filters: AppliedFilterInfo;
  advancedRules: AppliedAdvancedRulesInfo;
  normalization: AppliedNormalizationInfo;
  performance: DiffPerformanceInfo;
  resultJson: DiffResultItem[] | VersionChainResponse | unknown;
  received: Record<string, unknown>;
  createdAt: string;
}

export interface CreateCompareJobInput {
  title: string;
  fileType: SupportedFileType;
  inputMode: CompareJobInputMode;
  status: string;
  algorithm?: string | null;
  durationMs?: number;
  resultCount?: number;
  resultTruncated?: boolean;
}

export interface AttachJobFileInput {
  fileId?: number | null;
  role: string;
  versionIndex?: number | null;
  displayName: string;
}

interface CompareJobRow {
  id: number;
  user_id: number;
  title: string;
  file_type: SupportedFileType;
  input_mode: CompareJobInputMode;
  status: string;
  algorithm: string | null;
  duration_ms: number | null;
  result_count: number | null;
  result_truncated: number;
  created_at: string;
  updated_at: string;
}

interface CompareJobFileRow {
  id: number;
  job_id: number;
  file_id: number | null;
  role: string;
  version_index: number | null;
  display_name: string;
  created_at: string;
}

interface CompareResultRow {
  id: number;
  job_id: number;
  summary: string;
  filters: string;
  advanced_rules: string;
  normalization: string;
  performance: string;
  result_json: string;
  received: string;
  created_at: string;
}

function parseJsonField<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function emptySummary(): DiffSummary {
  return {
    total: 0,
    added: 0,
    removed: 0,
    modified: 0
  };
}

function emptyFilters(): AppliedFilterInfo {
  return {
    options: {
      ignoreWhitespace: false,
      ignoreCase: false,
      ignoreComments: false
    },
    active: []
  };
}

function emptyPerformance(): DiffPerformanceInfo {
  return {
    algorithm: 'unknown',
    resultLimit: 0,
    resultCount: 0,
    resultTruncated: false,
    warnings: []
  };
}

function mapCompareJobFileRow(row: CompareJobFileRow): CompareJobFileRecord {
  return {
    id: row.id,
    jobId: row.job_id,
    fileId: row.file_id,
    role: row.role,
    versionIndex: row.version_index,
    displayName: row.display_name,
    createdAt: row.created_at
  };
}

export function mapCompareJobRow(row: CompareJobRow): CompareJobRecord {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    fileType: row.file_type,
    inputMode: row.input_mode,
    status: row.status,
    algorithm: row.algorithm,
    durationMs: row.duration_ms ?? 0,
    resultCount: row.result_count ?? 0,
    resultTruncated: row.result_truncated === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    files: [],
    result: null
  };
}

export function mapCompareResultRow(row: CompareResultRow): CompareResultRecord {
  return {
    id: row.id,
    jobId: row.job_id,
    summary: parseJsonField<DiffSummary>(row.summary, emptySummary()),
    filters: parseJsonField<AppliedFilterInfo>(row.filters, emptyFilters()),
    advancedRules: parseJsonField<AppliedAdvancedRulesInfo>(
      row.advanced_rules,
      buildAdvancedRulesInfo(defaultAdvancedRuleOptions)
    ),
    normalization: parseJsonField<AppliedNormalizationInfo>(
      row.normalization,
      buildNormalizationInfo(defaultNormalizationOptions)
    ),
    performance: parseJsonField<DiffPerformanceInfo>(row.performance, emptyPerformance()),
    resultJson: parseJsonField<unknown>(row.result_json, []),
    received: parseJsonField<Record<string, unknown>>(row.received, {}),
    createdAt: row.created_at
  };
}

function readJobFiles(jobId: number): CompareJobFileRecord[] {
  const rows = database
    .prepare(
      `SELECT id, job_id, file_id, role, version_index, display_name, created_at
       FROM compare_job_files
       WHERE job_id = ?
       ORDER BY COALESCE(version_index, id), id`
    )
    .all(jobId) as unknown as CompareJobFileRow[];

  return rows.map(mapCompareJobFileRow);
}

function readJobResult(jobId: number): CompareResultRecord | null {
  const row = database
    .prepare(
      `SELECT
         id,
         job_id,
         summary,
         filters,
         advanced_rules,
         normalization,
         performance,
         result_json,
         received,
         created_at
       FROM compare_results
       WHERE job_id = ?`
    )
    .get(jobId) as CompareResultRow | undefined;

  return row ? mapCompareResultRow(row) : null;
}

function hydrateJob(job: CompareJobRecord): CompareJobRecord {
  return {
    ...job,
    files: readJobFiles(job.id),
    result: readJobResult(job.id)
  };
}

function isVersionChainResponse(
  response: CompareResponse | VersionChainResponse
): response is VersionChainResponse {
  return 'intervals' in response && 'trend' in response;
}

function getResultSummary(response: CompareResponse | VersionChainResponse): DiffSummary {
  if (!isVersionChainResponse(response)) {
    return response.summary;
  }

  return {
    total: response.trend.totalDifferences,
    added: response.trend.added,
    removed: response.trend.removed,
    modified: response.trend.modified
  };
}

function getResultPerformance(response: CompareResponse | VersionChainResponse): DiffPerformanceInfo {
  if (!isVersionChainResponse(response)) {
    return response.performance;
  }

  const warnings = response.intervals.flatMap((interval) => interval.performance.warnings);

  return {
    algorithm: 'version-chain',
    resultLimit: Math.max(...response.intervals.map((interval) => interval.performance.resultLimit), 0),
    resultCount: response.trend.totalDifferences,
    resultTruncated: response.intervals.some((interval) => interval.performance.resultTruncated),
    warnings
  };
}

function getResultJson(response: CompareResponse | VersionChainResponse) {
  return isVersionChainResponse(response) ? response : response.result;
}

export function createCompareJob(userId: number, input: CreateCompareJobInput): CompareJobRecord {
  const createdAt = new Date().toISOString();
  const result = database
    .prepare(
      `INSERT INTO compare_jobs
        (
          user_id,
          title,
          file_type,
          input_mode,
          status,
          algorithm,
          duration_ms,
          result_count,
          result_truncated,
          created_at,
          updated_at
        )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      userId,
      input.title,
      input.fileType,
      input.inputMode,
      input.status,
      input.algorithm ?? null,
      input.durationMs ?? 0,
      input.resultCount ?? 0,
      input.resultTruncated ? 1 : 0,
      createdAt,
      createdAt
    );

  const job = getCompareJobById(userId, Number(result.lastInsertRowid));

  if (!job) {
    throw new Error('对比任务创建失败');
  }

  return job;
}

export function attachJobFile(jobId: number, input: AttachJobFileInput): CompareJobFileRecord {
  const createdAt = new Date().toISOString();
  const result = database
    .prepare(
      `INSERT INTO compare_job_files
        (job_id, file_id, role, version_index, display_name, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      jobId,
      input.fileId ?? null,
      input.role,
      input.versionIndex ?? null,
      input.displayName,
      createdAt
    );

  const row = database
    .prepare(
      `SELECT id, job_id, file_id, role, version_index, display_name, created_at
       FROM compare_job_files
       WHERE id = ?`
    )
    .get(Number(result.lastInsertRowid)) as CompareJobFileRow | undefined;

  if (!row) {
    throw new Error('对比任务文件关联失败');
  }

  return mapCompareJobFileRow(row);
}

export function saveCompareResult(
  jobId: number,
  compareResponse: CompareResponse | VersionChainResponse
): CompareResultRecord {
  const createdAt = new Date().toISOString();

  database
    .prepare(
      `INSERT INTO compare_results
        (
          job_id,
          summary,
          filters,
          advanced_rules,
          normalization,
          performance,
          result_json,
          received,
          created_at
        )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(job_id) DO UPDATE SET
         summary = excluded.summary,
         filters = excluded.filters,
         advanced_rules = excluded.advanced_rules,
         normalization = excluded.normalization,
         performance = excluded.performance,
         result_json = excluded.result_json,
         received = excluded.received,
         created_at = excluded.created_at`
    )
    .run(
      jobId,
      JSON.stringify(getResultSummary(compareResponse)),
      JSON.stringify(compareResponse.filters),
      JSON.stringify(compareResponse.advancedRules),
      JSON.stringify(compareResponse.normalization),
      JSON.stringify(getResultPerformance(compareResponse)),
      JSON.stringify(getResultJson(compareResponse)),
      JSON.stringify(compareResponse.received),
      createdAt
    );

  const result = readJobResult(jobId);

  if (!result) {
    throw new Error('对比任务结果保存失败');
  }

  return result;
}

export function getCompareJobById(userId: number, jobId: number): CompareJobRecord | null {
  const row = database
    .prepare(
      `SELECT
         id,
         user_id,
         title,
         file_type,
         input_mode,
         status,
         algorithm,
         duration_ms,
         result_count,
         result_truncated,
         created_at,
         updated_at
       FROM compare_jobs
       WHERE user_id = ? AND id = ?`
    )
    .get(userId, jobId) as CompareJobRow | undefined;

  return row ? hydrateJob(mapCompareJobRow(row)) : null;
}

export function listCompareJobs(userId: number): CompareJobRecord[] {
  const rows = database
    .prepare(
      `SELECT
         id,
         user_id,
         title,
         file_type,
         input_mode,
         status,
         algorithm,
         duration_ms,
         result_count,
         result_truncated,
         created_at,
         updated_at
       FROM compare_jobs
       WHERE user_id = ?
       ORDER BY created_at DESC, id DESC`
    )
    .all(userId) as unknown as CompareJobRow[];

  return rows.map(mapCompareJobRow);
}

export function deleteCompareJobById(userId: number, jobId: number): boolean {
  const result = database
    .prepare('DELETE FROM compare_jobs WHERE user_id = ? AND id = ?')
    .run(userId, jobId);

  return result.changes > 0;
}
