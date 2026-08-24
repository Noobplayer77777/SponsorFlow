import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { Role } from '@prisma/client';

// @desc    Get all users (useful for populating assignment dropdowns)
// @route   GET /api/users
// @access  Private
export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { role } = req.query;
    const where = role ? { role: role as Role } : {};

    // Select specific fields to avoid sending sensitive data like googleId
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get a specific user by ID and see their assigned companies
// @route   GET /api/users/:id
// @access  Private
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id as string },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        assignments: {
          include: {
            company: {
              select: { id: true, companyName: true, status: true }
            }
          }
        }
      },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
