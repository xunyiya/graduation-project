import bcrypt from 'bcryptjs';

import { database } from './database.service.js';
import { ensureUserSettings } from './userSettings.service.js';

export interface UserRecord {
  id: number;
  username: string;
  passwordHash: string;
  createdAt: string;
}

export interface PublicUser {
  id: number;
  username: string;
  createdAt: string;
}

interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
}

function mapUserRow(row: UserRow): UserRecord {
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    createdAt: row.created_at
  };
}

export function toPublicUser(user: UserRecord): PublicUser {
  return {
    id: user.id,
    username: user.username,
    createdAt: user.createdAt
  };
}

export function findUserById(id: number): UserRecord | null {
  const row = database
    .prepare('SELECT id, username, password_hash, created_at FROM users WHERE id = ?')
    .get(id) as UserRow | undefined;

  return row ? mapUserRow(row) : null;
}

export function findUserByUsername(username: string): UserRecord | null {
  const row = database
    .prepare('SELECT id, username, password_hash, created_at FROM users WHERE username = ?')
    .get(username) as UserRow | undefined;

  return row ? mapUserRow(row) : null;
}

export async function createUser(username: string, password: string): Promise<UserRecord> {
  const passwordHash = await bcrypt.hash(password, 12);
  const createdAt = new Date().toISOString();
  const result = database
    .prepare('INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)')
    .run(username, passwordHash, createdAt);

  const user = findUserById(Number(result.lastInsertRowid));

  if (!user) {
    throw new Error('用户创建失败');
  }

  ensureUserSettings(user.id);

  return user;
}

export async function verifyUserPassword(user: UserRecord, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.passwordHash);
}
