import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { env } from '../config/env.js';

mkdirSync(path.dirname(env.databasePath), { recursive: true });

export const database = new DatabaseSync(env.databasePath);

export function initializeDatabase() {
  database.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS history_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      file_type TEXT NOT NULL,
      left_file_name TEXT NOT NULL,
      right_file_name TEXT NOT NULL,
      summary TEXT NOT NULL,
      filters TEXT NOT NULL,
      compare_result TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS uploaded_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      original_name TEXT NOT NULL,
      stored_name TEXT,
      file_type TEXT NOT NULL,
      mime_type TEXT,
      size_bytes INTEGER NOT NULL DEFAULT 0,
      sha256 TEXT,
      storage_path TEXT,
      source_type TEXT NOT NULL DEFAULT 'upload',
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS compare_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      file_type TEXT NOT NULL,
      input_mode TEXT NOT NULL DEFAULT 'pair',
      status TEXT NOT NULL DEFAULT 'completed',
      algorithm TEXT,
      duration_ms INTEGER DEFAULT 0,
      result_count INTEGER DEFAULT 0,
      result_truncated INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS compare_job_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      file_id INTEGER,
      role TEXT NOT NULL,
      version_index INTEGER,
      display_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (job_id) REFERENCES compare_jobs(id) ON DELETE CASCADE,
      FOREIGN KEY (file_id) REFERENCES uploaded_files(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS compare_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL UNIQUE,
      summary TEXT NOT NULL,
      filters TEXT NOT NULL,
      advanced_rules TEXT NOT NULL,
      normalization TEXT NOT NULL,
      performance TEXT NOT NULL,
      result_json TEXT NOT NULL,
      received TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (job_id) REFERENCES compare_jobs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS export_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      job_id INTEGER,
      export_type TEXT NOT NULL,
      file_name TEXT NOT NULL,
      options TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (job_id) REFERENCES compare_jobs(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS filter_presets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      file_type TEXT NOT NULL DEFAULT 'auto',
      filters TEXT NOT NULL,
      advanced_rules TEXT NOT NULL,
      normalization TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      user_id INTEGER PRIMARY KEY,
      default_file_type TEXT NOT NULL DEFAULT 'auto',
      default_filters TEXT NOT NULL,
      default_advanced_rules TEXT NOT NULL,
      default_normalization TEXT NOT NULL,
      theme TEXT NOT NULL DEFAULT 'light',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS diff_annotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      job_id INTEGER NOT NULL,
      diff_id TEXT NOT NULL,
      note TEXT NOT NULL,
      tag TEXT,
      resolved INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (job_id) REFERENCES compare_jobs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS version_chains (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      file_type TEXT NOT NULL,
      summary TEXT NOT NULL,
      trend TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS version_chain_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chain_id INTEGER NOT NULL,
      file_id INTEGER,
      version_index INTEGER NOT NULL,
      version_label TEXT NOT NULL,
      file_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (chain_id) REFERENCES version_chains(id) ON DELETE CASCADE,
      FOREIGN KEY (file_id) REFERENCES uploaded_files(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_history_records_user_created
      ON history_records(user_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_uploaded_files_user_created
      ON uploaded_files(user_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_compare_jobs_user_created
      ON compare_jobs(user_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_compare_results_job
      ON compare_results(job_id);

    CREATE INDEX IF NOT EXISTS idx_export_records_user_created
      ON export_records(user_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_filter_presets_user_file_type
      ON filter_presets(user_id, file_type);

    CREATE INDEX IF NOT EXISTS idx_diff_annotations_user_job
      ON diff_annotations(user_id, job_id);

    CREATE INDEX IF NOT EXISTS idx_version_chains_user_created
      ON version_chains(user_id, created_at DESC);
  `);
}

export function closeDatabase() {
  database.close();
}

initializeDatabase();
