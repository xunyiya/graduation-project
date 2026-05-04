import type { Request, Response } from 'express';

import {
  deleteExportRecord,
  listExportRecords,
  listExportRecordsByJob,
  type ExportRecord
} from '../services/exportRecord.service.js';

function parsePositiveId(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const id = Number.parseInt(value, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function toExportRecordResponse(record: ExportRecord) {
  return {
    id: String(record.id),
    jobId: record.jobId === null ? null : String(record.jobId),
    jobTitle: record.jobTitle,
    exportType: record.exportType,
    fileName: record.fileName,
    options: record.options,
    createdAt: record.createdAt
  };
}

export function listExports(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: '请先登录后再访问导出记录。'
    });
    return;
  }

  res.json({
    success: true,
    data: listExportRecords(req.user.id).map(toExportRecordResponse)
  });
}

export function listJobExports(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: '请先登录后再访问任务导出记录。'
    });
    return;
  }

  const jobId = parsePositiveId(req.params.jobId);

  if (!jobId) {
    res.status(400).json({
      success: false,
      message: '对比任务 ID 无效。'
    });
    return;
  }

  const records = listExportRecordsByJob(req.user.id, jobId);

  if (!records) {
    res.status(404).json({
      success: false,
      message: '对比任务不存在或无权访问导出记录。'
    });
    return;
  }

  res.json({
    success: true,
    data: records.map(toExportRecordResponse)
  });
}

export function deleteExportRecordById(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: '请先登录后再删除导出记录。'
    });
    return;
  }

  const id = parsePositiveId(req.params.id);

  if (!id) {
    res.status(400).json({
      success: false,
      message: '导出记录 ID 无效。'
    });
    return;
  }

  const deleted = deleteExportRecord(req.user.id, id);

  if (!deleted) {
    res.status(404).json({
      success: false,
      message: '导出记录不存在或无权删除。'
    });
    return;
  }

  res.json({
    success: true,
    message: '导出记录已删除。'
  });
}
