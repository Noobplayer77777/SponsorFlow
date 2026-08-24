import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { CompanyStatus } from '@prisma/client';

// @desc    Get all companies
// @route   GET /api/companies
// @access  Private
export const getCompanies = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, assignedUserId } = req.query;

    // Build the filtering logic
    const where: any = {};
    if (status) {
      where.status = status as CompanyStatus;
    }
    if (assignedUserId) {
      where.assignment = { userId: assignedUserId as string };
    }

    const companies = await prisma.company.findMany({
      where,
      include: {
        assignment: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: companies });
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get a single company by ID
// @route   GET /api/companies/:id
// @access  Private
export const getCompanyById = async (req: Request, res: Response): Promise<void> => {
  try {
    const company = await prisma.company.findUnique({
      where: { id: req.params.id as string },
      include: {
        assignment: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        emails: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!company) {
      res.status(404).json({ success: false, message: 'Company not found' });
      return;
    }

    res.json({ success: true, data: company });
  } catch (error) {
    console.error('Error fetching company:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Create a new company
// @route   POST /api/companies
// @access  Private
export const createCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    // In a real app, use Zod to validate req.body here
    const company = await prisma.company.create({
      data: req.body,
    });

    res.status(201).json({ success: true, data: company });
  } catch (error) {
    console.error('Error creating company:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Update a company's details
// @route   PATCH /api/companies/:id
// @access  Private
export const updateCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    const company = await prisma.company.update({
      where: { id: req.params.id as string },
      data: req.body,
    });

    res.json({ success: true, data: company });
  } catch (error) {
    console.error('Error updating company:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Update a company's workflow status
// @route   PATCH /api/companies/:id/status
// @access  Private
export const updateCompanyStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.body;

    if (!status) {
      res.status(400).json({ success: false, message: 'Status is required' });
      return;
    }

    const company = await prisma.company.update({
      where: { id: req.params.id as string },
      data: { status: status as CompanyStatus },
    });

    res.json({ success: true, data: company });
  } catch (error) {
    console.error('Error updating company status:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Delete a company
// @route   DELETE /api/companies/:id
// @access  Private (Admin Only - typically)
export const deleteCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.company.delete({
      where: { id: req.params.id as string },
    });

    res.json({ success: true, message: 'Company deleted successfully' });
  } catch (error) {
    console.error('Error deleting company:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
