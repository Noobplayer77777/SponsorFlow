import prisma from '../utils/prisma';

export const logActivity = async (
  companyId: string,
  type: string,
  description: string,
  userId?: string
) => {
  try {
    await prisma.activity.create({
      data: {
        companyId,
        userId,
        type,
        description
      }
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Non-blocking
  }
};
