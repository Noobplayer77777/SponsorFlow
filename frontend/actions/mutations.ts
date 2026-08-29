'use server';

import { prisma } from '../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../app/api/auth/[...nextauth]/route';

// --- LOCKING MUTATIONS ---

export async function lockCompany(companyId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');
  
  const userId = (session.user as any).id;
  const userRole = (session.user as any).role;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { assignment: true }
  });

  if (!company) throw new Error('Company not found');

  if (company.status !== 'NOT_ASSIGNED') {
    if (company.assignment?.userId !== userId && userRole !== 'ADMIN') {
      throw new Error('Forbidden: Assigned to another member.');
    }
  }

  if (company.status === 'EMAIL_SENT' || company.status === 'CONFIRMED') {
     throw new Error('Company is already contacted.');
  }

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  const result = await prisma.company.updateMany({
    where: {
      id: companyId,
      OR: [
        { lockedById: null },
        { lockedById: userId },
        { lockedAt: { lt: fiveMinutesAgo } }
      ]
    },
    data: {
      lockedById: userId,
      lockedAt: new Date()
    }
  });

  if (result.count === 0) {
    throw new Error('This company is currently locked by another member who is drafting an email.');
  }
  return { success: true };
}

export async function unlockCompany(companyId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');
  
  const userId = (session.user as any).id;
  const userRole = (session.user as any).role;

  await prisma.company.updateMany({
    where: {
      id: companyId,
      ...(userRole !== 'ADMIN' ? { lockedById: userId } : {})
    },
    data: {
      lockedById: null,
      lockedAt: null
    }
  });
  return { success: true };
}

// --- NOTES ---

export async function addNote(companyId: string, content: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');
  const userId = (session.user as any).id;

  if (!content.trim()) throw new Error('Content is required');

  const note = await prisma.note.create({
    data: { content, companyId, userId },
    include: { user: { select: { id: true, name: true } } }
  });

  await prisma.activity.create({
    data: { companyId, type: 'NOTE_ADDED', description: 'Added a note', userId }
  });

  return { success: true, note };
}

// --- STATUS UPDATES ---

export async function updateCompanyStatus(companyId: string, status: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');
  const userId = (session.user as any).id;

  await prisma.company.update({
    where: { id: companyId },
    data: { status: status as any } // Enum casting
  });

  await prisma.activity.create({
    data: { companyId, type: 'STATUS_CHANGED', description: `Status changed to ${status}`, userId }
  });

  return { success: true };
}
export async function scheduleFollowUp(companyId: string, date: string, note?: string) { const session = await getServerSession(authOptions); if (!session?.user) throw new Error('Unauthorized'); const userId = (session.user as any).id; const parsedDate = new Date(date); await prisma.followUp.create({ data: { companyId, userId, date: parsedDate, note: note || '' } }); await prisma.company.update({ where: { id: companyId }, data: { followUpDate: parsedDate } }); await prisma.activity.create({ data: { companyId, type: 'FOLLOW_UP_SCHEDULED', description: 'Follow-up scheduled', userId } }); return { success: true }; }
