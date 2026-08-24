import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getAdminDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, userId, industry, status } = req.query;

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate as string);
    if (endDate) dateFilter.lte = new Date(endDate as string);

    // Build the WHERE clause for companies dynamically
    const whereFilter: any = {};
    
    // CreatedAt date filter applied to companies if needed
    if (Object.keys(dateFilter).length > 0) {
      whereFilter.createdAt = dateFilter;
    }
    if (industry) whereFilter.industry = industry as string;
    if (status) whereFilter.status = status as string;
    
    // User filter (via assignment)
    if (userId) {
      whereFilter.assignment = { userId: userId as string };
    }

    const totalCompanies = await prisma.company.count({ where: whereFilter });
    
    const assignedCompanies = await prisma.company.count({
      where: { ...whereFilter, status: { not: 'NOT_ASSIGNED' } }
    });

    const interestedCompanies = await prisma.company.count({
      where: { ...whereFilter, status: 'INTERESTED' }
    });

    const sponsorsConfirmed = await prisma.company.count({
      where: { ...whereFilter, status: 'CONFIRMED' }
    });

    const raisedAggr = await prisma.company.aggregate({
      _sum: { amountRaised: true },
      where: { ...whereFilter, status: 'CONFIRMED' }
    });
    const totalSponsorshipRaised = raisedAggr._sum.amountRaised || 0;

    // Emails sent globally (matching filters where possible)
    let emailWhere: any = {};
    if (userId) emailWhere.senderId = userId as string;
    if (Object.keys(dateFilter).length > 0) emailWhere.createdAt = dateFilter;

    const emailsSent = await prisma.email.count({ where: emailWhere });
    
    // Replies received globally
    let replyWhere: any = {};
    if (Object.keys(dateFilter).length > 0) replyWhere.createdAt = dateFilter;
    const repliesCount = await prisma.reply.count({ where: replyWhere });

    // Pending Follow-ups globally (or filtered by user)
    let followUpWhere: any = { status: 'PENDING' };
    if (userId) followUpWhere.userId = userId as string;
    const pendingFollowUps = await prisma.followUp.count({ where: followUpWhere });

    // Analytics: Member Performance
    const members = await prisma.user.findMany({
      where: { role: 'MEMBER' },
      include: {
        assignments: { include: { company: true } },
        sentEmails: { select: { id: true } }
      }
    });

    const memberPerformance = members.map(m => {
      const assignedCount = m.assignments.length;
      const emailsCount = m.sentEmails.length;
      const confirmedCount = m.assignments.filter(a => a.company.status === 'CONFIRMED').length;
      const raised = m.assignments
        .filter(a => a.company.status === 'CONFIRMED')
        .reduce((sum, a) => sum + (a.company.amountRaised || 0), 0);

      return {
        id: m.id,
        name: m.name,
        assigned: assignedCount,
        emailsSent: emailsCount,
        confirmed: confirmedCount,
        raised
      };
    });

    // Analytics: Industry Response
    const industryStatsRaw = await prisma.company.groupBy({
      by: ['industry'],
      _count: { id: true },
      where: whereFilter
    });
    
    const industryStats = await Promise.all(industryStatsRaw.map(async (ind) => {
      const confirmedInInd = await prisma.company.count({
        where: { ...whereFilter, industry: ind.industry, status: 'CONFIRMED' }
      });
      return {
        industry: ind.industry || 'Unknown',
        total: ind._count.id,
        confirmed: confirmedInInd
      };
    }));

    res.json({
      success: true,
      data: {
        totalCompanies,
        assignedCompanies,
        emailsSent,
        replies: repliesCount,
        interestedCompanies,
        sponsorsConfirmed,
        totalSponsorshipRaised,
        pendingFollowUps,
        memberPerformance,
        industryStats,
        replyRate: emailsSent > 0 ? ((repliesCount / emailsSent) * 100).toFixed(1) + '%' : '0%'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching analytics' });
  }
};
