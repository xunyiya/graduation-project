import { apiFetch } from './api';
import type { ApiResponse, DiffFilterOptions, RequestFileType, UserSettings, UserTheme } from '../types/api';

export interface UpdateUserSettingsInput {
  defaultFileType?: RequestFileType;
  defaultFilters?: DiffFilterOptions;
  defaultAdvancedRules?: unknown;
  defaultNormalization?: unknown;
  theme?: UserTheme;
}

export async function fetchUserSettings(): Promise<UserSettings> {
  const response = await apiFetch<ApiResponse<UserSettings>>('/api/settings');

  return response.data;
}

export async function updateUserSettings(input: UpdateUserSettingsInput): Promise<UserSettings> {
  const response = await apiFetch<ApiResponse<UserSettings>>('/api/settings', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(input)
  });

  return response.data;
}

export async function resetUserSettings(): Promise<UserSettings> {
  const response = await apiFetch<ApiResponse<UserSettings>>('/api/settings/reset', {
    method: 'POST'
  });

  return response.data;
}
