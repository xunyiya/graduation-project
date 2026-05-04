import type { CompareResponse, ExportOptions, ExportRequestBody } from '../types/api';
import { getAuthToken } from './token.service';

function getFileExtension(format: 'html' | 'pdf') {
  return format === 'html' ? 'html' : 'pdf';
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function readDownloadFileName(response: Response, fallback: string) {
  const contentDisposition = response.headers.get('Content-Disposition');

  if (!contentDisposition) {
    return fallback;
  }

  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
  const quotedMatch = /filename="([^"]+)"/i.exec(contentDisposition);
  const plainMatch = /filename=([^;]+)/i.exec(contentDisposition);
  const rawFileName = utf8Match?.[1] ?? quotedMatch?.[1] ?? plainMatch?.[1];

  return rawFileName ? decodeURIComponent(rawFileName.trim()) : fallback;
}

export async function exportCompareResult({
  compareResult,
  format,
  jobId,
  options,
  selectedDiffId
}: {
  compareResult: CompareResponse;
  format: 'html' | 'pdf';
  jobId?: string | null;
  options: ExportOptions;
  selectedDiffId?: string | null;
}) {
  const token = getAuthToken();
  const headers = new Headers({
    'Content-Type': 'application/json'
  });
  const body: ExportRequestBody = {
    compareResult,
    jobId: jobId ?? compareResult.jobId ?? null,
    options,
    selectedDiffId
  };

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`/api/export/${format}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(error?.message ?? '导出失败');
  }

  const blob = await response.blob();
  const extension = getFileExtension(format);
  const fileName = readDownloadFileName(response, `diff-report-${Date.now()}.${extension}`);

  downloadBlob(blob, fileName);

  return {
    fileName
  };
}
