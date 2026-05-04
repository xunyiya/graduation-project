import type { Request, Response } from 'express';

import { getDashboardStats } from '../services/dashboard.service.js';

export function getDashboard(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: '请先登录后再访问数据看板。'
    });
    return;
  }

  res.json({
    success: true,
    data: getDashboardStats(req.user.id)
  });
}
