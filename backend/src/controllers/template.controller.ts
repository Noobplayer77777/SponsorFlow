import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getTemplates = async (req: Request, res: Response): Promise<void> => {
  try {
    const templates = await prisma.emailTemplate.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: templates });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const template = await prisma.emailTemplate.findUnique({
      where: { id: req.params.id as string }
    });
    if (!template) {
      res.status(404).json({ success: false, message: 'Template not found' });
      return;
    }
    res.json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, subject, body } = req.body;
    
    if (!name || !subject || !body) {
      res.status(400).json({ success: false, message: 'Missing required fields' });
      return;
    }

    const template = await prisma.emailTemplate.create({
      data: {
        name,
        subject,
        body,
        createdBy: req.user!.id
      }
    });
    res.status(201).json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, subject, body } = req.body;
    
    const template = await prisma.emailTemplate.update({
      where: { id: req.params.id as string },
      data: { name, subject, body }
    });
    res.json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.emailTemplate.delete({
      where: { id: req.params.id as string }
    });
    res.json({ success: true, message: 'Template deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
