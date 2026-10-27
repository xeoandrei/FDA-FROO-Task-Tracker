import { Router } from 'express';
import { pool } from '../db';
import { authenticateToken, requireRoles, hashPassword, AuthenticatedRequest } from '../auth';

const router = Router();

// GET /api/users - returns staff users
router.get('/', authenticateToken, async (_req, res) => {
  try {
    const [rows]: [any[], any] = await pool.query(
      `SELECT id, username, email, first_name, middle_initial, last_name, position,
              role_code, office_code, cluster_code, is_active, last_login_at, last_activity, created_at
       FROM users
       ORDER BY last_name ASC, first_name ASC`
    );

    const users = rows.map((r) => ({
      id: r.id,
      username: r.username || r.email.split('@')[0],
      email: r.email,
      firstName: r.first_name,
      middleInitial: r.middle_initial || '',
      lastName: r.last_name,
      position: r.position,
      office: r.office_code,
      cluster: r.cluster_code,
      role: r.role_code,
      status: r.is_active ? 'active' : 'deactivated',
      createdAt: r.created_at,
      lastLogin: r.last_login_at,
      lastActivity: r.last_activity,
    }));

    res.json(users);
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ error: 'Failed to retrieve user directory' });
  }
});

// POST /api/users - creates new staff account (SUPERADMIN and ADMIN only)
router.post('/', authenticateToken, requireRoles('SUPERADMIN', 'ADMIN'), async (req: AuthenticatedRequest, res) => {
  try {
    const { username, email, password, firstName, middleInitial, lastName, position, office, cluster, role } = req.body;

    if (!email || !password || !firstName || !lastName || !office || !role) {
      return res.status(400).json({ error: 'Missing required user account fields' });
    }

    if (!email.trim().toLowerCase().endsWith('@fda.gov.ph')) {
      return res.status(400).json({ error: 'Email must end with @fda.gov.ph' });
    }

    const id = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const passwordHash = await hashPassword(password);
    const uname = username || email.split('@')[0];

    await pool.query(
      `INSERT INTO users (id, username, email, password_hash, first_name, middle_initial, last_name, position, role_code, office_code, cluster_code, is_active, last_activity)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [
        id,
        uname,
        email.trim().toLowerCase(),
        passwordHash,
        firstName.trim(),
        middleInitial?.trim() || null,
        lastName.trim(),
        position || 'Food-Drug Regulation Officer (FDRO)',
        role,
        office,
        cluster || null,
        'Account created by administrator',
      ]
    );

    // Write system audit log
    if (req.user) {
      await pool.query(
        `INSERT INTO system_audit_logs (event_type, user_id, user_email, user_role, description, target_entity_id, target_entity_name)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          'USER_REGISTERED',
          req.user.id,
          req.user.email,
          req.user.role,
          `Admin registered new staff account: ${firstName} ${lastName} (${email}) with role ${role}.`,
          id,
          `${firstName} ${lastName}`,
        ]
      );
    }

    res.status(201).json({
      id,
      username: uname,
      email: email.trim().toLowerCase(),
      firstName: firstName.trim(),
      middleInitial: middleInitial?.trim() || '',
      lastName: lastName.trim(),
      position: position || 'Food-Drug Regulation Officer (FDRO)',
      office,
      cluster,
      role,
      status: 'active',
      createdAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Create user error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'A user with this email or username already exists' });
    }
    res.status(500).json({ error: 'Failed to create user account' });
  }
});

// PATCH /api/users/:id/status - updates active/deactivated status
router.patch('/:id/status', authenticateToken, requireRoles('SUPERADMIN', 'ADMIN'), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (status !== 'active' && status !== 'deactivated') {
      return res.status(400).json({ error: 'Invalid status. Must be "active" or "deactivated"' });
    }

    const isActive = status === 'active' ? 1 : 0;
    await pool.query('UPDATE users SET is_active = ? WHERE id = ?', [isActive, id]);

    if (req.user) {
      await pool.query(
        `INSERT INTO system_audit_logs (event_type, user_id, user_email, user_role, description, target_entity_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          'USER_STATUS_CHANGED',
          req.user.id,
          req.user.email,
          req.user.role,
          `User account ${id} status updated to ${status}.`,
          id,
        ]
      );
    }

    res.json({ success: true, id, status });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

export default router;
