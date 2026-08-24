import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { Prisma } from '@prisma/client';
import { logActivity } from '../services/activity.service';
import { createNotification } from '../services/notification.service';

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

      const companyInfo = await tx.company.update({
        where: { id: companyId as string },
        data: { status: 'ASSIGNED' },
      });

      const user = await tx.user.findUnique({ where: { id: userId as string } });
      await logActivity(companyId as string, 'COMPANY_ASSIGNED', `Assigned to ${user?.name || userId}`, req.user!.id);
      
      await createNotification(userId as string, 'NEW_ASSIGNMENT', `You have been assigned to ${companyInfo.companyName}`, companyId as string);

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
      await tx.assignment.upsert({
        where: { companyId: companyId as string },
        update: { userId: userId as string },
        create: { companyId: companyId as string, userId: userId as string }
      });
      
      const companyInfo = await tx.company.update({
        where: { id: companyId as string },
        data: { status: 'ASSIGNED' }
      });

      const user = await tx.user.findUnique({ where: { id: userId as string } });
      await logActivity(companyId as string, 'COMPANY_REASSIGNED', `Reassigned to ${user?.name || userId}`, req.user!.id);
      
      await createNotification(userId as string, 'NEW_ASSIGNMENT', `You have been assigned to ${companyInfo.companyName}`, companyId as string);
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
      await tx.assignment.delete({ where: { companyId: companyId as string } });
      await tx.company.update({
        where: { id: companyId as string },
        data: { 
          status: 'NOT_ASSIGNED',
          lockedById: null, // Clear locks when unassigned
          lockedAt: null
        },
      });
      await logActivity(companyId as string, 'ASSIGNMENT_REMOVED', `Assignment removed`, req.user!.id);
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
      return { companyId: c.id, userId: assignedTo, companyName: c.companyName };
    });

    await prisma.$transaction(async (tx) => {
      const dbAssignments = assignmentsToCreate.map(a => ({ companyId: a.companyId, userId: a.userId }));
      await tx.assignment.createMany({ data: dbAssignments });
      
      const companyIds = assignmentsToCreate.map(a => a.companyId);
      await tx.company.updateMany({
        where: { id: { in: companyIds } },
        data: { status: 'ASSIGNED' }
      });
      
      for (const a of assignmentsToCreate) {
        await logActivity(a.companyId, 'COMPANY_ASSIGNED', `Auto-assigned to member`, req.user!.id);
        await createNotification(a.userId, 'NEW_ASSIGNMENT', `You have been auto-assigned to ${a.companyName}`, a.companyId);
      }
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
      where: { id: companyId as string },
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
        id: companyId as string,
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
        id: companyId as string,
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
