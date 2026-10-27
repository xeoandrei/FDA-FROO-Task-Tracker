import { Router } from 'express';
import { pool } from '../db';
import { authenticateToken, AuthenticatedRequest } from '../auth';

const router = Router();

// GET /api/system-logs
router.get('/', authenticateToken, async (_req, res) => {
  try {
    const [rows]: [any[], any] = await pool.query(
      `SELECT sal.*, u.first_name, u.last_name, u.office_code
       FROM system_audit_logs sal
       LEFT JOIN users u ON sal.user_id = u.id
       ORDER BY sal.created_at DESC
       LIMIT 250`
    );

    const logs = rows.map((r) => {
      const formattedTimestamp = new Date(r.created_at).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      const userName = r.first_name ? `${r.first_name} ${r.last_name}` : r.user_email;

      return {
        id: `log-${r.id}`,
        timestamp: formattedTimestamp,
        userId: r.user_id || '',
        userName,
        userEmail: r.user_email,
        office: r.office_code || 'FROO',
        role: r.user_role,
        actionType: r.event_type,
        description: r.description,
        targetEntityId: r.target_entity_id,
        targetEntityName: r.target_entity_name,
      };
    });

    res.json(logs);
  } catch (error) {
    console.error('Fetch system logs error:', error);
    res.status(500).json({ error: 'Failed to retrieve system audit logs' });
  }
});

// POST /api/system-logs - Manual audit logging
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { actionType, description, targetEntityId, targetEntityName } = req.body;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const [result]: any = await pool.query(
      `INSERT INTO system_audit_logs (event_type, user_id, user_email, user_role, description, target_entity_id, target_entity_name)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        actionType || 'GENERIC_ACTION',
        user.id,
        user.email,
        user.role,
        description || 'System action recorded.',
        targetEntityId || null,
        targetEntityName || null,
      ]
    );

    res.status(201).json({ success: true, logId: result.insertId });
  } catch (error) {
    console.error('Log system action error:', error);
    res.status(500).json({ error: 'Failed to record audit log' });
  }
});

export default router;
