
import 'dotenv/config';
import express from 'express';
import { checkDatabaseConnection, pool } from './db';

const app = express();
const PORT = Number(process.env.API_PORT || 4000);

app.use(express.json());

app.get('/api/health', async (_req, res) => {
  try {
    await checkDatabaseConnection();

    const [rows] = await pool.query(
      'SELECT DATABASE() AS dbName, @@port AS mysqlPort'
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

app.listen(PORT, () => {
  console.log(`FROO API running at http://localhost:${PORT}`);
});
