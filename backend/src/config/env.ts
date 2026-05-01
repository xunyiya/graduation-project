import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config();

function readNumber(name: string, fallback: number) {
  const rawValue = process.env[name];
  const parsedValue = rawValue ? Number.parseInt(rawValue, 10) : Number.NaN;

  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: readNumber('PORT', 3001),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  uploadLimitMb: readNumber('UPLOAD_LIMIT_MB', 200),
  databasePath: process.env.DATABASE_PATH ?? path.resolve(process.cwd(), 'data/app.db'),
  jwtSecret: process.env.JWT_SECRET ?? 'data-diff-visualizer-dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d'
};
