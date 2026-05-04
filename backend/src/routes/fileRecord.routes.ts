import { Router } from 'express';

import { deleteFileById, getFileById, listFiles } from '../controllers/fileRecord.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);
router.get('/', listFiles);
router.get('/:id', getFileById);
router.delete('/:id', deleteFileById);

export default router;
