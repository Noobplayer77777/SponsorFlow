import { Router } from 'express';
import { personalizeIntro, suggestReply, generateSummary } from '../controllers/ai.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.post('/personalize', personalizeIntro);
router.post('/reply', suggestReply);
router.post('/summary', generateSummary);

export default router;
