import { apiFetch } from './api';
import type { ApiResponse, VersionChainRecord } from '../types/api';

export async function listVersionChains(): Promise<VersionChainRecord[]> {
  const response = await apiFetch<ApiResponse<VersionChainRecord[]>>('/api/version-chains');

  return response.data;
}

export async function getVersionChain(id: string): Promise<VersionChainRecord> {
  const response = await apiFetch<ApiResponse<VersionChainRecord>>(`/api/version-chains/${id}`);

  return response.data;
}

export async function deleteVersionChain(id: string) {
  await apiFetch<{ success: boolean; message?: string }>(`/api/version-chains/${id}`, {
    method: 'DELETE'
  });
}
