import { apiFetch } from './api';
import type { ApiResponse, DiffFilterOptions, FilterPreset, RequestFileType } from '../types/api';

export interface SaveFilterPresetInput {
  name: string;
  description: string | null;
  fileType: RequestFileType;
  filters: DiffFilterOptions;
  advancedRules: unknown;
  normalization: unknown;
  isDefault?: boolean;
}

export interface UpdateFilterPresetInput {
  name?: string;
  description?: string | null;
  fileType?: RequestFileType;
  filters?: DiffFilterOptions;
  advancedRules?: unknown;
  normalization?: unknown;
  isDefault?: boolean;
}

export async function listFilterPresets(fileType?: RequestFileType): Promise<FilterPreset[]> {
  const query = fileType ? `?fileType=${encodeURIComponent(fileType)}` : '';
  const response = await apiFetch<ApiResponse<FilterPreset[]>>(`/api/filter-presets${query}`);

  return response.data;
}

export async function createFilterPreset(input: SaveFilterPresetInput): Promise<FilterPreset> {
  const response = await apiFetch<ApiResponse<FilterPreset>>('/api/filter-presets', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(input)
  });

  return response.data;
}

export async function updateFilterPreset(
  id: string,
  input: UpdateFilterPresetInput
): Promise<FilterPreset> {
  const response = await apiFetch<ApiResponse<FilterPreset>>(`/api/filter-presets/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(input)
  });

  return response.data;
}

export async function deleteFilterPreset(id: string) {
  await apiFetch<{ success: boolean; message?: string }>(`/api/filter-presets/${id}`, {
    method: 'DELETE'
  });
}

export async function setDefaultFilterPreset(id: string): Promise<FilterPreset> {
  const response = await apiFetch<ApiResponse<FilterPreset>>(`/api/filter-presets/${id}/default`, {
    method: 'POST'
  });

  return response.data;
}
