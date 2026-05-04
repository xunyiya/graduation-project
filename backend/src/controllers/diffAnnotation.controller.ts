import type { Request, Response } from 'express';

import {
  createAnnotation,
  deleteAnnotation,
  listAnnotationsByJob,
  updateAnnotation,
  type DiffAnnotationRecord
} from '../services/diffAnnotation.service.js';

const allowedTags = new Set(['待复查', '已确认', '正常变化', '异常变化']);

function parsePositiveId(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const id = Number.parseInt(value, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function readNote(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function readDiffId(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function readTag(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  return allowedTags.has(value) ? value : undefined;
}

function toAnnotationResponse(annotation: DiffAnnotationRecord) {
  return {
    id: String(annotation.id),
    jobId: String(annotation.jobId),
    diffId: annotation.diffId,
    note: annotation.note,
    tag: annotation.tag,
    resolved: annotation.resolved,
    createdAt: annotation.createdAt,
    updatedAt: annotation.updatedAt
  };
}

export function listJobAnnotations(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: '请先登录后再访问差异备注。'
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

  const annotations = listAnnotationsByJob(req.user.id, jobId);

  if (!annotations) {
    res.status(404).json({
      success: false,
      message: '对比任务不存在或无权访问备注。'
    });
    return;
  }

  res.json({
    success: true,
    data: annotations.map(toAnnotationResponse)
  });
}

export function createJobAnnotation(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: '请先登录后再创建差异备注。'
    });
    return;
  }

  const jobId = parsePositiveId(req.params.jobId);
  const diffId = readDiffId(req.body?.diffId);
  const note = readNote(req.body?.note);
  const tag = readTag(req.body?.tag);

  if (!jobId || !diffId || !note || tag === undefined) {
    res.status(400).json({
      success: false,
      message: '差异备注内容不完整。'
    });
    return;
  }

  const annotation = createAnnotation(req.user.id, {
    jobId,
    diffId,
    note,
    tag,
    resolved: req.body?.resolved === true
  });

  if (!annotation) {
    res.status(404).json({
      success: false,
      message: '对比任务不存在或无权添加备注。'
    });
    return;
  }

  res.status(201).json({
    success: true,
    data: toAnnotationResponse(annotation)
  });
}

export function updateAnnotationById(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: '请先登录后再更新差异备注。'
    });
    return;
  }

  const id = parsePositiveId(req.params.id);
  const tagProvided = req.body?.tag !== undefined;
  const tag = tagProvided ? readTag(req.body.tag) : undefined;
  const note = req.body?.note === undefined ? undefined : readNote(req.body.note);

  if (!id || (tagProvided && tag === undefined) || note === '') {
    res.status(400).json({
      success: false,
      message: '差异备注内容无效。'
    });
    return;
  }

  const annotation = updateAnnotation(req.user.id, id, {
    note,
    tag: tagProvided ? tag : undefined,
    resolved: req.body?.resolved === undefined ? undefined : req.body.resolved === true
  });

  if (!annotation) {
    res.status(404).json({
      success: false,
      message: '差异备注不存在或无权更新。'
    });
    return;
  }

  res.json({
    success: true,
    data: toAnnotationResponse(annotation)
  });
}

export function deleteAnnotationById(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: '请先登录后再删除差异备注。'
    });
    return;
  }

  const id = parsePositiveId(req.params.id);

  if (!id) {
    res.status(400).json({
      success: false,
      message: '差异备注 ID 无效。'
    });
    return;
  }

  const deleted = deleteAnnotation(req.user.id, id);

  if (!deleted) {
    res.status(404).json({
      success: false,
      message: '差异备注不存在或无权删除。'
    });
    return;
  }

  res.json({
    success: true,
    message: '差异备注已删除。'
  });
}
