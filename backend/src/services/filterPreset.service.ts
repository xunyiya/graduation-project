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

export interface FilterPresetRecord {
  id: number;
  userId: number;
  name: string;
  description: string | null;
  fileType: RequestFileType;
  filters: DiffFilterOptions;
  advancedRules: AdvancedRuleOptions | Record<string, unknown>;
  normalization: NormalizationOptions | Record<string, unknown>;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFilterPresetInput {
  name: string;
  description?: string | null;
  fileType?: RequestFileType;
  filters: unknown;
  advancedRules: unknown;
  normalization: unknown;
  isDefault?: boolean;
}

export interface UpdateFilterPresetInput {
  name?: string;
  description?: string | null;
  fileType?: RequestFileType;
  filters?: unknown;
  advancedRules?: unknown;
  normalization?: unknown;
  isDefault?: boolean;
}

interface FilterPresetRow {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  file_type: RequestFileType;
  filters: string;
  advanced_rules: string;
  normalization: string;
  is_default: number;
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

function mapFilterPresetRow(row: FilterPresetRow): FilterPresetRecord {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    fileType: row.file_type,
    filters: parseJsonField<DiffFilterOptions>(row.filters, defaultFilterOptions),
    advancedRules: parseJsonField<AdvancedRuleOptions | Record<string, unknown>>(
      row.advanced_rules,
      defaultAdvancedRuleOptions
    ),
    normalization: parseJsonField<NormalizationOptions | Record<string, unknown>>(
      row.normalization,
      defaultNormalizationOptions
    ),
    isDefault: row.is_default === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function getPresetRowById(userId: number, presetId: number): FilterPresetRow | undefined {
  return database
    .prepare(
      `SELECT
         id,
         user_id,
         name,
         description,
         file_type,
         filters,
         advanced_rules,
         normalization,
         is_default,
         created_at,
         updated_at
       FROM filter_presets
       WHERE user_id = ? AND id = ?`
    )
    .get(userId, presetId) as FilterPresetRow | undefined;
}

function clearDefaultPresets(userId: number, fileType: RequestFileType) {
  database
    .prepare(
      `UPDATE filter_presets
       SET is_default = 0, updated_at = ?
       WHERE user_id = ? AND file_type = ?`
    )
    .run(new Date().toISOString(), userId, fileType);
}

export function createFilterPreset(
  userId: number,
  input: CreateFilterPresetInput
): FilterPresetRecord {
  const createdAt = new Date().toISOString();
  const fileType = input.fileType ?? 'auto';

  if (input.isDefault) {
    clearDefaultPresets(userId, fileType);
  }

  const result = database
    .prepare(
      `INSERT INTO filter_presets
        (
          user_id,
          name,
          description,
          file_type,
          filters,
          advanced_rules,
          normalization,
          is_default,
          created_at,
          updated_at
        )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      userId,
      input.name,
      input.description ?? null,
      fileType,
      stringifyJsonField(input.filters, defaultFilterOptions),
      stringifyJsonField(input.advancedRules, defaultAdvancedRuleOptions),
      stringifyJsonField(input.normalization, defaultNormalizationOptions),
      input.isDefault ? 1 : 0,
      createdAt,
      createdAt
    );

  const preset = getFilterPresetById(userId, Number(result.lastInsertRowid));

  if (!preset) {
    throw new Error('筛选规则预设保存失败');
  }

  return preset;
}

export function listFilterPresets(userId: number, fileType?: RequestFileType): FilterPresetRecord[] {
  const rows = fileType
    ? (database
        .prepare(
          `SELECT
             id,
             user_id,
             name,
             description,
             file_type,
             filters,
             advanced_rules,
             normalization,
             is_default,
             created_at,
             updated_at
           FROM filter_presets
           WHERE user_id = ? AND file_type = ?
           ORDER BY is_default DESC, updated_at DESC, id DESC`
        )
        .all(userId, fileType) as unknown as FilterPresetRow[])
    : (database
        .prepare(
          `SELECT
             id,
             user_id,
             name,
             description,
             file_type,
             filters,
             advanced_rules,
             normalization,
             is_default,
             created_at,
             updated_at
           FROM filter_presets
           WHERE user_id = ?
           ORDER BY is_default DESC, updated_at DESC, id DESC`
        )
        .all(userId) as unknown as FilterPresetRow[]);

  return rows.map(mapFilterPresetRow);
}

export function getFilterPresetById(userId: number, presetId: number): FilterPresetRecord | null {
  const row = getPresetRowById(userId, presetId);

  return row ? mapFilterPresetRow(row) : null;
}

export function updateFilterPreset(
  userId: number,
  presetId: number,
  input: UpdateFilterPresetInput
): FilterPresetRecord | null {
  const current = getFilterPresetById(userId, presetId);

  if (!current) {
    return null;
  }

  const fileType = input.fileType ?? current.fileType;
  const isDefault = input.isDefault ?? current.isDefault;
  const updatedAt = new Date().toISOString();

  if (isDefault) {
    clearDefaultPresets(userId, fileType);
  }

  database
    .prepare(
      `UPDATE filter_presets
       SET
         name = ?,
         description = ?,
         file_type = ?,
         filters = ?,
         advanced_rules = ?,
         normalization = ?,
         is_default = ?,
         updated_at = ?
       WHERE user_id = ? AND id = ?`
    )
    .run(
      input.name ?? current.name,
      input.description === undefined ? current.description : input.description,
      fileType,
      input.filters === undefined
        ? JSON.stringify(current.filters)
        : stringifyJsonField(input.filters, defaultFilterOptions),
      input.advancedRules === undefined
        ? JSON.stringify(current.advancedRules)
        : stringifyJsonField(input.advancedRules, defaultAdvancedRuleOptions),
      input.normalization === undefined
        ? JSON.stringify(current.normalization)
        : stringifyJsonField(input.normalization, defaultNormalizationOptions),
      isDefault ? 1 : 0,
      updatedAt,
      userId,
      presetId
    );

  return getFilterPresetById(userId, presetId);
}

export function deleteFilterPreset(userId: number, presetId: number): boolean {
  const result = database
    .prepare('DELETE FROM filter_presets WHERE user_id = ? AND id = ?')
    .run(userId, presetId);

  return result.changes > 0;
}

export function setDefaultFilterPreset(userId: number, presetId: number): FilterPresetRecord | null {
  const preset = getFilterPresetById(userId, presetId);

  if (!preset) {
    return null;
  }

  clearDefaultPresets(userId, preset.fileType);
  database
    .prepare(
      `UPDATE filter_presets
       SET is_default = 1, updated_at = ?
       WHERE user_id = ? AND id = ?`
    )
    .run(new Date().toISOString(), userId, presetId);

  return getFilterPresetById(userId, presetId);
}
