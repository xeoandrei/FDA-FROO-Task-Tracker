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
      status: r.is_active ? 'active' : (r.last_activity && r.last_activity.toLowerCase().includes('awaiting') ? 'pending' : 'deactivated'),
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

    // Resolve office and cluster from DB
    let resolvedOfficeCode = office;
    let resolvedClusterCode = cluster || null;

    const [officeRows]: [any[], any] = await pool.query(
      `SELECT office_code, cluster_code FROM offices WHERE office_code = ? OR office_name = ? LIMIT 1`,
      [office, office]
    );

    if (officeRows.length > 0) {
      resolvedOfficeCode = officeRows[0].office_code;
      if (!resolvedClusterCode) {
        resolvedClusterCode = officeRows[0].cluster_code || null;
      }
    } else if (office.toUpperCase() === 'NCR') {
      resolvedOfficeCode = 'Region NCR';
      resolvedClusterCode = 'SLC';
    }

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
        resolvedOfficeCode,
        resolvedClusterCode,
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

// POST /api/users/:id/approve - approves and activates a pending staff account
router.post('/:id/approve', authenticateToken, requireRoles('SUPERADMIN', 'ADMIN'), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    // Fetch user details for audit logging
    const [uRows]: [any[], any] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    if (uRows.length === 0) {
      return res.status(404).json({ error: 'User account not found' });
    }
    const targetUser = uRows[0];

    await pool.query('UPDATE users SET is_active = 1, last_activity = ? WHERE id = ?', [
      'Approved by Administrator',
      id,
    ]);

    if (req.user) {
      await pool.query(
        `INSERT INTO system_audit_logs (event_type, user_id, user_email, user_role, description, target_entity_id, target_entity_name)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          'USER_APPROVED',
          req.user.id,
          req.user.email,
          req.user.role,
          `Administrator ${req.user.firstName} ${req.user.lastName} approved staff account: ${targetUser.first_name} ${targetUser.last_name} (${targetUser.email}, ${targetUser.position}).`,
          id,
          `${targetUser.first_name} ${targetUser.last_name}`,
        ]
      );
    }

    res.json({
      success: true,
      id,
      status: 'active',
      message: `Staff account for ${targetUser.first_name} ${targetUser.last_name} has been approved and activated.`,
    });
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({ error: 'Failed to approve user account' });
  }
});

// DELETE /api/users/:id - permanently deletes a staff account
router.delete('/:id', authenticateToken, requireRoles('SUPERADMIN', 'ADMIN'), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    const [uRows]: [any[], any] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    if (uRows.length === 0) {
      return res.status(404).json({ error: 'User account not found' });
    }
    const targetUser = uRows[0];

    if (targetUser.email.toLowerCase() === 'amldelgado@fda.gov.ph') {
      return res.status(403).json({ error: 'The primary Superadmin root account cannot be deleted.' });
    }

    await pool.query('DELETE FROM users WHERE id = ?', [id]);

    if (req.user) {
      await pool.query(
        `INSERT INTO system_audit_logs (event_type, user_id, user_email, user_role, description, target_entity_id, target_entity_name)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          'USER_DELETED',
          req.user.id,
          req.user.email,
          req.user.role,
          `Administrator ${req.user.firstName} ${req.user.lastName} deleted staff account: ${targetUser.first_name} ${targetUser.last_name} (${targetUser.email}).`,
          id,
          `${targetUser.first_name} ${targetUser.last_name}`,
        ]
      );
    }

    res.json({ success: true, id, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user account' });
  }
});

export default router;
