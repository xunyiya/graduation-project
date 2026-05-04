import type { Request, Response } from 'express';

import {
  ensureUserSettings,
  resetUserSettings,
  updateUserSettings,
  type UserSettingsRecord,
  type UserTheme
} from '../services/userSettings.service.js';
import type { RequestFileType } from '../types/api.js';

const supportedFileTypes = new Set<RequestFileType>(['auto', 'text', 'json', 'csv', 'excel']);
const supportedThemes = new Set<UserTheme>(['light', 'dark']);

function parseFileType(value: unknown): RequestFileType | null {
  if (typeof value !== 'string') {
    return null;
  }

  return supportedFileTypes.has(value as RequestFileType) ? (value as RequestFileType) : null;
}

function parseTheme(value: unknown): UserTheme | null {
  if (typeof value !== 'string') {
    return null;
  }

  return supportedThemes.has(value as UserTheme) ? (value as UserTheme) : null;
}

function toSettingsResponse(settings: UserSettingsRecord) {
  return {
    userId: settings.userId,
    defaultFileType: settings.defaultFileType,
    defaultFilters: settings.defaultFilters,
    defaultAdvancedRules: settings.defaultAdvancedRules,
    defaultNormalization: settings.defaultNormalization,
    theme: settings.theme,
    createdAt: settings.createdAt,
    updatedAt: settings.updatedAt
  };
}

export function getSettings(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: '请先登录后再访问个人设置。'
    });
    return;
  }

  res.json({
    success: true,
    data: toSettingsResponse(ensureUserSettings(req.user.id))
  });
}

export function updateSettings(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: '请先登录后再更新个人设置。'
    });
    return;
  }

  const parsedFileType =
    req.body?.defaultFileType === undefined ? undefined : parseFileType(req.body.defaultFileType);
  const parsedTheme = req.body?.theme === undefined ? undefined : parseTheme(req.body.theme);

  if (req.body?.defaultFileType !== undefined && !parsedFileType) {
    res.status(400).json({
      success: false,
      message: '默认文件类型无效。'
    });
    return;
  }

  if (req.body?.theme !== undefined && !parsedTheme) {
    res.status(400).json({
      success: false,
      message: '界面主题无效。'
    });
    return;
  }

  const settings = updateUserSettings(req.user.id, {
    defaultFileType: parsedFileType ?? undefined,
    defaultFilters: req.body?.defaultFilters,
    defaultAdvancedRules: req.body?.defaultAdvancedRules,
    defaultNormalization: req.body?.defaultNormalization,
    theme: parsedTheme ?? undefined
  });

  res.json({
    success: true,
    data: toSettingsResponse(settings)
  });
}

export function resetSettings(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: '请先登录后再重置个人设置。'
    });
    return;
  }

  res.json({
    success: true,
    data: toSettingsResponse(resetUserSettings(req.user.id))
  });
}
