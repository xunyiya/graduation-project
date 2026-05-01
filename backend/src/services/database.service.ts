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

    CREATE INDEX IF NOT EXISTS idx_history_records_user_created
      ON history_records(user_id, created_at DESC);
  `);
}

export function closeDatabase() {
  database.close();
}

initializeDatabase();
