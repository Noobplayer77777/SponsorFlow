import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import prisma from '../utils/prisma';
import { createNotification } from '../services/notification.service';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export const followUpWorker = new Worker(
  'follow-up-queue',
  async (job) => {
    if (job.name === 'check-due-follow-ups') {
      console.log('Running check-due-follow-ups job...');
      const now = new Date();

      // Find all pending follow-ups that are past their date and haven't been notified
      const dueFollowUps = await prisma.followUp.findMany({
        where: {
          status: 'PENDING',
          notified: false,
          date: { lte: now },
        },
        include: { company: true }
      });

      console.log(`Found ${dueFollowUps.length} due follow-ups.`);

      for (const fu of dueFollowUps) {
        // Idempotent processing within a transaction
        await prisma.$transaction(async (tx) => {
          // Check again in transaction with a lock to prevent race conditions
          const lockedFu = await tx.followUp.findUnique({
            where: { id: fu.id }
          });

          if (lockedFu && !lockedFu.notified) {
            await createNotification(
              lockedFu.userId,
              'FOLLOW_UP_DUE',
              `Follow-up due for ${fu.company.companyName}: ${fu.note || 'No note provided'}`,
              lockedFu.companyId
            );

            await tx.followUp.update({
              where: { id: fu.id },
              data: { notified: true }
            });
          }
        });
      }
    }
  },
  { connection }
);

followUpWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});
