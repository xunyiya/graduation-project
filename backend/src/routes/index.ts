import { Router } from 'express';

import authRouter from './auth.routes.js';
import compareJobRouter from './compareJob.routes.js';
import diffRouter from './diff.routes.js';
import exportRouter from './export.routes.js';
import fileRecordRouter from './fileRecord.routes.js';
import healthRouter from './health.routes.js';
import historyRouter from './history.routes.js';

const router = Router();

router.use('/health', healthRouter);
router.use('/auth', authRouter);
router.use('/diff', diffRouter);
router.use('/export', exportRouter);
router.use('/files', fileRecordRouter);
router.use('/history', historyRouter);
router.use('/jobs', compareJobRouter);

export default router;
