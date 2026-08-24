import { Router } from 'express';
import multer from 'multer';
import { 
  getCompanies, 
  getCompany, 
  createCompany, 
  updateCompany, 
  deleteCompany,
  importCompanies
} from '../controllers/company.controller';
import { requireRole } from '../middleware/auth.middleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// @route GET /api/companies
router.get('/', getCompanies);

// @route GET /api/companies/:id
router.get('/:id', getCompany);

// @route POST /api/companies
router.post('/', createCompany);

// @route PUT /api/companies/:id
router.put('/:id', updateCompany);

// @route DELETE /api/companies/:id
// ONLY ADMIN CAN DELETE
router.delete('/:id', requireRole('ADMIN'), deleteCompany);

// @route POST /api/companies/import
// ONLY ADMIN CAN IMPORT
router.post('/import', requireRole('ADMIN'), upload.single('file'), importCompanies);

export default router;
