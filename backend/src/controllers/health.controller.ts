import type { Request, Response } from 'express';

export function getHealth(_req: Request, res: Response) {
  res.json({
    success: true,
    service: 'data-diff-visualizer-backend',
    timestamp: new Date().toISOString(),
    version: '0.1.0'
  });
}
