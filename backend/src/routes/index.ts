import { Router } from 'express';

import authRouter from './auth.routes.js';
import compareJobRouter from './compareJob.routes.js';
import dashboardRouter from './dashboard.routes.js';
import diffAnnotationRouter from './diffAnnotation.routes.js';
import diffRouter from './diff.routes.js';
import exportRecordRouter from './exportRecord.routes.js';
import exportRouter from './export.routes.js';
import fileRecordRouter from './fileRecord.routes.js';
import filterPresetRouter from './filterPreset.routes.js';
import healthRouter from './health.routes.js';
import historyRouter from './history.routes.js';
import userSettingsRouter from './userSettings.routes.js';
import versionChainRecordRouter from './versionChainRecord.routes.js';

const router = Router();

router.use('/health', healthRouter);
router.use('/auth', authRouter);
router.use('/dashboard', dashboardRouter);
router.use('/', diffAnnotationRouter);
router.use('/', exportRecordRouter);
router.use('/diff', diffRouter);
router.use('/export', exportRouter);
router.use('/files', fileRecordRouter);
router.use('/filter-presets', filterPresetRouter);
router.use('/history', historyRouter);
router.use('/jobs', compareJobRouter);
router.use('/settings', userSettingsRouter);
router.use('/version-chains', versionChainRecordRouter);

export default router;
