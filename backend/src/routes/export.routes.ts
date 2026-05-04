import { Router } from 'express';

import { exportHtml, exportPdf } from '../controllers/export.controller.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

router.post('/html', optionalAuth, exportHtml);
router.post('/pdf', optionalAuth, exportPdf);

export default router;
