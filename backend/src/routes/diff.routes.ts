import { Router } from 'express';

import { compareDiff, compareVersionDiff } from '../controllers/diff.controller.js';
import { optionalAuth } from '../middleware/auth.js';
import { compareUpload, versionCompareUpload } from '../middleware/upload.js';

const router = Router();

router.post('/compare', optionalAuth, compareUpload, compareDiff);
router.post('/compare-versions', optionalAuth, versionCompareUpload, compareVersionDiff);

export default router;
