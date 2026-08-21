import { Router } from 'express';
import {
  getCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  updateCompanyStatus,
  deleteCompany,
} from '../controllers/company.controller';

const router = Router();

// Base route: /api/companies

router.route('/')
  .get(getCompanies)
  .post(createCompany);

router.route('/:id')
  .get(getCompanyById)
  .patch(updateCompany)
  .delete(deleteCompany);

router.route('/:id/status')
  .patch(updateCompanyStatus);

export default router;
