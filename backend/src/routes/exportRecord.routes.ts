import { Router } from 'express';

import {
  deleteExportRecordById,
  listExports,
  listJobExports
} from '../controllers/exportRecord.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/export-records', requireAuth, listExports);
router.get('/jobs/:jobId/export-records', requireAuth, listJobExports);
router.delete('/export-records/:id', requireAuth, deleteExportRecordById);

export default router;
