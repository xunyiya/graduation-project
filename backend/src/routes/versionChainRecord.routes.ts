import { Router } from 'express';

import {
  deleteChainById,
  getChainById,
  listChains
} from '../controllers/versionChainRecord.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);
router.get('/', listChains);
router.get('/:id', getChainById);
router.delete('/:id', deleteChainById);

export default router;
