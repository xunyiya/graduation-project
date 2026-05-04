import type { Request, Response } from 'express';

import { buildExportHtml, buildExportPdf } from '../services/export.service.js';
import { createExportRecord } from '../services/exportRecord.service.js';
import type { ExportRequestBody } from '../types/api.js';

function getFileName(extension: 'html' | 'pdf') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `diff-report-${timestamp}.${extension}`;
}

function validateExportBody(body: Partial<ExportRequestBody>) {
  return Boolean(body.compareResult && body.options);
}

function parseOptionalJobId(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const id =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseInt(value, 10)
        : Number.NaN;

  return Number.isInteger(id) && id > 0 ? id : undefined;
}

function writeExportRecord(
  req: Request<unknown, unknown, ExportRequestBody>,
  res: Response,
  exportType: 'html' | 'pdf',
  fileName: string
) {
  const jobId = parseOptionalJobId(req.body.jobId);

  if (jobId === undefined) {
    res.status(400).json({
      success: false,
      message: '对比任务 ID 无效。'
    });
    return false;
  }

  if (!req.user) {
    return true;
  }

  const record = createExportRecord(req.user.id, {
    jobId,
    exportType,
    fileName,
    options: req.body.options
  });

  if (!record) {
    res.status(404).json({
      success: false,
      message: '对比任务不存在或无权关联导出记录。'
    });
    return false;
  }

  return true;
}

export function exportHtml(req: Request<unknown, unknown, ExportRequestBody>, res: Response) {
  if (!validateExportBody(req.body)) {
    res.status(400).json({
      success: false,
      message: '缺少导出数据或导出配置。'
    });
    return;
  }

  const html = buildExportHtml(req.body);
  const fileName = getFileName('html');

  if (!writeExportRecord(req, res, 'html', fileName)) {
    return;
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.send(html);
}

export async function exportPdf(req: Request<unknown, unknown, ExportRequestBody>, res: Response) {
  try {
    if (!validateExportBody(req.body)) {
      res.status(400).json({
        success: false,
        message: '缺少导出数据或导出配置。'
      });
      return;
    }

    const pdf = await buildExportPdf(req.body);
    const fileName = getFileName('pdf');

    if (!writeExportRecord(req, res, 'pdf', fileName)) {
      return;
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(pdf);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'PDF 导出失败。'
    });
  }
}
