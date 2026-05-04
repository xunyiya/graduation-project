import { apiFetch } from './api';
import type { ApiResponse, ExportRecord } from '../types/api';

export async function listExportRecords(): Promise<ExportRecord[]> {
  const response = await apiFetch<ApiResponse<ExportRecord[]>>('/api/export-records');

  return response.data;
}

export async function listExportRecordsByJob(jobId: string): Promise<ExportRecord[]> {
  const response = await apiFetch<ApiResponse<ExportRecord[]>>(`/api/jobs/${jobId}/export-records`);

  return response.data;
}

export async function deleteExportRecord(id: string) {
  await apiFetch<{ success: boolean; message?: string }>(`/api/export-records/${id}`, {
    method: 'DELETE'
  });
}
