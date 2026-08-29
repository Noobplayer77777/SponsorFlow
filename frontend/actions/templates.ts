'use server';

import { prisma } from '../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../app/api/auth/[...nextauth]/route';

export async function getTemplates() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');
  return await prisma.emailTemplate.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function createTemplate(data: { name: string, subject: string, body: string }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');
  const userId = (session.user as any).id;
  
  return await prisma.emailTemplate.create({
    data: {
      ...data,
      createdBy: userId
    }
  });
}

export async function updateTemplate(id: string, data: { name: string, subject: string, body: string }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');
  
  return await prisma.emailTemplate.update({
    where: { id },
    data
  });
}

export async function deleteTemplate(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');
  
  return await prisma.emailTemplate.delete({
    where: { id }
  });
}
