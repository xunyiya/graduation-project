import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import multer from 'multer';

import { env } from '../config/env.js';

const uploadDir = path.resolve(process.cwd(), 'uploads');

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadDir);
  },
  filename: (_req, file, callback) => {
    const safeName = file.originalname.replace(/[^\w.-]/g, '_');
    callback(null, `${Date.now()}-${crypto.randomUUID()}-${safeName}`);
  }
});

export const upload = multer({
  storage,
  limits: {
    fileSize: env.uploadLimitMb * 1024 * 1024
  }
});

export const compareUpload = upload.fields([
  { name: 'leftFile', maxCount: 1 },
  { name: 'rightFile', maxCount: 1 }
]);

export const versionCompareUpload = upload.array('versionFiles', 16);
