import { Router } from 'express';

import { deleteJobById, getJobById, listJobs } from '../controllers/compareJob.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);
router.get('/', listJobs);
router.get('/:id', getJobById);
router.delete('/:id', deleteJobById);

export default router;
