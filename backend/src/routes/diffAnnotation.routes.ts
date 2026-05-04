import { Router } from 'express';

import {
  createJobAnnotation,
  deleteAnnotationById,
  listJobAnnotations,
  updateAnnotationById
} from '../controllers/diffAnnotation.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/jobs/:jobId/annotations', requireAuth, listJobAnnotations);
router.post('/jobs/:jobId/annotations', requireAuth, createJobAnnotation);
router.put('/annotations/:id', requireAuth, updateAnnotationById);
router.delete('/annotations/:id', requireAuth, deleteAnnotationById);

export default router;
