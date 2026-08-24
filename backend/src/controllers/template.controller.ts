import { Request, Response } from 'express';
import prisma from '../utils/prisma';

// @desc    Get all email templates
// @route   GET /api/templates
// @access  Private
export const getTemplates = async (req: Request, res: Response): Promise<void> => {
  try {
    const templates = await prisma.emailTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get a single template
// @route   GET /api/templates/:id
// @access  Private
export const getTemplateById = async (req: Request, res: Response): Promise<void> => {
  try {
    const template = await prisma.emailTemplate.findUnique({
      where: { id: req.params.id as string },
    });

    if (!template) {
      res.status(404).json({ success: false, message: 'Template not found' });
      return;
    }

    res.json({ success: true, data: template });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Create a new email template
// @route   POST /api/templates
// @access  Private
export const createTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const template = await prisma.emailTemplate.create({
      data: req.body,
    });
    res.status(201).json({ success: true, data: template });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Update a template
// @route   PATCH /api/templates/:id
// @access  Private
export const updateTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const template = await prisma.emailTemplate.update({
      where: { id: req.params.id as string },
      data: req.body,
    });
    res.json({ success: true, data: template });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Delete a template
// @route   DELETE /api/templates/:id
// @access  Private
export const deleteTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.emailTemplate.delete({
      where: { id: req.params.id as string },
    });
    res.json({ success: true, message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
