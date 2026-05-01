import type { CompareResponse, ExportOptions, ExportRequestBody } from '../types/api';

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

export async function exportCompareResult({
  compareResult,
  format,
  options,
  selectedDiffId
}: {
  compareResult: CompareResponse;
  format: 'html' | 'pdf';
  options: ExportOptions;
  selectedDiffId?: string | null;
}) {
  const body: ExportRequestBody = {
    compareResult,
    options,
    selectedDiffId
  };
  const response = await fetch(`/api/export/${format}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(error?.message ?? '导出失败');
  }

  const blob = await response.blob();
  const extension = getFileExtension(format);
  downloadBlob(blob, `diff-report-${Date.now()}.${extension}`);
}
