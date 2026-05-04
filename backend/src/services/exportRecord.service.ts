import type { ExportOptions } from '../types/api.js';
import { database } from './database.service.js';

export interface ExportRecord {
  id: number;
  userId: number;
  jobId: number | null;
  jobTitle: string | null;
  exportType: string;
  fileName: string;
  options: ExportOptions | Record<string, unknown>;
  createdAt: string;
}

export interface CreateExportRecordInput {
  jobId?: number | null;
  exportType: string;
  fileName: string;
  options: ExportOptions | Record<string, unknown>;
}

interface ExportRecordRow {
  id: number;
  user_id: number;
  job_id: number | null;
  job_title: string | null;
  export_type: string;
  file_name: string;
  options: string;
  created_at: string;
}

function parseJsonField<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function mapExportRecordRow(row: ExportRecordRow): ExportRecord {
  return {
    id: row.id,
    userId: row.user_id,
    jobId: row.job_id,
    jobTitle: row.job_title,
    exportType: row.export_type,
    fileName: row.file_name,
    options: parseJsonField<ExportOptions | Record<string, unknown>>(row.options, {}),
    createdAt: row.created_at
  };
}

function jobBelongsToUser(userId: number, jobId: number) {
  const row = database
    .prepare('SELECT id FROM compare_jobs WHERE user_id = ? AND id = ?')
    .get(userId, jobId) as { id: number } | undefined;

  return Boolean(row);
}

function readExportRecordById(userId: number, exportRecordId: number): ExportRecord | null {
  const row = database
    .prepare(
      `SELECT
         records.id,
         records.user_id,
         records.job_id,
         jobs.title AS job_title,
         records.export_type,
         records.file_name,
         records.options,
         records.created_at
       FROM export_records AS records
       LEFT JOIN compare_jobs AS jobs ON jobs.id = records.job_id AND jobs.user_id = records.user_id
       WHERE records.user_id = ? AND records.id = ?`
    )
    .get(userId, exportRecordId) as ExportRecordRow | undefined;

  return row ? mapExportRecordRow(row) : null;
}

export function createExportRecord(
  userId: number,
  input: CreateExportRecordInput
): ExportRecord | null {
  const jobId = input.jobId ?? null;

  if (jobId !== null && !jobBelongsToUser(userId, jobId)) {
    return null;
  }

  const createdAt = new Date().toISOString();
  const result = database
    .prepare(
      `INSERT INTO export_records
        (user_id, job_id, export_type, file_name, options, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      userId,
      jobId,
      input.exportType,
      input.fileName,
      JSON.stringify(input.options ?? {}),
      createdAt
    );

  return readExportRecordById(userId, Number(result.lastInsertRowid));
}

export function listExportRecords(userId: number): ExportRecord[] {
  const rows = database
    .prepare(
      `SELECT
         records.id,
         records.user_id,
         records.job_id,
         jobs.title AS job_title,
         records.export_type,
         records.file_name,
         records.options,
         records.created_at
       FROM export_records AS records
       LEFT JOIN compare_jobs AS jobs ON jobs.id = records.job_id AND jobs.user_id = records.user_id
       WHERE records.user_id = ?
       ORDER BY records.created_at DESC, records.id DESC`
    )
    .all(userId) as unknown as ExportRecordRow[];

  return rows.map(mapExportRecordRow);
}

export function listExportRecordsByJob(userId: number, jobId: number): ExportRecord[] | null {
  if (!jobBelongsToUser(userId, jobId)) {
    return null;
  }

  const rows = database
    .prepare(
      `SELECT
         records.id,
         records.user_id,
         records.job_id,
         jobs.title AS job_title,
         records.export_type,
         records.file_name,
         records.options,
         records.created_at
       FROM export_records AS records
       LEFT JOIN compare_jobs AS jobs ON jobs.id = records.job_id AND jobs.user_id = records.user_id
       WHERE records.user_id = ? AND records.job_id = ?
       ORDER BY records.created_at DESC, records.id DESC`
    )
    .all(userId, jobId) as unknown as ExportRecordRow[];

  return rows.map(mapExportRecordRow);
}

export function deleteExportRecord(userId: number, exportRecordId: number): boolean {
  const result = database
    .prepare('DELETE FROM export_records WHERE user_id = ? AND id = ?')
    .run(userId, exportRecordId);

  return result.changes > 0;
}
