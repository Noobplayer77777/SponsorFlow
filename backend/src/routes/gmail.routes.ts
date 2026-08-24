import { Router } from 'express';
import { 
  getGmailStatus, 
  getGmailAuthUrl, 
  gmailCallback, 
  sendTestEmail 
} from '../controllers/gmail.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// All Gmail routes require authentication (must be logged in to SponsorFlow first)
router.use(requireAuth);

// @route GET /api/gmail/status
router.get('/status', getGmailStatus);

// @route GET /api/gmail/auth
router.get('/auth', getGmailAuthUrl);

// @route POST /api/gmail/callback
router.post('/callback', gmailCallback);

// @route POST /api/gmail/send
router.post('/send', sendTestEmail);

export default router;
