import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { logActivity } from '../services/activity.service';

export const createFollowUp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId } = req.params as { companyId: string };
    const { date, note } = req.body;

    if (!date) {
      res.status(400).json({ success: false, message: 'Follow-up date is required' });
      return;
    }

    const parsedDate = new Date(date);

    const followUp = await prisma.$transaction(async (tx) => {
      const newFollowUp = await tx.followUp.create({
        data: {
          companyId,
          userId: req.user!.id,
          date: parsedDate,
          note
        }
      });

      await tx.company.update({
        where: { id: companyId },
        data: { followUpDate: parsedDate }
      });

      return newFollowUp;
    });

    await logActivity(companyId, 'FOLLOW_UP_SCHEDULED', `Follow-up scheduled for ${parsedDate.toLocaleDateString()}`, req.user!.id);

    res.status(201).json({ success: true, data: followUp });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateFollowUpStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    const { status } = req.body;

    if (!['PENDING', 'COMPLETED', 'CANCELLED'].includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid status' });
      return;
    }

    const followUp = await prisma.followUp.update({
      where: { id, userId: req.user!.id },
      data: { status }
    });

    res.json({ success: true, data: followUp });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
