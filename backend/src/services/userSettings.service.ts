import type {
  AdvancedRuleOptions,
  DiffFilterOptions,
  NormalizationOptions,
  RequestFileType
} from '../types/api.js';
import { defaultAdvancedRuleOptions } from './advancedRules.service.js';
import { database } from './database.service.js';
import { defaultFilterOptions } from './filter.service.js';
import { defaultNormalizationOptions } from './normalization.service.js';

export type UserTheme = 'light' | 'dark';

export interface UserSettingsRecord {
  userId: number;
  defaultFileType: RequestFileType;
  defaultFilters: DiffFilterOptions | Record<string, unknown>;
  defaultAdvancedRules: AdvancedRuleOptions | Record<string, unknown>;
  defaultNormalization: NormalizationOptions | Record<string, unknown>;
  theme: UserTheme;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserSettingsInput {
  defaultFileType?: RequestFileType;
  defaultFilters?: unknown;
  defaultAdvancedRules?: unknown;
  defaultNormalization?: unknown;
  theme?: UserTheme;
}

interface UserSettingsRow {
  user_id: number;
  default_file_type: RequestFileType;
  default_filters: string;
  default_advanced_rules: string;
  default_normalization: string;
  theme: UserTheme;
  created_at: string;
  updated_at: string;
}

function parseJsonField<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function stringifyJsonField(value: unknown, fallback: unknown) {
  return JSON.stringify(value ?? fallback);
}

function mapUserSettingsRow(row: UserSettingsRow): UserSettingsRecord {
  return {
    userId: row.user_id,
    defaultFileType: row.default_file_type,
    defaultFilters: parseJsonField<DiffFilterOptions | Record<string, unknown>>(
      row.default_filters,
      defaultFilterOptions
    ),
    defaultAdvancedRules: parseJsonField<AdvancedRuleOptions | Record<string, unknown>>(
      row.default_advanced_rules,
      defaultAdvancedRuleOptions
    ),
    defaultNormalization: parseJsonField<NormalizationOptions | Record<string, unknown>>(
      row.default_normalization,
      defaultNormalizationOptions
    ),
    theme: row.theme,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function getUserSettingsRow(userId: number): UserSettingsRow | undefined {
  return database
    .prepare(
      `SELECT
         user_id,
         default_file_type,
         default_filters,
         default_advanced_rules,
         default_normalization,
         theme,
         created_at,
         updated_at
       FROM user_settings
       WHERE user_id = ?`
    )
    .get(userId) as UserSettingsRow | undefined;
}

export function getUserSettings(userId: number): UserSettingsRecord | null {
  const row = getUserSettingsRow(userId);

  return row ? mapUserSettingsRow(row) : null;
}

export function ensureUserSettings(userId: number): UserSettingsRecord {
  const existing = getUserSettings(userId);

  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();

  database
    .prepare(
      `INSERT INTO user_settings
        (
          user_id,
          default_file_type,
          default_filters,
          default_advanced_rules,
          default_normalization,
          theme,
          created_at,
          updated_at
        )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      userId,
      'auto',
      JSON.stringify(defaultFilterOptions),
      JSON.stringify(defaultAdvancedRuleOptions),
      JSON.stringify(defaultNormalizationOptions),
      'light',
      now,
      now
    );

  const settings = getUserSettings(userId);

  if (!settings) {
    throw new Error('用户默认设置创建失败');
  }

  return settings;
}

export function updateUserSettings(
  userId: number,
  input: UpdateUserSettingsInput
): UserSettingsRecord {
  const current = ensureUserSettings(userId);
  const updatedAt = new Date().toISOString();

  database
    .prepare(
      `UPDATE user_settings
       SET
         default_file_type = ?,
         default_filters = ?,
         default_advanced_rules = ?,
         default_normalization = ?,
         theme = ?,
         updated_at = ?
       WHERE user_id = ?`
    )
    .run(
      input.defaultFileType ?? current.defaultFileType,
      input.defaultFilters === undefined
        ? JSON.stringify(current.defaultFilters)
        : stringifyJsonField(input.defaultFilters, defaultFilterOptions),
      input.defaultAdvancedRules === undefined
        ? JSON.stringify(current.defaultAdvancedRules)
        : stringifyJsonField(input.defaultAdvancedRules, defaultAdvancedRuleOptions),
      input.defaultNormalization === undefined
        ? JSON.stringify(current.defaultNormalization)
        : stringifyJsonField(input.defaultNormalization, defaultNormalizationOptions),
      input.theme ?? current.theme,
      updatedAt,
      userId
    );

  return ensureUserSettings(userId);
}

export function resetUserSettings(userId: number): UserSettingsRecord {
  ensureUserSettings(userId);
  const updatedAt = new Date().toISOString();

  database
    .prepare(
      `UPDATE user_settings
       SET
         default_file_type = ?,
         default_filters = ?,
         default_advanced_rules = ?,
         default_normalization = ?,
         theme = ?,
         updated_at = ?
       WHERE user_id = ?`
    )
    .run(
      'auto',
      JSON.stringify(defaultFilterOptions),
      JSON.stringify(defaultAdvancedRuleOptions),
      JSON.stringify(defaultNormalizationOptions),
      'light',
      updatedAt,
      userId
    );

  return ensureUserSettings(userId);
}
