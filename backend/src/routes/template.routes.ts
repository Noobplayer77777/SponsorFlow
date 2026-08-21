import { Router } from 'express';
import {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from '../controllers/template.controller';

const router = Router();

// Base route: /api/templates

router.route('/')
  .get(getTemplates)
  .post(createTemplate);

router.route('/:id')
  .get(getTemplateById)
  .patch(updateTemplate)
  .delete(deleteTemplate);

export default router;
