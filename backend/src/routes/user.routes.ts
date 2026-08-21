import { Router } from 'express';
import { getUsers, getUserById } from '../controllers/user.controller';

const router = Router();

// Base route: /api/users

router.route('/')
  .get(getUsers);

router.route('/:id')
  .get(getUserById);

export default router;
