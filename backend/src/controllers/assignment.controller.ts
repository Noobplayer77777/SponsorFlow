import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { Prisma } from '@prisma/client';

// @desc    Assign a company to a user (Admin only)
// @route   POST /api/assignments
export const assignCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId, userId } = req.body;

    if (!companyId || !userId) {
      res.status(400).json({ success: false, message: 'companyId and userId are required' });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const newAssignment = await tx.assignment.create({
        data: { companyId, userId },
      });

      await tx.company.update({
        where: { id: companyId },
        data: { status: 'ASSIGNED' },
      });

      return newAssignment;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      res.status(400).json({ 
        success: false, 
        message: 'This company is already assigned. Please use Reassign.' 
      });
      return;
    }
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Reassign a company to a different user (Admin only)
// @route   PUT /api/assignments/:companyId
export const reassignCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({ success: false, message: 'userId is required' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      // Upsert handles both assigning an unassigned company OR overwriting the existing owner
      await tx.assignment.upsert({
        where: { companyId },
        update: { userId },
        create: { companyId, userId }
      });
      
      await tx.company.update({
        where: { id: companyId },
        data: { status: 'ASSIGNED' }
      });
    });

    res.json({ success: true, message: 'Company reassigned successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Remove an assignment (Admin only)
// @route   DELETE /api/assignments/:companyId
export const unassignCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId } = req.params;

    await prisma.$transaction(async (tx) => {
      await tx.assignment.delete({ where: { companyId } });
      await tx.company.update({
        where: { id: companyId },
        data: { 
          status: 'NOT_ASSIGNED',
          lockedById: null, // Clear locks when unassigned
          lockedAt: null
        },
      });
    });

    res.json({ success: true, message: 'Company unassigned successfully' });
  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      res.status(404).json({ success: false, message: 'Assignment not found.' });
      return;
    }
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Auto distribute unassigned companies (Admin only)
// @route   POST /api/assignments/auto
export const autoDistribute = async (req: Request, res: Response): Promise<void> => {
  try {
    const unassignedCompanies = await prisma.company.findMany({
      where: { status: 'NOT_ASSIGNED' }
    });

    if (unassignedCompanies.length === 0) {
      res.json({ success: true, message: 'No unassigned companies available.' });
      return;
    }

    const members = await prisma.user.findMany({
      where: { role: 'MEMBER' }
    });

    if (members.length === 0) {
      res.status(400).json({ success: false, message: 'No members available to assign.' });
      return;
    }

    let memberIndex = 0;
    const assignmentsToCreate = unassignedCompanies.map(c => {
      const assignedTo = members[memberIndex].id;
      memberIndex = (memberIndex + 1) % members.length;
      return { companyId: c.id, userId: assignedTo };
    });

    await prisma.$transaction(async (tx) => {
      await tx.assignment.createMany({ data: assignmentsToCreate });
      
      const companyIds = assignmentsToCreate.map(a => a.companyId);
      await tx.company.updateMany({
        where: { id: { in: companyIds } },
        data: { status: 'ASSIGNED' }
      });
    });

    res.json({ success: true, message: `Distributed ${assignmentsToCreate.length} companies among ${members.length} members.` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// --- TEMPORARY LOCKING ---

// @desc    Lock a company for drafting an email
// @route   POST /api/companies/:id/lock
// @access  Member/Admin
export const lockCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = req.params.id;
    const userId = req.user!.id;

    // 1. Verify Permission first
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { assignment: true }
    });

    if (!company) {
      res.status(404).json({ success: false, message: 'Company not found' });
      return;
    }

    if (company.status !== 'NOT_ASSIGNED') {
      if (company.assignment?.userId !== userId && req.user!.role !== 'ADMIN') {
        res.status(403).json({ success: false, message: 'Forbidden: Assigned to another member.' });
        return;
      }
    }

    if (company.status === 'EMAIL_SENT' || company.status === 'CONFIRMED') {
       res.status(400).json({ success: false, message: 'Company is already contacted.' });
       return;
    }

    // 2. ATOMIC LOCK (Prevents Race Conditions)
    // 5 minutes ago timestamp
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const result = await prisma.company.updateMany({
      where: {
        id: companyId,
        // MUST match one of the following to acquire lock:
        OR: [
          { lockedById: null },               // Unlocked
          { lockedById: userId },             // Already locked by ME
          { lockedAt: { lt: fiveMinutesAgo } } // Locked by someone else, but EXPIRED
        ]
      },
      data: {
        lockedById: userId,
        lockedAt: new Date()
      }
    });

    if (result.count === 0) {
      // Race condition caught: 
      // Another user acquired the lock simultaneously, OR an active lock exists.
      res.status(409).json({ 
        success: false, 
        message: 'This company is currently locked by another member who is drafting an email.' 
      });
      return;
    }

    res.json({ success: true, message: 'Lock acquired for 5 minutes.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Unlock a company (abandoned draft)
// @route   POST /api/companies/:id/unlock
export const unlockCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = req.params.id;
    const userId = req.user!.id;

    // Only allow unlocking if the current user owns the lock (or is Admin)
    await prisma.company.updateMany({
      where: {
        id: companyId,
        ...(req.user!.role !== 'ADMIN' ? { lockedById: userId } : {})
      },
      data: {
        lockedById: null,
        lockedAt: null
      }
    });

    res.json({ success: true, message: 'Company unlocked.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
