import { Router } from 'express';
import { pool } from '../db';
import { hashPassword, comparePassword, generateToken, authenticateToken, AuthenticatedRequest } from '../auth';

const router = Router();

// Allowed demo usernames (strictly from seed accounts)
const ALLOWED_DEMO_USERS = new Set([
  'amldelgado',
  'atty.franklin',
  'director.gomel',
  'sup.ncr',
  'juan.fdro',
]);

// Helper to normalize and resolve office code and cluster code against database
async function resolveOfficeAndCluster(officeInput: string): Promise<{ officeCode: string; clusterCode: string | null } | null> {
  const trimmed = (officeInput || '').trim();
  if (!trimmed) return null;

  // 1. Direct match on office_code or office_name
  const [rows]: [any[], any] = await pool.query(
    `SELECT office_code, cluster_code FROM offices WHERE office_code = ? OR office_name = ? LIMIT 1`,
    [trimmed, trimmed]
  );
  if (rows.length > 0) {
    return { officeCode: rows[0].office_code, clusterCode: rows[0].cluster_code || null };
  }

  // 2. Handle common variations
  if (trimmed.toUpperCase() === 'NCR' || trimmed.toLowerCase() === 'region-ncr') {
    const [ncrRows]: [any[], any] = await pool.query(
      `SELECT office_code, cluster_code FROM offices WHERE office_code = 'Region NCR' LIMIT 1`
    );
    if (ncrRows.length > 0) {
      return { officeCode: ncrRows[0].office_code, clusterCode: ncrRows[0].cluster_code || null };
    }
  }

  if (trimmed.toUpperCase() === 'CAR' || trimmed.toLowerCase() === 'region car') {
    const [carRows]: [any[], any] = await pool.query(
      `SELECT office_code, cluster_code FROM offices WHERE office_code = 'CAR' LIMIT 1`
    );
    if (carRows.length > 0) {
      return { officeCode: carRows[0].office_code, clusterCode: carRows[0].cluster_code || null };
    }
  }

  // 3. Prefix match if user passed e.g. "Region 4A"
  const [likeRows]: [any[], any] = await pool.query(
    `SELECT office_code, cluster_code FROM offices WHERE office_name LIKE ? LIMIT 1`,
    [`%${trimmed}%`]
  );
  if (likeRows.length > 0) {
    return { officeCode: likeRows[0].office_code, clusterCode: likeRows[0].cluster_code || null };
  }

  return null;
}

// POST /api/auth/register - Public staff account registration (persists to MySQL)
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, firstName, middleInitial, lastName, position, office } = req.body;

    // Validate required fields
    if (!username || !email || !password || !firstName || !lastName || !position || !office) {
      return res.status(400).json({
        error: 'Please complete all required fields: username, email, password, first name, last name, position, and regional office.',
      });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedUsername = username.trim().toLowerCase();

    // Enforce official FDA email domain
    if (!/^[a-zA-Z0-9._%+-]+@fda\.gov\.ph$/.test(trimmedEmail)) {
      return res.status(400).json({
        error: 'Only official FDA email addresses ending with @fda.gov.ph are permitted for staff registration.',
      });
    }

    // Enforce password minimum length
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    // Role-based privilege protection:
    // Reject self-assignment to SUPERADMIN or ADMIN or ODDG-FROO headquarters via public registration
    const isOddgOffice = office.trim().toUpperCase() === 'ODDG-FROO' || office.toLowerCase().includes('oddg-froo');
    const isExecutivePosition =
      position.includes('Deputy Director General') ||
      position.includes('ODDG-FROO Staff') ||
      position === 'Cluster Director';

    if (isOddgOffice || isExecutivePosition || trimmedEmail === 'amldelgado@fda.gov.ph') {
      return res.status(403).json({
        error: 'Privileged accounts (ODDG-FROO Executive, Superadmin, and Cluster Director) cannot be self-created via public registration. Please contact an ODDG-FROO Administrator.',
      });
    }

    // Validate and resolve office & cluster against MySQL offices table
    const resolvedOffice = await resolveOfficeAndCluster(office);
    if (!resolvedOffice) {
      return res.status(400).json({
        error: `Selected regional office "${office}" is not recognized in the database registry.`,
      });
    }

    // Server-enforced RBAC role:
    // Regional Supervisors get REGIONAL_SUPERVISOR; field inspectors/staff get STANDARD
    let assignedRole = 'STANDARD';
    if (position === 'Regional Supervisor') {
      assignedRole = 'REGIONAL_SUPERVISOR';
    }

    // Check for duplicate email in MySQL
    const [existingEmail]: [any[], any] = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = ?',
      [trimmedEmail]
    );
    if (existingEmail.length > 0) {
      return res.status(409).json({ error: 'An account with this official FDA email already exists.' });
    }

    // Check for duplicate username in MySQL
    const [existingUsername]: [any[], any] = await pool.query(
      'SELECT id FROM users WHERE LOWER(username) = ?',
      [trimmedUsername]
    );
    if (existingUsername.length > 0) {
      return res.status(409).json({ error: 'This username is already taken. Please choose another.' });
    }

    // Generate secure bcrypt hash (never store plaintext)
    const passwordHash = await hashPassword(password);
    const id = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const formattedMI = middleInitial?.trim()
      ? middleInitial.trim().endsWith('.')
        ? middleInitial.trim().toUpperCase()
        : `${middleInitial.trim().toUpperCase()}.`
      : null;

    // Persist to MySQL users table
    await pool.query(
      `INSERT INTO users (id, username, email, password_hash, first_name, middle_initial, last_name, position, role_code, office_code, cluster_code, is_active, last_activity)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [
        id,
        trimmedUsername,
        trimmedEmail,
        passwordHash,
        firstName.trim(),
        formattedMI,
        lastName.trim(),
        position.trim(),
        assignedRole,
        resolvedOffice.officeCode,
        resolvedOffice.clusterCode,
        'Registered staff account',
      ]
    );

    // Audit log in system_audit_logs
    try {
      await pool.query(
        `INSERT INTO system_audit_logs (event_type, user_id, user_email, user_role, description, target_entity_id, target_entity_name)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          'USER_REGISTERED',
          id,
          trimmedEmail,
          assignedRole,
          `Staff registered account: ${firstName.trim()} ${lastName.trim()} (${position.trim()}) under ${resolvedOffice.officeCode}.`,
          id,
          `${firstName.trim()} ${lastName.trim()}`,
        ]
      );
    } catch (auditErr) {
      console.warn('Audit log write warning:', auditErr);
    }

    // Format safe response (password_hash is NEVER returned)
    const safeUser = {
      id,
      username: trimmedUsername,
      email: trimmedEmail,
      firstName: firstName.trim(),
      middleInitial: formattedMI || '',
      lastName: lastName.trim(),
      position: position.trim(),
      office: resolvedOffice.officeCode,
      cluster: resolvedOffice.clusterCode,
      role: assignedRole,
      status: 'active' as const,
      createdAt: new Date().toISOString(),
      lastActivity: 'Registered staff account',
    };

    res.status(201).json({
      message: `Staff account for ${safeUser.firstName} ${safeUser.lastName} registered successfully in the FROO database. You may now sign in.`,
      user: safeUser,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'A user with this email or username already exists' });
    }
    res.status(500).json({ error: 'Internal server error while creating user in database' });
  }
});

// POST /api/auth/demo-login - Controlled Instant Demo Login through backend
router.post('/demo-login', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production' && process.env.ENABLE_DEMO_LOGIN !== 'true') {
      return res.status(403).json({ error: 'Instant demo login is disabled in production environments.' });
    }

    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ error: 'Demo username is required' });
    }

    const trimmed = username.trim().toLowerCase();
    if (!ALLOWED_DEMO_USERS.has(trimmed)) {
      return res.status(403).json({ error: `User "${username}" is not an authorized demo persona.` });
    }

    const [rows]: [any[], any] = await pool.query(
      `SELECT u.id, u.username, u.email, u.first_name, u.middle_initial, u.last_name,
              u.position, u.role_code, u.office_code, u.cluster_code, u.is_active, u.last_login_at, u.last_activity
       FROM users u
       WHERE LOWER(u.username) = ? LIMIT 1`,
      [trimmed]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: `Demo user "${username}" not found in database. Please run initial seed.` });
    }

    const userRow = rows[0];
    if (!userRow.is_active) {
      return res.status(403).json({ error: 'This demo account is currently deactivated.' });
    }

    // Update last login in MySQL
    await pool.query('UPDATE users SET last_login_at = NOW(), last_activity = ? WHERE id = ?', [
      'Active in demo session',
      userRow.id,
    ]);

    const tokenPayload = {
      id: userRow.id,
      email: userRow.email,
      role: userRow.role_code,
      office: userRow.office_code,
      firstName: userRow.first_name,
      lastName: userRow.last_name,
    };

    const token = generateToken(tokenPayload);

    const user = {
      id: userRow.id,
      username: userRow.username,
      email: userRow.email,
      firstName: userRow.first_name,
      middleInitial: userRow.middle_initial || '',
      lastName: userRow.last_name,
      position: userRow.position,
      office: userRow.office_code,
      cluster: userRow.cluster_code,
      role: userRow.role_code,
      status: 'active' as const,
      createdAt: userRow.created_at,
      lastLogin: new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      lastActivity: 'Active in demo session',
    };

    try {
      await pool.query(
        `INSERT INTO system_audit_logs (event_type, user_id, user_email, user_role, description)
         VALUES (?, ?, ?, ?, ?)`,
        ['USER_LOGIN', user.id, user.email, user.role, `Demo login authenticated for ${user.firstName} ${user.lastName} (${user.role}).`]
      );
    } catch (auditErr) {
      console.warn('Audit log write warning:', auditErr);
    }

    res.json({ token, user });
  } catch (error) {
    console.error('Demo login error:', error);
    res.status(500).json({ error: 'Failed to authenticate demo session' });
  }
});

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
