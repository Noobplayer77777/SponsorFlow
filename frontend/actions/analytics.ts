'use server';

import { prisma } from '../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../app/api/auth/[...nextauth]/route';

export async function getDashboardStats(filters: { startDate?: string, endDate?: string, userId?: string, industry?: string, status?: string }) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    throw new Error('Unauthorized');
  }

  try {
    const { startDate, endDate, userId, industry, status } = filters;

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const whereFilter: any = {};
    
    if (Object.keys(dateFilter).length > 0) {
      whereFilter.createdAt = dateFilter;
    }
    if (industry) whereFilter.industry = industry;
    if (status) whereFilter.status = status;
    
    // For members, force the userId filter to their own ID
    const userRole = (session.user as any).role;
    const finalUserId = userRole === 'ADMIN' ? userId : (session.user as any).id;

    if (finalUserId) {
      whereFilter.assignment = { userId: finalUserId };
    }

    const totalCompanies = await prisma.company.count({ where: whereFilter });
    const assignedCompanies = await prisma.company.count({
      where: { ...whereFilter, status: { not: 'NOT_ASSIGNED' } }
    });
    const unassignedCompanies = totalCompanies - assignedCompanies;

    // Get counts by status
    const statuses = ['NOT_ASSIGNED', 'ASSIGNED', 'EMAIL_DRAFTED', 'EMAIL_SENT', 'OPENED', 'REPLIED', 'INTERESTED', 'NEGOTIATING', 'CONFIRMED', 'REJECTED'];
    const statusCounts: Record<string, number> = {};
    
    // Execute all count queries in parallel
    const statusPromises = statuses.map(s => 
      prisma.company.count({ where: { ...whereFilter, status: s as any } })
        .then(count => { statusCounts[s] = count; })
    );
    await Promise.all(statusPromises);

    // Calculate conversion rates
    const contactedCount = (statusCounts['EMAIL_SENT'] || 0) + (statusCounts['OPENED'] || 0) + 
                          (statusCounts['REPLIED'] || 0) + (statusCounts['INTERESTED'] || 0) + 
                          (statusCounts['NEGOTIATING'] || 0) + (statusCounts['CONFIRMED'] || 0) + 
                          (statusCounts['REJECTED'] || 0);
                          
    const repliedCount = (statusCounts['REPLIED'] || 0) + (statusCounts['INTERESTED'] || 0) + 
                        (statusCounts['NEGOTIATING'] || 0) + (statusCounts['CONFIRMED'] || 0) + 
                        (statusCounts['REJECTED'] || 0);
                        
    const confirmedCount = statusCounts['CONFIRMED'] || 0;

    const replyRate = contactedCount > 0 ? (repliedCount / contactedCount) * 100 : 0;
    const conversionRate = contactedCount > 0 ? (confirmedCount / contactedCount) * 100 : 0;

    // Get recent activity (Notes)
    const recentActivity = await prisma.note.findMany({
      where: finalUserId ? { userId: finalUserId } : {},
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        company: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } }
      }
    });

    return {
      totalCompanies,
      assignedCompanies,
      unassignedCompanies,
      statusCounts,
      metrics: {
        contactedCount,
        repliedCount,
        confirmedCount,
        replyRate,
        conversionRate
      },
      recentActivity
    };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to fetch analytics');
  }
}
