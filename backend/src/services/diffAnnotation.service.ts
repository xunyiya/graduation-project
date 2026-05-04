import { database } from './database.service.js';

export interface DiffAnnotationRecord {
  id: number;
  userId: number;
  jobId: number;
  diffId: string;
  note: string;
  tag: string | null;
  resolved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAnnotationInput {
  jobId: number;
  diffId: string;
  note: string;
  tag?: string | null;
  resolved?: boolean;
}

export interface UpdateAnnotationInput {
  note?: string;
  tag?: string | null;
  resolved?: boolean;
}

interface DiffAnnotationRow {
  id: number;
  user_id: number;
  job_id: number;
  diff_id: string;
  note: string;
  tag: string | null;
  resolved: number;
  created_at: string;
  updated_at: string;
}

function mapAnnotationRow(row: DiffAnnotationRow): DiffAnnotationRecord {
  return {
    id: row.id,
    userId: row.user_id,
    jobId: row.job_id,
    diffId: row.diff_id,
    note: row.note,
    tag: row.tag,
    resolved: row.resolved === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function jobBelongsToUser(userId: number, jobId: number) {
  const row = database
    .prepare('SELECT id FROM compare_jobs WHERE user_id = ? AND id = ?')
    .get(userId, jobId) as { id: number } | undefined;

  return Boolean(row);
}

function getAnnotationById(userId: number, annotationId: number): DiffAnnotationRecord | null {
  const row = database
    .prepare(
      `SELECT
         annotations.id,
         annotations.user_id,
         annotations.job_id,
         annotations.diff_id,
         annotations.note,
         annotations.tag,
         annotations.resolved,
         annotations.created_at,
         annotations.updated_at
       FROM diff_annotations AS annotations
       INNER JOIN compare_jobs AS jobs ON jobs.id = annotations.job_id
       WHERE annotations.user_id = ? AND jobs.user_id = ? AND annotations.id = ?`
    )
    .get(userId, userId, annotationId) as DiffAnnotationRow | undefined;

  return row ? mapAnnotationRow(row) : null;
}

export function createAnnotation(
  userId: number,
  input: CreateAnnotationInput
): DiffAnnotationRecord | null {
  if (!jobBelongsToUser(userId, input.jobId)) {
    return null;
  }

  const createdAt = new Date().toISOString();
  const result = database
    .prepare(
      `INSERT INTO diff_annotations
        (user_id, job_id, diff_id, note, tag, resolved, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      userId,
      input.jobId,
      input.diffId,
      input.note,
      input.tag ?? null,
      input.resolved ? 1 : 0,
      createdAt,
      createdAt
    );

  return getAnnotationById(userId, Number(result.lastInsertRowid));
}

export function listAnnotationsByJob(userId: number, jobId: number): DiffAnnotationRecord[] | null {
  if (!jobBelongsToUser(userId, jobId)) {
    return null;
  }

  const rows = database
    .prepare(
      `SELECT id, user_id, job_id, diff_id, note, tag, resolved, created_at, updated_at
       FROM diff_annotations
       WHERE user_id = ? AND job_id = ?
       ORDER BY updated_at DESC, id DESC`
    )
    .all(userId, jobId) as unknown as DiffAnnotationRow[];

  return rows.map(mapAnnotationRow);
}

export function getAnnotationByDiffId(
  userId: number,
  jobId: number,
  diffId: string
): DiffAnnotationRecord | null {
  if (!jobBelongsToUser(userId, jobId)) {
    return null;
  }

  const row = database
    .prepare(
      `SELECT id, user_id, job_id, diff_id, note, tag, resolved, created_at, updated_at
       FROM diff_annotations
       WHERE user_id = ? AND job_id = ? AND diff_id = ?
       ORDER BY updated_at DESC, id DESC
       LIMIT 1`
    )
    .get(userId, jobId, diffId) as DiffAnnotationRow | undefined;

  return row ? mapAnnotationRow(row) : null;
}

export function updateAnnotation(
  userId: number,
  annotationId: number,
  input: UpdateAnnotationInput
): DiffAnnotationRecord | null {
  const current = getAnnotationById(userId, annotationId);

  if (!current) {
    return null;
  }

  const updatedAt = new Date().toISOString();

  database
    .prepare(
      `UPDATE diff_annotations
       SET note = ?, tag = ?, resolved = ?, updated_at = ?
       WHERE user_id = ? AND id = ?`
    )
    .run(
      input.note ?? current.note,
      input.tag === undefined ? current.tag : input.tag,
      input.resolved === undefined ? (current.resolved ? 1 : 0) : input.resolved ? 1 : 0,
      updatedAt,
      userId,
      annotationId
    );

  return getAnnotationById(userId, annotationId);
}

export function deleteAnnotation(userId: number, annotationId: number): boolean {
  const current = getAnnotationById(userId, annotationId);

  if (!current) {
    return false;
  }

  const result = database
    .prepare('DELETE FROM diff_annotations WHERE user_id = ? AND id = ?')
    .run(userId, annotationId);

  return result.changes > 0;
}
