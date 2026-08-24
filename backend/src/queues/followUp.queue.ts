import { Queue } from 'bullmq';
import IORedis from 'ioredis';

// Use env var or default local redis
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null, // Required by bullmq
});

// Avoid crashing if Redis isn't connected right away
connection.on('error', (err) => {
  console.error('Redis connection error (BullMQ):', err.message);
});

export const followUpQueue = new Queue('follow-up-queue', { connection });

// Schedule a recurring job (e.g. check every minute)
export const setupFollowUpCron = async () => {
  try {
    await followUpQueue.add(
      'check-due-follow-ups',
      {},
      ({
        repeat: {
          pattern: '* * * * *',
        },
        jobId: 'check-due-follow-ups-job',
      } as any)
    );
    console.log('Follow-up cron job scheduled.');
  } catch (error) {
    console.error('Failed to schedule follow-up cron:', error);
  }
};
