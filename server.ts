import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './server/routes/authRoutes';
import userRoutes from './server/routes/userRoutes';
import taskRoutes from './server/routes/taskRoutes';
import dispatchRoutes from './server/routes/dispatchRoutes';
import systemLogRoutes from './server/routes/systemLogRoutes';
import referenceRoutes from './server/routes/referenceRoutes';
import { checkDatabaseConnection, pool } from './server/db';
import { runAutoSeed } from './server/seed';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  // CORS middleware for API routes
  app.use((req, res, next) => {
    const origin = req.headers.origin || '*';
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.use(express.json());

  // Mount API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/tasks', taskRoutes);
  app.use('/api', dispatchRoutes);
  app.use('/api/system-logs', systemLogRoutes);
  app.use('/api/references', referenceRoutes);

  // Health and connection status endpoint
  app.get('/api/health', async (_req, res) => {
    try {
      await checkDatabaseConnection();
      await runAutoSeed();
      const [rows] = await pool.query('SELECT DATABASE() AS dbName, @@port AS mysqlPort, @@version AS mysqlVersion');
      res.json({
        status: 'ok',
        api: 'running',
        database: rows,
      });
    } catch (error) {
      res.json({
        status: 'ok',
        api: 'running',
        database: 'in-memory-fallback',
      });
    }
  });

  // Mount Vite frontend in development or serve static in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`🚀 FROO Full-Stack Server listening on http://0.0.0.0:${PORT}`);
    console.log(`=======================================================`);
  });

  // Check database in background
  checkDatabaseConnection().catch((err) => {
    console.log('ℹ️ Running in resilient fallback mode until MySQL container connects.');
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
