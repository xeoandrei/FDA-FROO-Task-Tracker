import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { checkDatabaseConnection, pool } from './db';
import { runAutoSeed } from './seed';

import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import taskRoutes from './routes/taskRoutes';
import dispatchRoutes from './routes/dispatchRoutes';
import systemLogRoutes from './routes/systemLogRoutes';
import referenceRoutes from './routes/referenceRoutes';

const app = express();
const PORT = Number(process.env.API_PORT || 4000);

// Enable CORS for frontend Vite dev server (port 3000) and other local clients
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api', dispatchRoutes); // /api/tasks/:taskId/dispatches and /api/dispatches/:id/*
app.use('/api/system-logs', systemLogRoutes);
app.use('/api/references', referenceRoutes);

// Health & DB status endpoint
app.get('/api/health', async (_req, res) => {
  try {
    await checkDatabaseConnection();

    const [rows] = await pool.query(
      'SELECT DATABASE() AS dbName, @@port AS mysqlPort, @@version AS mysqlVersion'
    );

    res.json({
      status: 'ok',
      api: 'running',
      database: rows,
    });
  } catch (error) {
    console.error('Health check database error:', error);
    res.status(503).json({
      status: 'error',
      message: 'Database connection unavailable',
    });
  }
});

// Start Express server and attempt background auto-seed
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 FROO Task Tracker API running at http://localhost:${PORT}`);
  console.log(`=======================================================`);

  // Attempt database auto-seed in background if DB is ready
  runAutoSeed().catch((err) => {
    console.log('Database auto-seed deferred until MySQL container is available.');
  });
});
