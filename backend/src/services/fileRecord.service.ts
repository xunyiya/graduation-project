import crypto from 'node:crypto';
import { createReadStream } from 'node:fs';

import { database } from './database.service.js';

export interface UploadedFileRecord {
  id: number;
  userId: number;
  originalName: string;
  storedName: string | null;
  fileType: string;
  mimeType: string | null;
  sizeBytes: number;
  sha256: string | null;
  storagePath: string | null;
  sourceType: string;
  createdAt: string;
}

export interface CreateUploadedFileRecordInput {
  originalName: string;
  storedName?: string | null;
  fileType: string;
  mimeType?: string | null;
  sizeBytes?: number;
  sha256?: string | null;
  storagePath?: string | null;
  sourceType?: string | null;
}

interface UploadedFileRow {
  id: number;
  user_id: number;
  original_name: string;
  stored_name: string | null;
  file_type: string;
  mime_type: string | null;
  size_bytes: number;
  sha256: string | null;
  storage_path: string | null;
  source_type: string;
  created_at: string;
}

function mapUploadedFileRow(row: UploadedFileRow): UploadedFileRecord {
  return {
    id: row.id,
    userId: row.user_id,
    originalName: row.original_name,
    storedName: row.stored_name,
    fileType: row.file_type,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    sha256: row.sha256,
    storagePath: row.storage_path,
    sourceType: row.source_type,
    createdAt: row.created_at
  };
}

export function createUploadedFileRecord(
  userId: number,
  input: CreateUploadedFileRecordInput
): UploadedFileRecord {
  const createdAt = new Date().toISOString();
  const result = database
    .prepare(
      `INSERT INTO uploaded_files
        (
          user_id,
          original_name,
          stored_name,
          file_type,
          mime_type,
          size_bytes,
          sha256,
          storage_path,
          source_type,
          created_at
        )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      userId,
      input.originalName,
      input.storedName ?? null,
      input.fileType,
      input.mimeType ?? null,
      input.sizeBytes ?? 0,
      input.sha256 ?? null,
      input.storagePath ?? null,
      input.sourceType ?? 'upload',
      createdAt
    );

  const record = getUploadedFileById(userId, Number(result.lastInsertRowid));

  if (!record) {
    throw new Error('文件记录保存失败');
  }

  return record;
}

export function listUploadedFiles(userId: number): UploadedFileRecord[] {
  const rows = database
    .prepare(
      `SELECT
         id,
         user_id,
         original_name,
         stored_name,
         file_type,
         mime_type,
         size_bytes,
         sha256,
         storage_path,
         source_type,
         created_at
       FROM uploaded_files
       WHERE user_id = ?
       ORDER BY created_at DESC, id DESC`
    )
    .all(userId) as unknown as UploadedFileRow[];

  return rows.map(mapUploadedFileRow);
}

export function getUploadedFileById(userId: number, fileId: number): UploadedFileRecord | null {
  const row = database
    .prepare(
      `SELECT
         id,
         user_id,
         original_name,
         stored_name,
         file_type,
         mime_type,
         size_bytes,
         sha256,
         storage_path,
         source_type,
         created_at
       FROM uploaded_files
       WHERE user_id = ? AND id = ?`
    )
    .get(userId, fileId) as UploadedFileRow | undefined;

  return row ? mapUploadedFileRow(row) : null;
}

export function deleteUploadedFileById(userId: number, fileId: number): boolean {
  const result = database
    .prepare('DELETE FROM uploaded_files WHERE user_id = ? AND id = ?')
    .run(userId, fileId);

  return result.changes > 0;
}

export function computeSha256FromBuffer(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export function computeSha256FromFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = createReadStream(filePath);

    stream.on('data', (chunk) => {
      hash.update(chunk);
    });
    stream.on('error', reject);
    stream.on('end', () => {
      resolve(hash.digest('hex'));
    });
  });
}
