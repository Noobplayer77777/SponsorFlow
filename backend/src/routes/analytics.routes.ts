import { Router } from 'express';
import { getAdminDashboardStats } from '../controllers/analytics.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth, requireRole('ADMIN'));
router.get('/dashboard', getAdminDashboardStats);

export default router;
