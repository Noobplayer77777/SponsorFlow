import { Router } from 'express';
import { 
  getTemplates, 
  getTemplate, 
  createTemplate, 
  updateTemplate, 
  deleteTemplate 
} from '../controllers/template.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Members can read templates, Admin can manage them
router.use(requireAuth);

// @route GET /api/templates
router.get('/', getTemplates);

// @route GET /api/templates/:id
router.get('/:id', getTemplate);

// ADMIN ONLY ROUTES
router.use(requireRole('ADMIN'));

// @route POST /api/templates
router.post('/', createTemplate);

// @route PUT /api/templates/:id
router.put('/:id', updateTemplate);

// @route DELETE /api/templates/:id
router.delete('/:id', deleteTemplate);

export default router;
