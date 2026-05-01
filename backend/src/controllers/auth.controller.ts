import type { Request, Response } from 'express';

import { createAuthToken } from '../services/auth.service.js';
import {
  createUser,
  findUserByUsername,
  toPublicUser,
  verifyUserPassword
} from '../services/user.service.js';

function readCredentialBody(req: Request) {
  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  return {
    username,
    password
  };
}

function sendAuthSuccess(res: Response, user: ReturnType<typeof toPublicUser>) {
  res.json({
    success: true,
    data: {
      user,
      token: createAuthToken(user)
    }
  });
}

export async function register(req: Request, res: Response) {
  const { username, password } = readCredentialBody(req);

  if (!username || !password) {
    res.status(400).json({
      success: false,
      message: '用户名和密码不能为空。'
    });
    return;
  }

  if (findUserByUsername(username)) {
    res.status(409).json({
      success: false,
      message: '用户名已存在，请换一个用户名。'
    });
    return;
  }

  const user = await createUser(username, password);
  sendAuthSuccess(res.status(201), toPublicUser(user));
}

export async function login(req: Request, res: Response) {
  const { username, password } = readCredentialBody(req);

  if (!username || !password) {
    res.status(400).json({
      success: false,
      message: '用户名和密码不能为空。'
    });
    return;
  }

  const user = findUserByUsername(username);
  const passwordMatched = user ? await verifyUserPassword(user, password) : false;

  if (!user || !passwordMatched) {
    res.status(401).json({
      success: false,
      message: '用户名或密码错误。'
    });
    return;
  }

  sendAuthSuccess(res, toPublicUser(user));
}

export function logout(_req: Request, res: Response) {
  res.json({
    success: true,
    message: '已退出登录。'
  });
}

export function getCurrentUser(req: Request, res: Response) {
  res.json({
    success: true,
    data: {
      user: req.user
    }
  });
}
