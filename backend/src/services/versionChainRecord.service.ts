import type { SupportedFileType, VersionTrendSummary } from '../types/api.js';
import { database } from './database.service.js';

export interface VersionChainFileRecord {
  id: number;
  chainId: number;
  fileId: number | null;
  versionIndex: number;
  versionLabel: string;
  fileName: string;
  createdAt: string;
}

export interface VersionChainRecord {
  id: number;
  userId: number;
  title: string;
  fileType: SupportedFileType;
  summary: Record<string, unknown>;
  trend: VersionTrendSummary;
  createdAt: string;
  files: VersionChainFileRecord[];
}

export interface CreateVersionChainRecordInput {
  title: string;
  fileType: SupportedFileType;
  summary: Record<string, unknown>;
  trend: VersionTrendSummary;
}

export interface AttachVersionChainFileInput {
  fileId?: number | null;
  versionIndex: number;
  versionLabel: string;
  fileName: string;
}

interface VersionChainRow {
  id: number;
  user_id: number;
  title: string;
  file_type: SupportedFileType;
  summary: string;
  trend: string;
  created_at: string;
}

interface VersionChainFileRow {
  id: number;
  chain_id: number;
  file_id: number | null;
  version_index: number;
  version_label: string;
  file_name: string;
  created_at: string;
}

function parseJsonField<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function emptyTrend(): VersionTrendSummary {
  return {
    intervalCount: 0,
    totalDifferences: 0,
    peakIntervalId: null,
    peakIntervalLabel: null,
    peakDifferenceCount: 0,
    added: 0,
    removed: 0,
    modified: 0,
    direction: 'stable'
  };
}

function mapVersionChainFileRow(row: VersionChainFileRow): VersionChainFileRecord {
  return {
    id: row.id,
    chainId: row.chain_id,
    fileId: row.file_id,
    versionIndex: row.version_index,
    versionLabel: row.version_label,
    fileName: row.file_name,
    createdAt: row.created_at
  };
}

function mapVersionChainRow(row: VersionChainRow): VersionChainRecord {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    fileType: row.file_type,
    summary: parseJsonField<Record<string, unknown>>(row.summary, {}),
    trend: parseJsonField<VersionTrendSummary>(row.trend, emptyTrend()),
    createdAt: row.created_at,
    files: []
  };
}

function readVersionChainFiles(chainId: number): VersionChainFileRecord[] {
  const rows = database
    .prepare(
      `SELECT id, chain_id, file_id, version_index, version_label, file_name, created_at
       FROM version_chain_files
       WHERE chain_id = ?
       ORDER BY version_index ASC, id ASC`
    )
    .all(chainId) as unknown as VersionChainFileRow[];

  return rows.map(mapVersionChainFileRow);
}

function hydrateVersionChain(chain: VersionChainRecord): VersionChainRecord {
  return {
    ...chain,
    files: readVersionChainFiles(chain.id)
  };
}

export function createVersionChainRecord(
  userId: number,
  input: CreateVersionChainRecordInput
): VersionChainRecord {
  const createdAt = new Date().toISOString();
  const result = database
    .prepare(
      `INSERT INTO version_chains
        (user_id, title, file_type, summary, trend, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      userId,
      input.title,
      input.fileType,
      JSON.stringify(input.summary),
      JSON.stringify(input.trend),
      createdAt
    );

  const chain = getVersionChainById(userId, Number(result.lastInsertRowid));

  if (!chain) {
    throw new Error('版本链记录创建失败');
  }

  return chain;
}

export function attachVersionChainFile(
  chainId: number,
  input: AttachVersionChainFileInput
): VersionChainFileRecord {
  const createdAt = new Date().toISOString();
  const result = database
    .prepare(
      `INSERT INTO version_chain_files
        (chain_id, file_id, version_index, version_label, file_name, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      chainId,
      input.fileId ?? null,
      input.versionIndex,
      input.versionLabel,
      input.fileName,
      createdAt
    );

  const row = database
    .prepare(
      `SELECT id, chain_id, file_id, version_index, version_label, file_name, created_at
       FROM version_chain_files
       WHERE id = ?`
    )
    .get(Number(result.lastInsertRowid)) as VersionChainFileRow | undefined;

  if (!row) {
    throw new Error('版本链文件记录创建失败');
  }

  return mapVersionChainFileRow(row);
}

export function listVersionChains(userId: number): VersionChainRecord[] {
  const rows = database
    .prepare(
      `SELECT id, user_id, title, file_type, summary, trend, created_at
       FROM version_chains
       WHERE user_id = ?
       ORDER BY created_at DESC, id DESC`
    )
    .all(userId) as unknown as VersionChainRow[];

  return rows.map((row) => hydrateVersionChain(mapVersionChainRow(row)));
}

export function getVersionChainById(userId: number, chainId: number): VersionChainRecord | null {
  const row = database
    .prepare(
      `SELECT id, user_id, title, file_type, summary, trend, created_at
       FROM version_chains
       WHERE user_id = ? AND id = ?`
    )
    .get(userId, chainId) as VersionChainRow | undefined;

  return row ? hydrateVersionChain(mapVersionChainRow(row)) : null;
}

export function deleteVersionChainById(userId: number, chainId: number): boolean {
  const result = database
    .prepare('DELETE FROM version_chains WHERE user_id = ? AND id = ?')
    .run(userId, chainId);

  return result.changes > 0;
}
