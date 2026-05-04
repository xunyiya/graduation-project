import { apiFetch } from './api';
import type { ApiResponse, UploadedFileRecord } from '../types/api';

export async function listUploadedFiles(): Promise<UploadedFileRecord[]> {
  const response = await apiFetch<ApiResponse<UploadedFileRecord[]>>('/api/files');

  return response.data;
}

export async function getUploadedFile(id: string): Promise<UploadedFileRecord> {
  const response = await apiFetch<ApiResponse<UploadedFileRecord>>(`/api/files/${id}`);

  return response.data;
}

export async function deleteUploadedFile(id: string) {
  await apiFetch<{ success: boolean; message?: string }>(`/api/files/${id}`, {
    method: 'DELETE'
  });
}
