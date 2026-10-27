import { Router } from 'express';
import { pool } from '../db';

const router = Router();

// GET /api/references/clusters
router.get('/clusters', async (_req, res) => {
  try {
    const [rows]: [any[], any] = await pool.query('SELECT * FROM clusters ORDER BY cluster_code ASC');
    res.json(rows);
  } catch (error) {
    console.error('Fetch clusters error:', error);
    res.status(500).json({ error: 'Failed to retrieve clusters' });
  }
});

// GET /api/references/offices
router.get('/offices', async (_req, res) => {
  try {
    const [rows]: [any[], any] = await pool.query('SELECT * FROM offices WHERE is_active = 1 ORDER BY office_name ASC');
    res.json(rows);
  } catch (error) {
    console.error('Fetch offices error:', error);
    res.status(500).json({ error: 'Failed to retrieve offices' });
  }
});

// GET /api/references/roles
router.get('/roles', async (_req, res) => {
  try {
    const [rows]: [any[], any] = await pool.query('SELECT * FROM roles ORDER BY hierarchy_level ASC');
    res.json(rows);
  } catch (error) {
    console.error('Fetch roles error:', error);
    res.status(500).json({ error: 'Failed to retrieve roles' });
  }
});

export default router;
