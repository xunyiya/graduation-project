import { apiFetch } from './api';
import type { ApiResponse, CompareJobRecord } from '../types/api';

export async function listCompareJobs(): Promise<CompareJobRecord[]> {
  const response = await apiFetch<ApiResponse<CompareJobRecord[]>>('/api/jobs');

  return response.data;
}

export async function getCompareJob(id: string): Promise<CompareJobRecord> {
  const response = await apiFetch<ApiResponse<CompareJobRecord>>(`/api/jobs/${id}`);

  return response.data;
}

export async function deleteCompareJob(id: string) {
  await apiFetch<{ success: boolean; message?: string }>(`/api/jobs/${id}`, {
    method: 'DELETE'
  });
}
