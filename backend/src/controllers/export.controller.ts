import type { Request, Response } from 'express';

import { buildExportHtml, buildExportPdf } from '../services/export.service.js';
import type { ExportRequestBody } from '../types/api.js';

function getFileName(extension: 'html' | 'pdf') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `diff-report-${timestamp}.${extension}`;
}

function validateExportBody(body: Partial<ExportRequestBody>) {
  return Boolean(body.compareResult && body.options);
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

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${getFileName('html')}"`);
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

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${getFileName('pdf')}"`);
    res.send(pdf);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'PDF 导出失败。'
    });
  }
}
