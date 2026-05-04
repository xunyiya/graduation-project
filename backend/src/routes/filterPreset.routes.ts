import { Router } from 'express';

import {
  createPreset,
  deletePresetById,
  getPresetById,
  listPresets,
  setPresetDefault,
  updatePreset
} from '../controllers/filterPreset.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);
router.get('/', listPresets);
router.post('/', createPreset);
router.get('/:id', getPresetById);
router.put('/:id', updatePreset);
router.delete('/:id', deletePresetById);
router.post('/:id/default', setPresetDefault);

export default router;
