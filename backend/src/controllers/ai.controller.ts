import { Request, Response } from 'express';
import { aiService } from '../services/ai.service';
import prisma from '../utils/prisma';

export const personalizeIntro = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId } = req.body;
    
    if (!companyId) {
      res.status(400).json({ success: false, message: 'companyId is required' });
      return;
    }

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      res.status(404).json({ success: false, message: 'Company not found' });
      return;
    }

    const sentence = await aiService.generatePersonalizedIntro(company);
    res.json({ success: true, data: { sentence } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'AI generation failed' });
  }
};

export const suggestReply = async (req: Request, res: Response): Promise<void> => {
  try {
    const { emailThread, latestReply } = req.body;

    if (!latestReply) {
      res.status(400).json({ success: false, message: 'latestReply is required' });
      return;
    }

    const suggestion = await aiService.suggestReply(emailThread || '', latestReply);
    res.json({ success: true, data: { suggestion } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'AI generation failed' });
  }
};

export const generateSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId } = req.body;

    if (!companyId) {
      res.status(400).json({ success: false, message: 'companyId is required' });
      return;
    }

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      res.status(404).json({ success: false, message: 'Company not found' });
      return;
    }

    // Generate
    const summary = await aiService.generateCompanySummary(company);
    
    // Save to DB
    await prisma.company.update({
      where: { id: companyId },
      data: { aiSummary: summary }
    });

    res.json({ success: true, data: { summary } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'AI generation failed' });
  }
};
