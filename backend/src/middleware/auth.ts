import type { NextFunction, Request, Response } from 'express';

import { verifyAuthToken } from '../services/auth.service.js';
import { findUserById, toPublicUser, type PublicUser } from '../services/user.service.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: PublicUser;
  }
}

function readBearerToken(req: Request) {
  const header = req.header('authorization');

  if (!header?.startsWith('Bearer ')) {
    return null;
  }

  return header.slice('Bearer '.length).trim();
}

function readUserFromRequest(req: Request) {
  const token = readBearerToken(req);

  if (!token) {
    return null;
  }

  const payload = verifyAuthToken(token);
  const userId = payload ? Number.parseInt(payload.sub, 10) : Number.NaN;

  if (!payload || !Number.isFinite(userId)) {
    return null;
  }

  const user = findUserById(userId);

  return user ? toPublicUser(user) : null;
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const user = readUserFromRequest(req);

  if (user) {
    req.user = user;
  }

  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = readBearerToken(req);

  if (!token) {
    res.status(401).json({
      success: false,
      message: '请先登录后再访问该接口。'
    });
    return;
  }

  const user = readUserFromRequest(req);

  if (!user) {
    res.status(401).json({
      success: false,
      message: '登录状态无效或已过期，请重新登录。'
    });
    return;
  }

  req.user = user;
  next();
}
