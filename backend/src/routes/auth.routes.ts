import { Router, Request, Response } from 'express';
import { googleLogin } from '../controllers/auth.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

// @route POST /api/auth/google
router.post('/google', googleLogin);

// Test routes for RBAC (Role-Based Access Control)
// These routes verify testing conditions:
// "ADMIN access", "MEMBER access", "Unauthorized API request", "Invalid role access"

// Available to any authenticated user
router.get('/me', requireAuth, (req: Request, res: Response) => {
  res.json({ success: true, user: req.user });
});

// Available ONLY to ADMIN
router.get('/admin-only', requireAuth, requireRole('ADMIN'), (req: Request, res: Response) => {
  res.json({ success: true, message: 'Welcome Admin' });
});

// Available ONLY to MEMBER
router.get('/member-only', requireAuth, requireRole('MEMBER'), (req: Request, res: Response) => {
  res.json({ success: true, message: 'Welcome Member' });
});

export default router;
