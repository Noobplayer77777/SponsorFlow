import prisma from '../utils/prisma';

export const createNotification = async (
  userId: string,
  type: string,
  message: string,
  companyId?: string
) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        message,
        companyId
      }
    });
    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
};
