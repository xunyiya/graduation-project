import { apiFetch } from './api';
import type { ApiResponse, DiffAnnotation, DiffAnnotationTag } from '../types/api';

export interface SaveDiffAnnotationInput {
  diffId: string;
  note: string;
  tag: DiffAnnotationTag | null;
  resolved: boolean;
}

export interface UpdateDiffAnnotationInput {
  note?: string;
  tag?: DiffAnnotationTag | null;
  resolved?: boolean;
}

export async function listDiffAnnotations(jobId: string): Promise<DiffAnnotation[]> {
  const response = await apiFetch<ApiResponse<DiffAnnotation[]>>(`/api/jobs/${jobId}/annotations`);

  return response.data;
}

export async function createDiffAnnotation(
  jobId: string,
  input: SaveDiffAnnotationInput
): Promise<DiffAnnotation> {
  const response = await apiFetch<ApiResponse<DiffAnnotation>>(`/api/jobs/${jobId}/annotations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(input)
  });

  return response.data;
}

export async function updateDiffAnnotation(
  id: string,
  input: UpdateDiffAnnotationInput
): Promise<DiffAnnotation> {
  const response = await apiFetch<ApiResponse<DiffAnnotation>>(`/api/annotations/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(input)
  });

  return response.data;
}

export async function deleteDiffAnnotation(id: string) {
  await apiFetch<{ success: boolean; message?: string }>(`/api/annotations/${id}`, {
    method: 'DELETE'
  });
}
