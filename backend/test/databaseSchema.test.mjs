import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test, { after } from 'node:test';

const tempDir = await mkdtemp(path.join(os.tmpdir(), 'data-diff-schema-'));
process.env.DATABASE_PATH = path.join(tempDir, 'app.db');
process.env.JWT_SECRET = 'test-secret';

const { closeDatabase, database } = await import('../dist/services/database.service.js');

after(async () => {
  closeDatabase();
  await rm(tempDir, { recursive: true, force: true });
});

const expectedTables = [
  'users',
  'history_records',
  'uploaded_files',
  'compare_jobs',
  'compare_job_files',
  'compare_results',
  'export_records',
  'filter_presets',
  'user_settings',
  'diff_annotations',
  'version_chains',
  'version_chain_files'
];

test('creates all application database tables', () => {
  const rows = database
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
    .all();
  const tableNames = new Set(rows.map((row) => row.name));

  expectedTables.forEach((tableName) => {
    assert.equal(tableNames.has(tableName), true, `${tableName} should exist`);
  });
});

test('creates expected high-value indexes', () => {
  const rows = database
    .prepare("SELECT name FROM sqlite_master WHERE type = 'index'")
    .all();
  const indexNames = new Set(rows.map((row) => row.name));

  [
    'idx_uploaded_files_user_created',
    'idx_compare_jobs_user_created',
    'idx_compare_results_job',
    'idx_export_records_user_created',
    'idx_filter_presets_user_file_type',
    'idx_diff_annotations_user_job',
    'idx_version_chains_user_created'
  ].forEach((indexName) => {
    assert.equal(indexNames.has(indexName), true, `${indexName} should exist`);
  });
});

test('enforces cascade and set-null foreign key relationships', () => {
  const now = new Date().toISOString();
  const userResult = database
    .prepare('INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)')
    .run('schema-user', 'hash', now);
  const userId = Number(userResult.lastInsertRowid);
  const fileResult = database
    .prepare(
      `INSERT INTO uploaded_files
        (user_id, original_name, file_type, size_bytes, source_type, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(userId, 'left.txt', 'text', 4, 'upload', now);
  const fileId = Number(fileResult.lastInsertRowid);
  const jobResult = database
    .prepare(
      `INSERT INTO compare_jobs
        (user_id, title, file_type, input_mode, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(userId, 'schema job', 'text', 'pair', 'completed', now, now);
  const jobId = Number(jobResult.lastInsertRowid);

  database
    .prepare(
      `INSERT INTO compare_job_files
        (job_id, file_id, role, display_name, created_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(jobId, fileId, 'left', 'left.txt', now);
  database
    .prepare(
      `INSERT INTO version_chains
        (user_id, title, file_type, summary, trend, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      userId,
      'schema chain',
      'text',
      '{}',
      JSON.stringify({
        intervalCount: 0,
        totalDifferences: 0,
        peakIntervalId: null,
        peakIntervalLabel: null,
        peakDifferenceCount: 0,
        added: 0,
        removed: 0,
        modified: 0,
        direction: 'stable'
      }),
      now
    );
  const chainId = Number(database.prepare('SELECT last_insert_rowid() AS id').get().id);
  database
    .prepare(
      `INSERT INTO version_chain_files
        (chain_id, file_id, version_index, version_label, file_name, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(chainId, fileId, 0, 'v1', 'left.txt', now);

  database.prepare('DELETE FROM uploaded_files WHERE id = ?').run(fileId);

  assert.equal(
    database.prepare('SELECT file_id FROM compare_job_files WHERE job_id = ?').get(jobId).file_id,
    null
  );
  assert.equal(
    database.prepare('SELECT file_id FROM version_chain_files WHERE chain_id = ?').get(chainId).file_id,
    null
  );

  database.prepare('DELETE FROM users WHERE id = ?').run(userId);

  assert.equal(database.prepare('SELECT COUNT(*) AS count FROM compare_jobs').get().count, 0);
  assert.equal(database.prepare('SELECT COUNT(*) AS count FROM version_chains').get().count, 0);
});
