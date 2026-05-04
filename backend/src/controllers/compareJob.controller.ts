import type { Request, Response } from 'express';

import {
  deleteCompareJobById,
  getCompareJobById,
  listCompareJobs,
  type CompareJobFileRecord,
  type CompareJobRecord
} from '../services/compareJob.service.js';
import type { CompareResponse, DiffResultItem, VersionChainResponse } from '../types/api.js';

interface CompareJobFileResponse {
  id: string;
  fileId: string | null;
  role: string;
  versionIndex: number | null;
  displayName: string;
  createdAt: string;
}

interface CompareJobResponse {
  id: string;
  title: string;
  fileType: string;
  inputMode: string;
  status: string;
  algorithm: string | null;
  durationMs: number;
  resultCount: number;
  resultTruncated: boolean;
  createdAt: string;
  updatedAt: string;
  files?: CompareJobFileResponse[];
  compareResult?: CompareResponse;
  versionResult?: VersionChainResponse;
}

function parseJobId(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const id = Number.parseInt(value, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function toJobFileResponse(file: CompareJobFileRecord): CompareJobFileResponse {
  return {
    id: String(file.id),
    fileId: file.fileId ? String(file.fileId) : null,
    role: file.role,
    versionIndex: file.versionIndex,
    displayName: file.displayName,
    createdAt: file.createdAt
  };
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

function toCompareResult(job: CompareJobRecord): CompareResponse | undefined {
  if (!job.result || job.inputMode !== 'pair' || !Array.isArray(job.result.resultJson)) {
    return undefined;
  }

  return {
    success: true,
    jobId: String(job.id),
    fileType: job.fileType,
    summary: job.result.summary,
    result: job.result.resultJson as DiffResultItem[],
    filters: job.result.filters,
    advancedRules: job.result.advancedRules,
    normalization: job.result.normalization,
    performance: job.result.performance,
    message: '已从对比任务中心恢复结果。',
    received: job.result.received
  };
}

function toVersionResult(job: CompareJobRecord): VersionChainResponse | undefined {
  if (!job.result || job.inputMode !== 'versions' || !isVersionChainResult(job.result.resultJson)) {
    return undefined;
  }

  return {
    ...job.result.resultJson,
    jobId: String(job.id)
  };
}

function toJobResponse(job: CompareJobRecord, includeDetails = false): CompareJobResponse {
  const response: CompareJobResponse = {
    id: String(job.id),
    title: job.title,
    fileType: job.fileType,
    inputMode: job.inputMode,
    status: job.status,
    algorithm: job.algorithm,
    durationMs: job.durationMs,
    resultCount: job.resultCount,
    resultTruncated: job.resultTruncated,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt
  };

  if (!includeDetails) {
    return response;
  }

  return {
    ...response,
    files: job.files.map(toJobFileResponse),
    compareResult: toCompareResult(job),
    versionResult: toVersionResult(job)
  };
}

export function listJobs(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: '请先登录后再访问对比任务。'
    });
    return;
  }

  res.json({
    success: true,
    data: listCompareJobs(req.user.id).map((job) => toJobResponse(job))
  });
}

export function getJobById(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: '请先登录后再读取对比任务。'
    });
    return;
  }

  const id = parseJobId(req.params.id);

  if (!id) {
    res.status(400).json({
      success: false,
      message: '对比任务 ID 无效。'
    });
    return;
  }

  const job = getCompareJobById(req.user.id, id);

  if (!job) {
    res.status(404).json({
      success: false,
      message: '对比任务不存在或无权访问。'
    });
    return;
  }

  res.json({
    success: true,
    data: toJobResponse(job, true)
  });
}

export function deleteJobById(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: '请先登录后再删除对比任务。'
    });
    return;
  }

  const id = parseJobId(req.params.id);

  if (!id) {
    res.status(400).json({
      success: false,
      message: '对比任务 ID 无效。'
    });
    return;
  }

  const deleted = deleteCompareJobById(req.user.id, id);

  if (!deleted) {
    res.status(404).json({
      success: false,
      message: '对比任务不存在或无权删除。'
    });
    return;
  }

  res.json({
    success: true,
    message: '对比任务已删除。'
  });
}
