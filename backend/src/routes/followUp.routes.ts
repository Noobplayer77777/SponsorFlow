import { Router } from 'express';
import { updateFollowUpStatus } from '../controllers/followUp.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);
router.put('/:id', updateFollowUpStatus);

export default router;
