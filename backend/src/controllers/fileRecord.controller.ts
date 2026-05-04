import type { Request, Response } from 'express';

import {
  deleteUploadedFileById,
  getUploadedFileById,
  listUploadedFiles,
  type UploadedFileRecord
} from '../services/fileRecord.service.js';

interface UploadedFileResponse {
  id: string;
  fileName: string;
  fileType: string;
  mimeType: string | null;
  sizeBytes: number;
  sha256Prefix: string | null;
  sourceType: string;
  createdAt: string;
}

function parseFileId(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const id = Number.parseInt(value, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function toUploadedFileResponse(record: UploadedFileRecord): UploadedFileResponse {
  return {
    id: String(record.id),
    fileName: record.originalName,
    fileType: record.fileType,
    mimeType: record.mimeType,
    sizeBytes: record.sizeBytes,
    sha256Prefix: record.sha256 ? record.sha256.slice(0, 12) : null,
    sourceType: record.sourceType,
    createdAt: record.createdAt
  };
}

export function listFiles(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: '请先登录后再访问文件记录。'
    });
    return;
  }

  res.json({
    success: true,
    data: listUploadedFiles(req.user.id).map(toUploadedFileResponse)
  });
}

export function getFileById(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: '请先登录后再读取文件记录。'
    });
    return;
  }

  const id = parseFileId(req.params.id);

  if (!id) {
    res.status(400).json({
      success: false,
      message: '文件记录 ID 无效。'
    });
    return;
  }

  const record = getUploadedFileById(req.user.id, id);

  if (!record) {
    res.status(404).json({
      success: false,
      message: '文件记录不存在或无权访问。'
    });
    return;
  }

  res.json({
    success: true,
    data: toUploadedFileResponse(record)
  });
}

export function deleteFileById(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: '请先登录后再删除文件记录。'
    });
    return;
  }

  const id = parseFileId(req.params.id);

  if (!id) {
    res.status(400).json({
      success: false,
      message: '文件记录 ID 无效。'
    });
    return;
  }

  const deleted = deleteUploadedFileById(req.user.id, id);

  if (!deleted) {
    res.status(404).json({
      success: false,
      message: '文件记录不存在或无权删除。'
    });
    return;
  }

  res.json({
    success: true,
    message: '文件记录已删除。'
  });
}
