import { Router } from 'express';

import { exportHtml, exportPdf } from '../controllers/export.controller.js';

const router = Router();

router.post('/html', exportHtml);
router.post('/pdf', exportPdf);

export default router;
