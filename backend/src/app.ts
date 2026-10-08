import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import recordsRoutes from './routes/records';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/auth', authRoutes);
app.use('/api/records', recordsRoutes);

// Error handling
app.use(errorHandler);

export default app;
