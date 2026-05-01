import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';
import type { PublicUser } from './user.service.js';

export interface AuthTokenPayload {
  sub: string;
  username: string;
}

export function createAuthToken(user: PublicUser) {
  return jwt.sign(
    {
      sub: String(user.id),
      username: user.username
    },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn']
    }
  );
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  try {
    const payload = jwt.verify(token, env.jwtSecret);

    if (typeof payload === 'string') {
      return null;
    }

    if (typeof payload.sub !== 'string' || typeof payload.username !== 'string') {
      return null;
    }

    return {
      sub: payload.sub,
      username: payload.username
    };
  } catch {
    return null;
  }
}
