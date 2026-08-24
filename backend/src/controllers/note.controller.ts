import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { logActivity } from '../services/activity.service';

export const addNote = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId } = req.params;
    const { content } = req.body;

    if (!content) {
      res.status(400).json({ success: false, message: 'Content is required' });
      return;
    }

    const note = await prisma.note.create({
      data: {
        companyId: companyId as string,
        authorId: req.user!.id,
        content
      }
    });

    await logActivity(companyId as string, 'NOTE_ADDED', `Note added: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`, req.user!.id);

    res.status(201).json({ success: true, data: note });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
