import type { Request, Response } from 'express';

import {
  createHistoryRecord,
  deleteHistoryRecordById,
  getHistoryRecordById,
  listHistoryRecords,
  type CreateHistoryInput
} from '../services/history.service.js';
import type { CompareResponse, SupportedFileType } from '../types/api.js';

const supportedFileTypes = new Set<SupportedFileType>(['text', 'json', 'csv', 'excel']);

function readReceivedName(received: Record<string, unknown> | undefined, key: 'leftFile' | 'rightFile') {
  const value = received?.[key];
  return typeof value === 'string' && value.length > 0 ? value : '文本输入';
}

function parseHistoryId(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const id = Number.parseInt(value, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function readCreateHistoryInput(req: Request): CreateHistoryInput | null {
  const compareResult = req.body?.compareResult as CompareResponse | undefined;

  if (!compareResult || typeof compareResult !== 'object') {
    return null;
  }

  const fileType = req.body?.fileType ?? compareResult.fileType;

  if (!supportedFileTypes.has(fileType)) {
    return null;
  }

  const received = compareResult.received;
  const leftFileName =
    typeof req.body?.leftFileName === 'string' && req.body.leftFileName.trim().length > 0
      ? req.body.leftFileName.trim()
      : readReceivedName(received, 'leftFile');
  const rightFileName =
    typeof req.body?.rightFileName === 'string' && req.body.rightFileName.trim().length > 0
      ? req.body.rightFileName.trim()
      : readReceivedName(received, 'rightFile');

  if (!compareResult.summary || !compareResult.filters) {
    return null;
  }

  return {
    fileType,
    leftFileName,
    rightFileName,
    summary: req.body?.summary ?? compareResult.summary,
    filters: req.body?.filters ?? compareResult.filters,
    compareResult
  };
}

export function listHistory(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: '请先登录后再访问历史记录。'
    });
    return;
  }

  res.json({
    success: true,
    data: listHistoryRecords(req.user.id)
  });
}

export function createHistory(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: '请先登录后再保存历史记录。'
    });
    return;
  }

  const input = readCreateHistoryInput(req);

  if (!input) {
    res.status(400).json({
      success: false,
      message: '历史记录内容不完整，无法保存。'
    });
    return;
  }

  const record = createHistoryRecord(req.user.id, input);

  res.status(201).json({
    success: true,
    data: record
  });
}

export function getHistoryById(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: '请先登录后再读取历史记录。'
    });
    return;
  }

  const id = parseHistoryId(req.params.id);

  if (!id) {
    res.status(400).json({
      success: false,
      message: '历史记录 ID 无效。'
    });
    return;
  }

  const record = getHistoryRecordById(req.user.id, id);

  if (!record) {
    res.status(404).json({
      success: false,
      message: '历史记录不存在或无权访问。'
    });
    return;
  }

  res.json({
    success: true,
    data: record
  });
}

export function deleteHistoryById(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: '请先登录后再删除历史记录。'
    });
    return;
  }

  const id = parseHistoryId(req.params.id);

  if (!id) {
    res.status(400).json({
      success: false,
      message: '历史记录 ID 无效。'
    });
    return;
  }

  const deleted = deleteHistoryRecordById(req.user.id, id);

  if (!deleted) {
    res.status(404).json({
      success: false,
      message: '历史记录不存在或无权删除。'
    });
    return;
  }

  res.json({
    success: true,
    message: '历史记录已删除。'
  });
}
