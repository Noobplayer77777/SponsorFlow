import { Request, Response } from 'express';
import { generateGmailAuthUrl, handleGmailCallback, sendGmail } from '../services/gmail.service';
import prisma from '../utils/prisma';

// @desc    Get current Gmail connection status
// @route   GET /api/gmail/status
export const getGmailStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { gmailAddress: true }
    });

    if (user?.gmailAddress) {
      res.json({ success: true, connected: true, email: user.gmailAddress });
    } else {
      res.json({ success: true, connected: false });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get URL to start Gmail OAuth flow
// @route   GET /api/gmail/auth
export const getGmailAuthUrl = (req: Request, res: Response): void => {
  const url = generateGmailAuthUrl();
  res.json({ success: true, url });
};

// @desc    Handle OAuth callback from Google
// @route   POST /api/gmail/callback
export const gmailCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.body;
    if (!code) {
      res.status(400).json({ success: false, message: 'Authorization code missing' });
      return;
    }

    const email = await handleGmailCallback(code, req.user!.id);
    res.json({ success: true, message: 'Gmail connected successfully', email });
  } catch (error: any) {
    console.error('Gmail callback error:', error);
    res.status(400).json({ success: false, message: error.message || 'Failed to connect Gmail' });
  }
};

// @desc    Send an email via connected Gmail account
// @route   POST /api/gmail/send
export const sendTestEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId, subject, body } = req.body;
    
    if (!companyId || !subject || !body) {
      res.status(400).json({ success: false, message: 'Missing required fields' });
      return;
    }

    // 1. Verify Company and Lock/Assignment
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { assignment: true }
    });

    if (!company) {
      res.status(404).json({ success: false, message: 'Company not found' });
      return;
    }

    if (!company.email) {
      res.status(400).json({ success: false, message: 'Company has no email address' });
      return;
    }

    // 2. Strict Outreach Protection check
    if (company.status === 'EMAIL_SENT' || company.status === 'CONFIRMED') {
      res.status(400).json({ success: false, message: 'An email has already been sent to this company.' });
      return;
    }

    if (company.status === 'NOT_ASSIGNED') {
      // Must hold a valid lock
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const hasValidLock = company.lockedById === req.user!.id && 
                           company.lockedAt && 
                           company.lockedAt > fiveMinutesAgo;
      
      if (!hasValidLock) {
        res.status(403).json({ success: false, message: 'You must lock this company before sending the first email.' });
        return;
      }
    } else {
      // Must be assigned to the user
      if (company.assignment?.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
        res.status(403).json({ success: false, message: 'Forbidden: Company assigned to another member.' });
        return;
      }
    }

    // 3. Send Email via Gmail API
    await sendGmail(req.user!.id, company.email, subject, body);

    // 4. Record the interaction
    await prisma.$transaction(async (tx) => {
      // Create email record
      await tx.email.create({
        data: {
          subject,
          body,
          recipient: company.email!,
          status: 'SENT',
          sentAt: new Date(),
          companyId,
          senderId: req.user!.id
        }
      });

      // Update company status to EMAIL_SENT and permanently release locks
      await tx.company.update({
        where: { id: companyId },
        data: { 
          status: 'EMAIL_SENT',
          lockedById: null,
          lockedAt: null
        }
      });
    });

    res.json({ success: true, message: 'Email sent successfully via Gmail API' });
  } catch (error: any) {
    console.error('Send email error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};
