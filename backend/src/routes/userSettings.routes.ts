import { Router } from 'express';

import { getSettings, resetSettings, updateSettings } from '../controllers/userSettings.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);
router.get('/', getSettings);
router.put('/', updateSettings);
router.post('/reset', resetSettings);

export default router;
