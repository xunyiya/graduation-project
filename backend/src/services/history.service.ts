import type {
  AppliedFilterInfo,
  CompareResponse,
  DiffSummary,
  HistoryRecord,
  SupportedFileType
} from '../types/api.js';
import { buildAdvancedRulesInfo, defaultAdvancedRuleOptions } from './advancedRules.service.js';
import { database } from './database.service.js';
import { buildNormalizationInfo, defaultNormalizationOptions } from './normalization.service.js';

interface HistoryRow {
  id: number;
  user_id: number;
  file_type: SupportedFileType;
  left_file_name: string;
  right_file_name: string;
  summary: string;
  filters: string;
  compare_result: string;
  created_at: string;
}

export interface CreateHistoryInput {
  fileType: SupportedFileType;
  leftFileName: string;
  rightFileName: string;
  summary: DiffSummary;
  filters: AppliedFilterInfo;
  compareResult: CompareResponse;
}

function parseJsonField<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function mapHistoryRow(row: HistoryRow): HistoryRecord {
  return {
    id: String(row.id),
    createdAt: row.created_at,
    fileType: row.file_type,
    fileNames: {
      left: row.left_file_name,
      right: row.right_file_name
    },
    summary: parseJsonField<DiffSummary>(row.summary, {
      total: 0,
      added: 0,
      removed: 0,
      modified: 0
    }),
    filters: parseJsonField<AppliedFilterInfo>(row.filters, {
      options: {
        ignoreWhitespace: false,
        ignoreCase: false,
        ignoreComments: false
      },
      active: []
    }),
    compareResult: parseJsonField<CompareResponse>(row.compare_result, {
      success: false,
      fileType: row.file_type,
      summary: {
        total: 0,
        added: 0,
        removed: 0,
        modified: 0
      },
      result: [],
      filters: {
        options: {
          ignoreWhitespace: false,
          ignoreCase: false,
          ignoreComments: false
        },
        active: []
      },
      advancedRules: buildAdvancedRulesInfo(defaultAdvancedRuleOptions),
      normalization: buildNormalizationInfo(defaultNormalizationOptions),
      performance: {
        algorithm: 'unknown',
        resultLimit: 0,
        resultCount: 0,
        resultTruncated: false,
        warnings: []
      },
      message: '历史记录解析失败',
      received: {}
    })
  };
}

export function listHistoryRecords(userId: number): HistoryRecord[] {
  const rows = database
    .prepare(
      `SELECT id, user_id, file_type, left_file_name, right_file_name, summary, filters, compare_result, created_at
       FROM history_records
       WHERE user_id = ?
       ORDER BY created_at DESC, id DESC`
    )
    .all(userId) as unknown as HistoryRow[];

  return rows.map(mapHistoryRow);
}

export function getHistoryRecordById(userId: number, id: number): HistoryRecord | null {
  const row = database
    .prepare(
      `SELECT id, user_id, file_type, left_file_name, right_file_name, summary, filters, compare_result, created_at
       FROM history_records
       WHERE user_id = ? AND id = ?`
    )
    .get(userId, id) as HistoryRow | undefined;

  return row ? mapHistoryRow(row) : null;
}

export function createHistoryRecord(userId: number, input: CreateHistoryInput): HistoryRecord {
  const createdAt = new Date().toISOString();
  const result = database
    .prepare(
      `INSERT INTO history_records
        (user_id, file_type, left_file_name, right_file_name, summary, filters, compare_result, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      userId,
      input.fileType,
      input.leftFileName,
      input.rightFileName,
      JSON.stringify(input.summary),
      JSON.stringify(input.filters),
      JSON.stringify(input.compareResult),
      createdAt
    );

  const record = getHistoryRecordById(userId, Number(result.lastInsertRowid));

  if (!record) {
    throw new Error('历史记录保存失败');
  }

  return record;
}

export function deleteHistoryRecordById(userId: number, id: number): boolean {
  const result = database
    .prepare('DELETE FROM history_records WHERE user_id = ? AND id = ?')
    .run(userId, id);

  return result.changes > 0;
}
