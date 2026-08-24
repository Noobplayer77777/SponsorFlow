import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import companyRoutes from './routes/company.routes';
import assignmentRoutes from './routes/assignment.routes';
import userRoutes from './routes/user.routes';
import templateRoutes from './routes/template.routes';
import authRoutes from './routes/auth.routes';
import gmailRoutes from './routes/gmail.routes';
import notificationRoutes from './routes/notification.routes';
import followUpRoutes from './routes/followUp.routes';
import analyticsRoutes from './routes/analytics.routes';
import { requireAuth } from './middleware/auth.middleware';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/gmail', requireAuth, gmailRoutes);
app.use('/api/companies', requireAuth, companyRoutes);
app.use('/api/assignments', requireAuth, assignmentRoutes);
app.use('/api/users', requireAuth, userRoutes);
app.use('/api/templates', requireAuth, templateRoutes);
app.use('/api/notifications', requireAuth, notificationRoutes);
app.use('/api/follow-ups', requireAuth, followUpRoutes);
app.use('/api/analytics', requireAuth, analyticsRoutes);

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'SponsorFlow API'
  });
});

import { setupFollowUpCron } from './queues/followUp.queue';
import './workers/followUp.worker';

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  setupFollowUpCron();
});
