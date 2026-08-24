import { Router } from 'express';
import { 
  assignCompany, 
  reassignCompany, 
  unassignCompany,
  autoDistribute
} from '../controllers/assignment.controller';
import { requireRole } from '../middleware/auth.middleware';

const router = Router();

// ADMIN ONLY routes for assignment management
router.use(requireRole('ADMIN'));

// @route POST /api/assignments
router.post('/', assignCompany);

// @route POST /api/assignments/auto
router.post('/auto', autoDistribute);

// @route PUT /api/assignments/:companyId
router.put('/:companyId', reassignCompany);

// @route DELETE /api/assignments/:companyId
router.delete('/:companyId', unassignCompany);

export default router;
