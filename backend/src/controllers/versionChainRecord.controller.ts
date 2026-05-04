import type { Request, Response } from 'express';

import {
  deleteVersionChainById,
  getVersionChainById,
  listVersionChains,
  type VersionChainFileRecord,
  type VersionChainRecord
} from '../services/versionChainRecord.service.js';
import { getCompareJobById } from '../services/compareJob.service.js';
import type { VersionChainResponse } from '../types/api.js';

function parsePositiveId(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const id = Number.parseInt(value, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function readCompareJobId(summary: Record<string, unknown>) {
  const value = summary.compareJobId;

  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string') {
    const id = Number.parseInt(value, 10);

    return Number.isInteger(id) && id > 0 ? id : null;
  }

  return null;
}

function isVersionChainResult(value: unknown): value is VersionChainResponse {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'intervals' in value &&
      'versions' in value &&
      'trend' in value
  );
}

function toChainFileResponse(file: VersionChainFileRecord) {
  return {
    id: String(file.id),
    fileId: file.fileId === null ? null : String(file.fileId),
    versionIndex: file.versionIndex,
    versionLabel: file.versionLabel,
    fileName: file.fileName,
    createdAt: file.createdAt
  };
}

function readVersionResult(
  userId: number,
  chain: VersionChainRecord
): VersionChainResponse | undefined {
  const compareJobId = readCompareJobId(chain.summary);

  if (!compareJobId) {
    return undefined;
  }

  const job = getCompareJobById(userId, compareJobId);

  if (!job?.result || !isVersionChainResult(job.result.resultJson)) {
    return undefined;
  }

  return {
    ...job.result.resultJson,
    chainId: String(chain.id),
    jobId: String(job.id)
  };
}

function toChainResponse(chain: VersionChainRecord, versionResult?: VersionChainResponse) {
  return {
    id: String(chain.id),
    title: chain.title,
    fileType: chain.fileType,
    summary: chain.summary,
    trend: chain.trend,
    versionCount: chain.files.length,
    totalDifferences: chain.trend.totalDifferences,
    peakIntervalLabel: chain.trend.peakIntervalLabel,
    createdAt: chain.createdAt,
    files: chain.files.map(toChainFileResponse),
    versionResult
  };
}

export function listChains(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: '请先登录后再访问多版本记录。'
    });
    return;
  }

  res.json({
    success: true,
    data: listVersionChains(req.user.id).map((chain) => toChainResponse(chain))
  });
}

export function getChainById(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: '请先登录后再读取多版本记录。'
    });
    return;
  }

  const id = parsePositiveId(req.params.id);

  if (!id) {
    res.status(400).json({
      success: false,
      message: '版本链 ID 无效。'
    });
    return;
  }

  const chain = getVersionChainById(req.user.id, id);

  if (!chain) {
    res.status(404).json({
      success: false,
      message: '版本链不存在或无权访问。'
    });
    return;
  }

  res.json({
    success: true,
    data: toChainResponse(chain, readVersionResult(req.user.id, chain))
  });
}

export function deleteChainById(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: '请先登录后再删除多版本记录。'
    });
    return;
  }

  const id = parsePositiveId(req.params.id);

  if (!id) {
    res.status(400).json({
      success: false,
      message: '版本链 ID 无效。'
    });
    return;
  }

  const deleted = deleteVersionChainById(req.user.id, id);

  if (!deleted) {
    res.status(404).json({
      success: false,
      message: '版本链不存在或无权删除。'
    });
    return;
  }

  res.json({
    success: true,
    message: '多版本记录已删除。'
  });
}
