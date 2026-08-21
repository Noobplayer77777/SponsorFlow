import { Router } from 'express';
import {
  assignCompany,
  unassignCompany,
} from '../controllers/assignment.controller';

const router = Router();

// Base route: /api/assignments

router.route('/')
  .post(assignCompany);

router.route('/:companyId')
  .delete(unassignCompany);

export default router;
