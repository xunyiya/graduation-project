import { getAuthToken } from './token.service';
import type { CompareResponse, HealthResponse, VersionChainResponse } from '../types/api';

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { message?: string };

  if (!response.ok) {
    throw new Error(data.message ?? `API request failed with status ${response.status}`);
  }

  return data;
}

export async function fetchHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>('/api/health');
}

export async function compareFiles(formData: FormData): Promise<CompareResponse> {
  return apiFetch<CompareResponse>('/api/diff/compare', {
    method: 'POST',
    body: formData
  });
}

export async function compareVersionFiles(formData: FormData): Promise<VersionChainResponse> {
  return apiFetch<VersionChainResponse>('/api/diff/compare-versions', {
    method: 'POST',
    body: formData
  });
}

export async function apiFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getAuthToken();

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...init,
    headers
  });

  return parseJsonResponse<T>(response);
}
