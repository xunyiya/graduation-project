import { Router } from 'express';

import { compareDiff, compareVersionDiff } from '../controllers/diff.controller.js';
import { compareUpload, versionCompareUpload } from '../middleware/upload.js';

const router = Router();

router.post('/compare', compareUpload, compareDiff);
router.post('/compare-versions', versionCompareUpload, compareVersionDiff);

export default router;
