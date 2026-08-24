import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { logActivity } from '../services/activity.service';
import { createNotification } from '../services/notification.service';

export const addReply = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId } = req.params as { companyId: string };
    const { sender, content, emailId } = req.body;

    if (!sender || !content) {
      res.status(400).json({ success: false, message: 'Sender and content are required' });
      return;
    }

    const reply = await prisma.$transaction(async (tx) => {
      const newReply = await tx.reply.create({
        data: {
          companyId: companyId as string,
          sender,
          content,
          emailId
        }
      });

      await tx.company.update({
        where: { id: companyId as string },
        data: { status: 'REPLIED' }
      });

      return newReply;
    });

    await logActivity(companyId as string, 'REPLY_RECEIVED', `Reply received from ${sender}`, req.user!.id);
    
    // Find the assigned user to notify them
    const company = await prisma.company.findUnique({
      where: { id: companyId as string },
      include: { assignment: true }
    });
    
    if (company?.assignment?.userId) {
      await createNotification(
        company.assignment.userId, 
        'REPLY_RECEIVED', 
        `New reply received from ${sender} (${company.companyName})`, 
        companyId as string
      );
    }

    res.status(201).json({ success: true, data: reply });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
