import { Router } from 'express';

import {
  createHistory,
  deleteHistoryById,
  getHistoryById,
  listHistory
} from '../controllers/history.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);
router.get('/', listHistory);
router.post('/', createHistory);
router.get('/:id', getHistoryById);
router.delete('/:id', deleteHistoryById);

export default router;
