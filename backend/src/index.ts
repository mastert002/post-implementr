import dotenv from 'dotenv';

// Load environment variables FIRST, before any other imports
dotenv.config();

import app from './app';
import { initializeDatabase } from './db/client';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    console.log('Initializing database...');
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();
