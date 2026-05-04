import type { Request, Response } from 'express';

import {
  createFilterPreset,
  deleteFilterPreset,
  getFilterPresetById,
  listFilterPresets,
  setDefaultFilterPreset,
  updateFilterPreset,
  type FilterPresetRecord
} from '../services/filterPreset.service.js';
import type { RequestFileType } from '../types/api.js';

const supportedFileTypes = new Set<RequestFileType>(['auto', 'text', 'json', 'csv', 'excel']);

function parsePresetId(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const id = Number.parseInt(value, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function parseFileType(value: unknown): RequestFileType | null {
  if (typeof value !== 'string') {
    return null;
  }

  return supportedFileTypes.has(value as RequestFileType) ? (value as RequestFileType) : null;
}

function readName(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function readDescription(value: unknown) {
  if (value === null) {
    return null;
  }

  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function hasRulesBody(body: Record<string, unknown>) {
  return Boolean(body.filters && body.advancedRules && body.normalization);
}

function toPresetResponse(preset: FilterPresetRecord) {
  return {
    id: String(preset.id),
    name: preset.name,
    description: preset.description,
    fileType: preset.fileType,
    filters: preset.filters,
    advancedRules: preset.advancedRules,
    normalization: preset.normalization,
    isDefault: preset.isDefault,
    createdAt: preset.createdAt,
    updatedAt: preset.updatedAt
  };
}

export function listPresets(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: '请先登录后再访问规则预设。'
    });
    return;
  }

  const parsedFileType = req.query.fileType ? parseFileType(req.query.fileType) : undefined;

  if (req.query.fileType && !parsedFileType) {
    res.status(400).json({
      success: false,
      message: '文件类型无效。'
    });
    return;
  }

  const fileType = parsedFileType ?? undefined;

  res.json({
    success: true,
    data: listFilterPresets(req.user.id, fileType).map(toPresetResponse)
  });
}

export function createPreset(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: '请先登录后再创建规则预设。'
    });
    return;
  }

  const name = readName(req.body?.name);
  const fileType = parseFileType(req.body?.fileType ?? 'auto');

  if (!name || !fileType || !hasRulesBody(req.body ?? {})) {
    res.status(400).json({
      success: false,
      message: '规则预设内容不完整。'
    });
    return;
  }

  const preset = createFilterPreset(req.user.id, {
    name,
    description: readDescription(req.body?.description),
    fileType,
    filters: req.body.filters,
    advancedRules: req.body.advancedRules,
    normalization: req.body.normalization,
    isDefault: req.body?.isDefault === true
  });

  res.status(201).json({
    success: true,
    data: toPresetResponse(preset)
  });
}

export function getPresetById(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: '请先登录后再读取规则预设。'
    });
    return;
  }

  const id = parsePresetId(req.params.id);

  if (!id) {
    res.status(400).json({
      success: false,
      message: '规则预设 ID 无效。'
    });
    return;
  }

  const preset = getFilterPresetById(req.user.id, id);

  if (!preset) {
    res.status(404).json({
      success: false,
      message: '规则预设不存在或无权访问。'
    });
    return;
  }

  res.json({
    success: true,
    data: toPresetResponse(preset)
  });
}

export function updatePreset(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: '请先登录后再更新规则预设。'
    });
    return;
  }

  const id = parsePresetId(req.params.id);

  if (!id) {
    res.status(400).json({
      success: false,
      message: '规则预设 ID 无效。'
    });
    return;
  }

  const parsedFileType =
    req.body?.fileType === undefined ? undefined : parseFileType(req.body.fileType);

  if (req.body?.fileType !== undefined && !parsedFileType) {
    res.status(400).json({
      success: false,
      message: '文件类型无效。'
    });
    return;
  }

  const fileType = parsedFileType ?? undefined;

  const preset = updateFilterPreset(req.user.id, id, {
    name: req.body?.name === undefined ? undefined : readName(req.body.name),
    description: req.body?.description === undefined ? undefined : readDescription(req.body.description),
    fileType,
    filters: req.body?.filters,
    advancedRules: req.body?.advancedRules,
    normalization: req.body?.normalization,
    isDefault: req.body?.isDefault === undefined ? undefined : req.body.isDefault === true
  });

  if (!preset) {
    res.status(404).json({
      success: false,
      message: '规则预设不存在或无权更新。'
    });
    return;
  }

  res.json({
    success: true,
    data: toPresetResponse(preset)
  });
}

export function deletePresetById(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: '请先登录后再删除规则预设。'
    });
    return;
  }

  const id = parsePresetId(req.params.id);

  if (!id) {
    res.status(400).json({
      success: false,
      message: '规则预设 ID 无效。'
    });
    return;
  }

  const deleted = deleteFilterPreset(req.user.id, id);

  if (!deleted) {
    res.status(404).json({
      success: false,
      message: '规则预设不存在或无权删除。'
    });
    return;
  }

  res.json({
    success: true,
    message: '规则预设已删除。'
  });
}

export function setPresetDefault(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: '请先登录后再设置默认规则预设。'
    });
    return;
  }

  const id = parsePresetId(req.params.id);

  if (!id) {
    res.status(400).json({
      success: false,
      message: '规则预设 ID 无效。'
    });
    return;
  }

  const preset = setDefaultFilterPreset(req.user.id, id);

  if (!preset) {
    res.status(404).json({
      success: false,
      message: '规则预设不存在或无权设置默认。'
    });
    return;
  }

  res.json({
    success: true,
    data: toPresetResponse(preset)
  });
}
