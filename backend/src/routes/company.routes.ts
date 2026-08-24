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
import { addNote } from '../controllers/note.controller';
import { addReply } from '../controllers/reply.controller';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// @route GET /api/companies
router.get('/', getCompanies);

// @route GET /api/companies/:id
router.get('/:id', getCompany);

// @route POST /api/companies/notes
router.post('/:companyId/notes', addNote);

// @route POST /api/companies/replies
router.post('/:companyId/replies', addReply);

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

import { lockCompany, unlockCompany } from '../controllers/assignment.controller';

// @route POST /api/companies/:id/lock
router.post('/:id/lock', lockCompany);

// @route POST /api/companies/:id/unlock
router.post('/:id/unlock', unlockCompany);

export default router;
