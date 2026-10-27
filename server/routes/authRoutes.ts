import { Router } from 'express';
import { pool } from '../db';
import { comparePassword, generateToken, authenticateToken, AuthenticatedRequest } from '../auth';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const trimmedEmail = email.trim().toLowerCase();

    const [rows]: [any[], any] = await pool.query(
      `SELECT u.id, u.username, u.email, u.password_hash, u.first_name, u.middle_initial, u.last_name,
              u.position, u.role_code, u.office_code, u.cluster_code, u.is_active, u.last_login_at, u.last_activity,
              o.office_name, r.role_name
       FROM users u
       LEFT JOIN offices o ON u.office_code = o.office_code
       LEFT JOIN roles r ON u.role_code = r.role_code
       WHERE LOWER(u.email) = ? OR LOWER(u.username) = ?`,
      [trimmedEmail, trimmedEmail]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email/username or password' });
    }

    const userRow = rows[0];

    if (!userRow.is_active) {
      return res.status(403).json({ error: 'Your account has been deactivated. Please contact an administrator.' });
    }

    const passwordMatch = await comparePassword(password, userRow.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email/username or password' });
    }

    // Update last login timestamp
    await pool.query('UPDATE users SET last_login_at = NOW(), last_activity = ? WHERE id = ?', [
      'Active in session',
      userRow.id,
    ]);

    // Build payload and token
    const tokenPayload = {
      id: userRow.id,
      email: userRow.email,
      role: userRow.role_code,
      office: userRow.office_code,
      firstName: userRow.first_name,
      lastName: userRow.last_name,
    };

    const token = generateToken(tokenPayload);

    // Format response aligned with UserAccount
    const user = {
      id: userRow.id,
      username: userRow.username || userRow.email.split('@')[0],
      email: userRow.email,
      firstName: userRow.first_name,
      middleInitial: userRow.middle_initial || '',
      lastName: userRow.last_name,
      position: userRow.position,
      office: userRow.office_code,
      cluster: userRow.cluster_code,
      role: userRow.role_code,
      status: userRow.is_active ? 'active' : 'deactivated',
      createdAt: userRow.created_at,
      lastLogin: new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      lastActivity: 'Active in session',
    };

    // Log to system_audit_logs
    try {
      await pool.query(
        `INSERT INTO system_audit_logs (event_type, user_id, user_email, user_role, description)
         VALUES (?, ?, ?, ?, ?)`,
        ['USER_LOGIN', user.id, user.email, user.role, `User ${user.firstName} ${user.lastName} signed into the system.`]
      );
    } catch (auditErr) {
      console.warn('Audit log write warning:', auditErr);
    }

    res.json({ token, user });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server authentication error' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const [rows]: [any[], any] = await pool.query(
      `SELECT id, username, email, first_name, middle_initial, last_name, position,
              role_code, office_code, cluster_code, is_active, last_login_at, last_activity, created_at
       FROM users WHERE id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User record not found' });
    }

    const row = rows[0];
    const user = {
      id: row.id,
      username: row.username || row.email.split('@')[0],
      email: row.email,
      firstName: row.first_name,
      middleInitial: row.middle_initial || '',
      lastName: row.last_name,
      position: row.position,
      office: row.office_code,
      cluster: row.cluster_code,
      role: row.role_code,
      status: row.is_active ? 'active' : 'deactivated',
      createdAt: row.created_at,
      lastLogin: row.last_login_at,
      lastActivity: row.last_activity,
    };

    res.json({ user });
  } catch (error) {
    console.error('Auth verification error:', error);
    res.status(500).json({ error: 'Failed to verify session' });
  }
});

export default router;
