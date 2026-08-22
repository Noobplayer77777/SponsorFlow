import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import companyRoutes from './routes/company.routes';
import assignmentRoutes from './routes/assignment.routes';
import userRoutes from './routes/user.routes';
import templateRoutes from './routes/template.routes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/companies', companyRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/templates', templateRoutes);

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'SponsorFlow API'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
