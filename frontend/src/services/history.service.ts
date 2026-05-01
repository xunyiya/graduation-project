import { apiFetch } from './api';
import type { ApiResponse, CompareResponse, HistoryRecord } from '../types/api';

const storageKey = 'data-diff-visualizer-history';
const maxHistoryCount = 30;

function readReceivedName(received: Record<string, unknown> | undefined, key: 'leftFile' | 'rightFile') {
  const value = received?.[key];
  return typeof value === 'string' && value.length > 0 ? value : '文本输入';
}

function createLocalHistoryRecord(compareResult: CompareResponse): HistoryRecord {
  return {
    id: `${Date.now()}-${crypto.randomUUID()}`,
    createdAt: new Date().toISOString(),
    fileType: compareResult.fileType,
    fileNames: {
      left: readReceivedName(compareResult.received, 'leftFile'),
      right: readReceivedName(compareResult.received, 'rightFile')
    },
    summary: compareResult.summary,
    filters: compareResult.filters,
    compareResult
  };
}

export function listLocalHistoryRecords(): HistoryRecord[] {
  const rawValue = localStorage.getItem(storageKey);

  if (!rawValue) {
    return [];
  }

  try {
    return JSON.parse(rawValue) as HistoryRecord[];
  } catch {
    localStorage.removeItem(storageKey);
    return [];
  }
}

function saveLocalHistoryRecords(records: HistoryRecord[]) {
  localStorage.setItem(storageKey, JSON.stringify(records.slice(0, maxHistoryCount)));
}

export async function listHistoryRecords(): Promise<HistoryRecord[]> {
  const response = await apiFetch<ApiResponse<HistoryRecord[]>>('/api/history');

  return response.data;
}

export async function getHistoryRecord(id: string): Promise<HistoryRecord> {
  const response = await apiFetch<ApiResponse<HistoryRecord>>(`/api/history/${id}`);

  return response.data;
}

export async function addHistoryRecord(compareResult: CompareResponse) {
  try {
    const response = await apiFetch<ApiResponse<HistoryRecord>>('/api/history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        compareResult
      })
    });

    return response.data;
  } catch (error) {
    addLocalHistoryRecord(compareResult);
    throw error;
  }
}

export async function deleteHistoryRecord(id: string) {
  await apiFetch<{ success: boolean; message?: string }>(`/api/history/${id}`, {
    method: 'DELETE'
  });
}

export function addLocalHistoryRecord(compareResult: CompareResponse) {
  const records = listLocalHistoryRecords();
  const nextRecords = [createLocalHistoryRecord(compareResult), ...records];

  saveLocalHistoryRecords(nextRecords);
  return nextRecords[0];
}

export function deleteLocalHistoryRecord(id: string) {
  saveLocalHistoryRecords(listLocalHistoryRecords().filter((record) => record.id !== id));
}

export function clearHistoryRecords() {
  localStorage.removeItem(storageKey);
}
