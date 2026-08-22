import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { Prisma } from '@prisma/client';

// @desc    Assign a company to a user
// @route   POST /api/assignments
// @access  Private
export const assignCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId, userId } = req.body;

    if (!companyId || !userId) {
      res.status(400).json({ success: false, message: 'companyId and userId are required' });
      return;
    }

    // Use a Prisma Transaction to ensure both operations succeed or fail together
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the assignment.
      // Because `companyId` is @unique in the schema, this will inherently
      // throw an error if the company is already assigned.
      const newAssignment = await tx.assignment.create({
        data: {
          companyId,
          userId,
        },
      });

      // 2. Update the company status to ASSIGNED
      await tx.company.update({
        where: { id: companyId },
        data: { status: 'ASSIGNED' },
      });

      return newAssignment;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    // P2002 is Prisma's error code for a Unique Constraint Violation
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      res.status(400).json({ 
        success: false, 
        message: 'This company is already assigned to a user. Strict 1-to-1 logic prevents multiple assignments.' 
      });
      return;
    }

    console.error('Error assigning company:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Remove an assignment from a company
// @route   DELETE /api/assignments/:companyId
// @access  Private
export const unassignCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId } = req.params;

    await prisma.$transaction(async (tx) => {
      // 1. Delete the assignment
      await tx.assignment.delete({
        where: { companyId },
      });

      // 2. Reset the company status back to NOT_ASSIGNED
      await tx.company.update({
        where: { id: companyId },
        data: { status: 'NOT_ASSIGNED' },
      });
    });

    res.json({ success: true, message: 'Company unassigned successfully' });
  } catch (error: any) {
    // P2025 is Prisma's error code when a record to delete is not found
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      res.status(404).json({ success: false, message: 'Assignment not found.' });
      return;
    }
    
    console.error('Error unassigning company:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
