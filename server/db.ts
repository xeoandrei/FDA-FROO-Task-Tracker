import 'dotenv/config';
import mysql from 'mysql2/promise';

const connectionUri = process.env.MYSQL_URL || process.env.DATABASE_URL || '';

const databaseConfig: mysql.PoolOptions = {
  host: process.env.DB_HOST || process.env.MYSQLHOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3307),
  user: process.env.DB_USER || process.env.MYSQLUSER || 'froo_user',
  password: process.env.DB_PASSWORD ?? process.env.MYSQLPASSWORD,
  database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'froo_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ...(process.env.DB_SSL === 'true' ? { ssl: { rejectUnauthorized: false } } : {}),
};

let rawPool: mysql.Pool | null = null;
try {
  rawPool = connectionUri ? mysql.createPool(connectionUri) : mysql.createPool(databaseConfig);
} catch (err) {
  console.warn('⚠️ Could not initialize MySQL pool:', err);
}

// -----------------------------------------------------------------------------
// In-Memory Fallback State (when local Docker MySQL is unreachable)
// Initialized directly with the official FDA FROO baseline seeds
// -----------------------------------------------------------------------------
export const fallbackStore = {
  clusters: [
    { cluster_code: 'NLC', cluster_name: 'North Luzon Cluster', description: 'Ilocos Region, Cagayan Valley, Central Luzon, CAR' },
    { cluster_code: 'SLC', cluster_name: 'South Luzon Cluster', description: 'CALABARZON, MIMAROPA, Bicol Region, NCR' },
    { cluster_code: 'VBC', cluster_name: 'Visayas Cluster', description: 'Western, Central, and Eastern Visayas' },
    { cluster_code: 'MOC', cluster_name: 'Mindanao Cluster', description: 'Zamboanga Peninsula, Northern Mindanao, Davao, SOCCSKSARGEN, Caraga, BARMM' },
  ],
  roles: [
    { role_code: 'SUPERADMIN', role_name: 'Super Administrator', hierarchy_level: 1, can_approve_dispatch: 1, description: 'Complete system-wide supervisory, user management, and override authority' },
    { role_code: 'ADMIN', role_name: 'ODDG-FROO Executive Admin', hierarchy_level: 2, can_approve_dispatch: 1, description: 'Deputy Director General office administrator with approval authority' },
    { role_code: 'CLUSTER_DIRECTOR', role_name: 'Cluster Director', hierarchy_level: 3, can_approve_dispatch: 1, description: 'Executive Director supervising Regional Field Offices across a cluster' },
    { role_code: 'REGIONAL_SUPERVISOR', role_name: 'Regional Field Supervisor', hierarchy_level: 4, can_approve_dispatch: 1, description: 'Supervisor authorizing regional inspection assignments and dispatches' },
    { role_code: 'STANDARD', role_name: 'Field Regulatory Operations Officer', hierarchy_level: 5, can_approve_dispatch: 0, description: 'Field inspector / staff officer restricted from dispatch slip approvals' },
  ],
  offices: [
    { office_code: 'ODDG-FROO', office_name: 'Office of the Deputy Director General - FROO', cluster_code: null, office_type: 'CENTRAL', is_active: 1 },
    { office_code: 'NLC', office_name: 'North Luzon Cluster Office (NLC)', cluster_code: 'NLC', office_type: 'REGIONAL', is_active: 1 },
    { office_code: 'SLC', office_name: 'South Luzon Cluster Office (SLC)', cluster_code: 'SLC', office_type: 'REGIONAL', is_active: 1 },
    { office_code: 'VBC', office_name: 'Visayas Cluster Office (VBC)', cluster_code: 'VBC', office_type: 'REGIONAL', is_active: 1 },
    { office_code: 'MOC', office_name: 'Mindanao Cluster Office (MOC)', cluster_code: 'MOC', office_type: 'REGIONAL', is_active: 1 },
    { office_code: 'North Luzon Cluster (NLC)', office_name: 'North Luzon Cluster (NLC)', cluster_code: 'NLC', office_type: 'REGIONAL', is_active: 1 },
    { office_code: 'South Luzon Cluster (SLC)', office_name: 'South Luzon Cluster (SLC)', cluster_code: 'SLC', office_type: 'REGIONAL', is_active: 1 },
    { office_code: 'Visayas Cluster (VC)', office_name: 'Visayas Cluster (VC)', cluster_code: 'VBC', office_type: 'REGIONAL', is_active: 1 },
    { office_code: 'Mindanao Cluster (MOC)', office_name: 'Mindanao Cluster (MOC)', cluster_code: 'MOC', office_type: 'REGIONAL', is_active: 1 },
    { office_code: 'Region NCR', office_name: 'Regional Field Office - NCR', cluster_code: 'SLC', office_type: 'REGIONAL', is_active: 1 },
    { office_code: 'NCR', office_name: 'Region NCR', cluster_code: 'SLC', office_type: 'REGIONAL', is_active: 1 },
    { office_code: 'Region 1', office_name: 'Regional Field Office - Ilocos Region (Region 1)', cluster_code: 'NLC', office_type: 'REGIONAL', is_active: 1 },
    { office_code: 'Region 2', office_name: 'Regional Field Office - Cagayan Valley (Region 2)', cluster_code: 'NLC', office_type: 'REGIONAL', is_active: 1 },
    { office_code: 'Region 3', office_name: 'Regional Field Office - Central Luzon (Region 3)', cluster_code: 'NLC', office_type: 'REGIONAL', is_active: 1 },
    { office_code: 'Region 4A', office_name: 'Regional Field Office - CALABARZON (Region 4A)', cluster_code: 'SLC', office_type: 'REGIONAL', is_active: 1 },
    { office_code: 'Region 4B', office_name: 'Regional Field Office - MIMAROPA (Region 4B)', cluster_code: 'SLC', office_type: 'REGIONAL', is_active: 1 },
    { office_code: 'Region 5', office_name: 'Regional Field Office - Bicol Region (Region 5)', cluster_code: 'SLC', office_type: 'REGIONAL', is_active: 1 },
    { office_code: 'Region 6', office_name: 'Regional Field Office - Western Visayas (Region 6)', cluster_code: 'VBC', office_type: 'REGIONAL', is_active: 1 },
    { office_code: 'Region 7', office_name: 'Regional Field Office - Central Visayas (Region 7)', cluster_code: 'VBC', office_type: 'REGIONAL', is_active: 1 },
    { office_code: 'Region 8', office_name: 'Regional Field Office - Eastern Visayas (Region 8)', cluster_code: 'VBC', office_type: 'REGIONAL', is_active: 1 },
    { office_code: 'Region 9', office_name: 'Regional Field Office - Zamboanga Peninsula (Region 9)', cluster_code: 'MOC', office_type: 'REGIONAL', is_active: 1 },
    { office_code: 'Region 10', office_name: 'Regional Field Office - Northern Mindanao (Region 10)', cluster_code: 'MOC', office_type: 'REGIONAL', is_active: 1 },
    { office_code: 'Region 11', office_name: 'Regional Field Office - Davao Region (Region 11)', cluster_code: 'MOC', office_type: 'REGIONAL', is_active: 1 },
    { office_code: 'Region 12', office_name: 'Regional Field Office - SOCCSKSARGEN (Region 12)', cluster_code: 'MOC', office_type: 'REGIONAL', is_active: 1 },
    { office_code: 'Region 12 / BARMM', office_name: 'Region 12 / BARMM', cluster_code: 'MOC', office_type: 'REGIONAL', is_active: 1 },
    { office_code: 'Region 13', office_name: 'Region 13 (Caraga)', cluster_code: 'MOC', office_type: 'REGIONAL', is_active: 1 },
    { office_code: 'CARAGA', office_name: 'Regional Field Office - Caraga (Region 13)', cluster_code: 'MOC', office_type: 'REGIONAL', is_active: 1 },
    { office_code: 'CAR', office_name: 'Regional Field Office - Cordillera Administrative Region', cluster_code: 'NLC', office_type: 'REGIONAL', is_active: 1 },
    { office_code: 'Region CAR', office_name: 'Region CAR', cluster_code: 'NLC', office_type: 'REGIONAL', is_active: 1 },
    { office_code: 'BARMM', office_name: 'Regional Field Office - BARMM', cluster_code: 'MOC', office_type: 'REGIONAL', is_active: 1 },
    { office_code: 'FDA Centers', office_name: 'FDA Product & Regulatory Centers', cluster_code: null, office_type: 'CENTRAL', is_active: 1 },
    { office_code: 'LSSC', office_name: 'Legal Services Support Center (LSSC)', cluster_code: null, office_type: 'CENTRAL', is_active: 1 },
    { office_code: 'CSL', office_name: 'Common Services Laboratory (CSL)', cluster_code: null, office_type: 'CENTRAL', is_active: 1 },
    { office_code: 'PPO', office_name: 'Policy and Planning Office (PPO)', cluster_code: null, office_type: 'CENTRAL', is_active: 1 },
  ],
  users: [
    {
      id: 'usr-superadmin',
      username: 'amldelgado',
      email: 'amldelgado@fda.gov.ph',
      password_hash: '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdHgTGmrpHEfIoxm', // password123
      first_name: 'Andrei Manuel',
      middle_initial: 'L.',
      last_name: 'Delgado',
      position: 'IT Developer',
      role_code: 'SUPERADMIN',
      office_code: 'ODDG-FROO',
      cluster_code: null,
      is_active: 1,
      last_login_at: new Date().toISOString(),
      last_activity: 'Active in System Console',
      created_at: new Date().toISOString(),
    },
  ] as any[],
  tasks: [] as any[],
  task_activity_logs: [] as any[],
  dispatch_slips: [] as any[],
  dispatch_slip_destinations: [] as any[],
  system_audit_logs: [
    {
      id: 1,
      event_type: 'SYSTEM_BOOT',
      user_id: 'usr-superadmin',
      user_email: 'amldelgado@fda.gov.ph',
      user_role: 'SUPERADMIN',
      description: 'System initialization and schema verification completed.',
      target_entity_id: 'froo-system',
      target_entity_name: 'FROO Task Tracker',
      ip_address: '127.0.0.1',
      created_at: new Date().toISOString(),
    },
  ] as any[],
};

// -----------------------------------------------------------------------------
// In-Memory Query Router
// Translates SQL queries against the fallbackStore when MySQL is not running
// -----------------------------------------------------------------------------
function executeFallbackQuery(sql: string, params: any[] = []): [any[], any] {
  const normalizedSql = sql.trim().replace(/\s+/g, ' ');

  // 1. SELECT DATABASE() or SELECT 1
  if (normalizedSql.includes('SELECT 1')) {
    return [[{ '?column?': 1 }], []];
  }
  if (normalizedSql.includes('SELECT DATABASE()')) {
    return [[{ dbName: 'froo_db (in-memory mode)', mysqlPort: 3307, mysqlVersion: '8.0-fallback' }], []];
  }

  // 2. CLUSTERS
  if (normalizedSql.startsWith('SELECT * FROM clusters')) {
    return [[...fallbackStore.clusters], []];
  }

  // 3. ROLES
  if (normalizedSql.startsWith('SELECT * FROM roles')) {
    const sorted = [...fallbackStore.roles].sort((a, b) => a.hierarchy_level - b.hierarchy_level);
    return [sorted, []];
  }

  // 4. OFFICES
  if (normalizedSql.startsWith('SELECT * FROM offices') || normalizedSql.includes('FROM offices WHERE is_active = 1')) {
    const sorted = [...fallbackStore.offices].sort((a, b) => a.office_name.localeCompare(b.office_name));
    return [sorted, []];
  }
  if (
    normalizedSql.includes('SELECT office_code, cluster_code FROM offices WHERE office_code = ? OR office_name = ?') ||
    normalizedSql.includes('SELECT office_code FROM offices WHERE office_code = ? OR office_name = ?')
  ) {
    const val = params[0];
    const found = fallbackStore.offices.find(
      (o) => o.office_code.toLowerCase() === String(val).toLowerCase() || o.office_name.toLowerCase() === String(val).toLowerCase()
    );
    return [found ? [found] : [], []];
  }
  if (normalizedSql.includes("WHERE office_code = 'Region NCR'")) {
    const found = fallbackStore.offices.find((o) => o.office_code === 'Region NCR');
    return [found ? [found] : [], []];
  }
  if (normalizedSql.includes("WHERE office_code = 'CAR'")) {
    const found = fallbackStore.offices.find((o) => o.office_code === 'CAR');
    return [found ? [found] : [], []];
  }
  if (normalizedSql.includes('FROM offices WHERE office_name LIKE ?')) {
    const search = String(params[0] || '').replace(/%/g, '').toLowerCase();
    const found = fallbackStore.offices.find((o) => o.office_name.toLowerCase().includes(search));
    return [found ? [found] : [], []];
  }

  // 5. USERS: Email / Username Duplicate Check
  if (normalizedSql.includes('SELECT id FROM users WHERE LOWER(email) = ?')) {
    const targetEmail = String(params[0] || '').toLowerCase();
    const found = fallbackStore.users.find((u) => u.email.toLowerCase() === targetEmail);
    return [found ? [{ id: found.id }] : [], []];
  }
  if (normalizedSql.includes('SELECT id FROM users WHERE LOWER(username) = ?')) {
    const targetUsername = String(params[0] || '').toLowerCase();
    const found = fallbackStore.users.find((u) => (u.username || '').toLowerCase() === targetUsername);
    return [found ? [{ id: found.id }] : [], []];
  }

  // 5b. USERS: Assignee lookup by full name, email, or id
  if (normalizedSql.includes("LOWER(CONCAT(first_name, ' ', last_name)) = ?")) {
    const targetName = String(params[0] || '').toLowerCase().trim();
    const targetEmail = String(params[1] || targetName).toLowerCase().trim();
    const targetId = String(params[2] || targetName).trim();
    const found = fallbackStore.users.find(
      (u) =>
        `${u.first_name} ${u.last_name}`.toLowerCase().trim() === targetName ||
        u.email.toLowerCase().trim() === targetEmail ||
        u.id === targetId
    );
    return [found ? [found] : [], []];
  }

  // 6. USERS: Login lookup (email OR username)
  if (normalizedSql.includes('LOWER(u.email) = ? OR LOWER(u.username) = ?') || normalizedSql.includes('LOWER(email) = ? OR LOWER(username) = ?')) {
    const target = String(params[0] || '').toLowerCase();
    const found = fallbackStore.users.find(
      (u) => u.email.toLowerCase() === target || (u.username || '').toLowerCase() === target
    );
    if (!found) return [[], []];
    const office = fallbackStore.offices.find((o) => o.office_code === found.office_code);
    const role = fallbackStore.roles.find((r) => r.role_code === found.role_code);
    const result = {
      ...found,
      office_name: office?.office_name || found.office_code,
      role_name: role?.role_name || found.role_code,
    };
    return [[result], []];
  }

  // 7. USERS: Lookup by username only (Demo Login)
  if (normalizedSql.includes('WHERE LOWER(u.username) = ? LIMIT 1') || normalizedSql.includes('WHERE LOWER(username) = ? LIMIT 1')) {
    const target = String(params[0] || '').toLowerCase();
    const found = fallbackStore.users.find((u) => (u.username || '').toLowerCase() === target);
    return [found ? [found] : [], []];
  }

  // 8. USERS: Lookup by ID (Auth /me or details)
  if (normalizedSql.includes('FROM users WHERE id = ?')) {
    const targetId = params[0];
    const found = fallbackStore.users.find((u) => u.id === targetId);
    return [found ? [found] : [], []];
  }

  // 9. USERS: Update status (approve / deactivate / activate)
  if (normalizedSql.startsWith('UPDATE users SET is_active = ?')) {
    const isActiveVal = Number(params[0]);
    const userId = params[params.length - 1];
    const user = fallbackStore.users.find((u) => u.id === userId);
    if (user) {
      user.is_active = isActiveVal;
      if (isActiveVal === 1) {
        user.last_activity = 'Approved by Administrator';
      } else {
        user.last_activity = 'Deactivated by Administrator';
      }
    }
    return [{ affectedRows: user ? 1 : 0 }, []] as any;
  }

  // 9b. USERS: Delete user
  if (normalizedSql.startsWith('DELETE FROM users WHERE id = ?')) {
    const userId = params[0];
    const prevCount = fallbackStore.users.length;
    fallbackStore.users = fallbackStore.users.filter((u) => u.id !== userId);
    return [{ affectedRows: prevCount - fallbackStore.users.length }, []] as any;
  }

  // 9c. USERS: Update last login / activity
  if (normalizedSql.startsWith('UPDATE users SET last_login_at = NOW()') || normalizedSql.startsWith('UPDATE users SET last_activity = ?')) {
    const userId = params[params.length - 1];
    const user = fallbackStore.users.find((u) => u.id === userId);
    if (user) {
      user.last_login_at = new Date().toISOString();
      if (params.length >= 2) user.last_activity = params[0];
    }
    return [{ affectedRows: user ? 1 : 0 }, []] as any;
  }

  // 9d. USERS: Update password_hash
  if (normalizedSql.startsWith('UPDATE users SET password_hash = ?')) {
    const newHash = params[0];
    const userId = params[params.length - 1];
    const user = fallbackStore.users.find((u) => u.id === userId);
    if (user) {
      user.password_hash = newHash;
      user.last_activity = 'Changed account password';
    }
    return [{ affectedRows: user ? 1 : 0 }, []] as any;
  }

  // 9e. USERS: Superadmin profile normalization
  if (normalizedSql.includes("SET first_name = 'Andrei Manuel'")) {
    const superUser = fallbackStore.users.find(
      (u) => u.id === 'usr-superadmin' || u.email.toLowerCase() === 'amldelgado@fda.gov.ph'
    );
    if (superUser) {
      superUser.first_name = 'Andrei Manuel';
      superUser.middle_initial = 'L.';
      superUser.last_name = 'Delgado';
      superUser.position = 'IT Developer';
    }
    return [{ affectedRows: superUser ? 1 : 0 }, []] as any;
  }

  // 10. USERS: Insert new user (Registration or Admin creation)
  if (normalizedSql.startsWith('INSERT INTO users')) {
    // Check if 13 params (with is_active) or 12 params
    let is_active = 1;
    let last_activity = 'Registered staff account';
    if (params.length >= 13) {
      is_active = Number(params[11]);
      last_activity = params[12];
    } else {
      last_activity = params[params.length - 1];
    }

    const [id, username, email, password_hash, first_name, middle_initial, last_name, position, role_code, office_code, cluster_code] = params;
    const existingIdx = fallbackStore.users.findIndex(
      (u) => u.id === id || (email && u.email.toLowerCase() === String(email).toLowerCase())
    );
    const newUser = {
      id,
      username,
      email,
      password_hash,
      first_name,
      middle_initial,
      last_name,
      position,
      role_code,
      office_code,
      cluster_code,
      is_active,
      last_login_at: null,
      last_activity: last_activity || (is_active ? 'Account active' : 'Awaiting Administrator Approval'),
      created_at: new Date().toISOString(),
    };
    if (existingIdx >= 0) {
      fallbackStore.users[existingIdx] = { ...fallbackStore.users[existingIdx], ...newUser };
    } else {
      fallbackStore.users.push(newUser);
    }
    return [{ affectedRows: 1, insertId: id }, []] as any;
  }

  // 10b. USERS: Count users
  if (normalizedSql.includes('SELECT COUNT(*) as count FROM users')) {
    return [[{ count: fallbackStore.users.length }], []];
  }

  // 11. USERS: Fetch all directory
  if (normalizedSql.includes('FROM users ORDER BY last_name ASC') || normalizedSql.includes('FROM users')) {
    const mapped = fallbackStore.users.map((u) => ({
      ...u,
      status: u.is_active ? 'active' : (u.last_activity && u.last_activity.toLowerCase().includes('awaiting') ? 'pending' : 'deactivated'),
      office_name: fallbackStore.offices.find((o) => o.office_code === u.office_code)?.office_name || u.office_code,
    }));
    return [mapped, []];
  }

  // 12. TASKS: Fetch by ID
  if (normalizedSql.includes('FROM tasks t') && normalizedSql.includes('WHERE t.id = ?')) {
    const taskId = params[0];
    const task = fallbackStore.tasks.find((t) => t.id === taskId);
    if (!task) return [[], []];

    const u_assigned = fallbackStore.users.find((u) => u.id === task.assigned_to_user_id);
    const u_received = fallbackStore.users.find((u) => u.id === task.received_by_user_id);
    const u_completed = fallbackStore.users.find((u) => u.id === task.completed_by_user_id);
    const u_created = fallbackStore.users.find((u) => u.id === task.created_by_user_id);

    const full = {
      ...task,
      assigned_first_name: u_assigned?.first_name || null,
      assigned_last_name: u_assigned?.last_name || null,
      assigned_email: u_assigned?.email || null,
      assigned_position: u_assigned?.position || null,
      received_first_name: u_received?.first_name || null,
      received_last_name: u_received?.last_name || null,
      received_position: u_received?.position || null,
      received_office: u_received?.office_code || null,
      completed_first_name: u_completed?.first_name || null,
      completed_last_name: u_completed?.last_name || null,
      created_first_name: u_created?.first_name || null,
      created_last_name: u_created?.last_name || null,
    };
    return [[full], []];
  }

  // 14. TASKS: Check duplicate DTN
  if (normalizedSql.includes('FROM tasks WHERE dtn = ?')) {
    const dtn = params[0];
    const found = fallbackStore.tasks.find((t) => t.dtn === dtn);
    return [found ? [{ id: found.id }] : [], []];
  }

  // 13. TASKS: Fetch task IDs or full tasks
  if (normalizedSql.includes('SELECT id FROM tasks ORDER BY') || normalizedSql === 'SELECT id FROM tasks') {
    const list = fallbackStore.tasks.map((t) => ({ id: t.id }));
    return [list, []];
  }

  // 15. TASKS: Insert new task
  if (normalizedSql.startsWith('INSERT INTO tasks')) {
    let id, dtn, task_title, category, origin, origin_details, assigned_to_user_id, assigned_to_names, assigned_office_code, region, due_date, scheduled_date, location, description, priority, created_by_user_id;
    if (normalizedSql.includes('assigned_to_names')) {
      [id, dtn, task_title, category, origin, origin_details, assigned_to_user_id, assigned_to_names, assigned_office_code, region, due_date, scheduled_date, location, description, priority, created_by_user_id] = params;
    } else {
      [id, dtn, task_title, category, origin, origin_details, assigned_to_user_id, assigned_office_code, region, due_date, scheduled_date, location, description, , , priority, created_by_user_id] = params;
    }
    const newTask = {
      id,
      dtn: dtn || 'N/A',
      task_title,
      category,
      origin,
      origin_details: origin_details || null,
      assigned_to_user_id: assigned_to_user_id || null,
      assigned_to_names: assigned_to_names || null,
      assigned_office_code,
      region,
      due_date,
      scheduled_date: scheduled_date || null,
      location: location || 'In-Office / N/A',
      description,
      outcome: 'Pending',
      remarks: null,
      status: 'Open',
      priority: priority || 'Normal',
      received_at: null,
      received_by_user_id: null,
      completed_at: null,
      completed_by_user_id: null,
      created_by_user_id: created_by_user_id || null,
      created_at: new Date().toISOString(),
    };
    fallbackStore.tasks.unshift(newTask);
    return [{ affectedRows: 1, insertId: id }, []] as any;
  }

  // 16. TASKS: Receive task
  if (normalizedSql.includes('received_at = NOW()')) {
    const taskId = params[1];
    const userId = params[0];
    const task = fallbackStore.tasks.find((t) => t.id === taskId);
    if (task) {
      task.status = 'In Progress';
      task.received_at = new Date().toISOString();
      task.received_by_user_id = userId;
    }
    return [{ affectedRows: task ? 1 : 0 }, []] as any;
  }

  // 17. TASKS: Complete task
  if (normalizedSql.includes('completed_at = NOW()')) {
    const taskId = params[3];
    const task = fallbackStore.tasks.find((t) => t.id === taskId);
    if (task) {
      task.status = 'Completed';
      task.outcome = params[0] || 'Completed';
      task.remarks = params[1] || '';
      task.completed_by_user_id = params[2];
      task.completed_at = new Date().toISOString();
    }
    return [{ affectedRows: task ? 1 : 0 }, []] as any;
  }

  // 17b. TASKS: Select by ID for update/delete, update operational details, or delete task
  if (normalizedSql.startsWith('SELECT * FROM tasks WHERE id = ?')) {
    const taskId = params[0];
    const found = fallbackStore.tasks.find((t) => t.id === taskId);
    return [found ? [found] : [], []];
  }
  if (normalizedSql.startsWith('UPDATE tasks SET scheduled_date = ?')) {
    const taskId = params[params.length - 1];
    const task = fallbackStore.tasks.find((t) => t.id === taskId);
    if (task) {
      task.scheduled_date = params[0];
      task.location = params[1];
      task.outcome = params[2];
      task.remarks = params[3];
      task.region = params[4];
      if (params.length >= 7) {
        task.assigned_to_names = params[5];
      }
    }
    return [{ affectedRows: task ? 1 : 0 }, []] as any;
  }
  if (normalizedSql.startsWith('DELETE FROM tasks WHERE id = ?')) {
    const taskId = params[0];
    const before = fallbackStore.tasks.length;
    fallbackStore.tasks = fallbackStore.tasks.filter((t) => t.id !== taskId);
    return [{ affectedRows: before - fallbackStore.tasks.length }, []] as any;
  }

  // 18. TASK ACTIVITY LOGS
  if (normalizedSql.includes('FROM task_activity_logs WHERE task_id = ?')) {
    const taskId = params[0];
    const list = fallbackStore.task_activity_logs
      .filter((a) => a.task_id === taskId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return [list, []];
  }
  if (normalizedSql.startsWith('INSERT INTO task_activity_logs')) {
    const [task_id, action, actor_name, actor_office, actor_user_id, notes, new_status] = params;
    const newLog = {
      id: fallbackStore.task_activity_logs.length + 1,
      task_id,
      action,
      actor_name,
      actor_office,
      actor_user_id,
      notes,
      new_status,
      created_at: new Date().toISOString(),
    };
    fallbackStore.task_activity_logs.unshift(newLog);
    return [{ affectedRows: 1, insertId: newLog.id }, []] as any;
  }

  // 19. DISPATCH SLIPS
  if (normalizedSql.includes('FROM dispatch_slips') && normalizedSql.includes('WHERE d.task_id = ?')) {
    const taskId = params[0];
    const list = fallbackStore.dispatch_slips.filter((d) => d.task_id === taskId);
    return [list, []];
  }
  if (normalizedSql.startsWith('SELECT * FROM dispatch_slips WHERE id = ?')) {
    const id = params[0];
    const found = fallbackStore.dispatch_slips.find((d) => d.id === id);
    return [found ? [found] : [], []];
  }
  if (normalizedSql.startsWith('INSERT INTO dispatch_slips')) {
    const id = params[0];
    const newSlip = {
      id,
      task_id: params[1],
      ctrl_no: params[2],
      dispatch_date: params[3],
      purpose_inspection: params[4],
      purpose_pms: params[5],
      purpose_meeting: params[6],
      purpose_investigation: params[7],
      purpose_destruction: params[8],
      others_purpose: params[9],
      time_of_arrival: params[10],
      team_leader: params[11],
      team_members: params[12],
      driver: params[13],
      vehicle_plate_number: params[14],
      recommended_by_name: params[15],
      recommended_by_title: params[16],
      approved_by_name: params[17],
      approved_by_title: params[18],
      status: params[19],
      created_by_user_id: params[20],
      created_at: new Date().toISOString(),
    };
    fallbackStore.dispatch_slips.push(newSlip);
    return [{ affectedRows: 1, insertId: id }, []] as any;
  }
  if (normalizedSql.includes('FROM dispatch_slip_destinations WHERE dispatch_slip_id = ?')) {
    const slipId = params[0];
    const list = fallbackStore.dispatch_slip_destinations.filter((d) => d.dispatch_slip_id === slipId);
    return [list, []];
  }
  if (normalizedSql.startsWith('INSERT INTO dispatch_slip_destinations')) {
    const [dispatch_slip_id, sequence_no, establishment_name, location_address] = params;
    const dest = {
      id: fallbackStore.dispatch_slip_destinations.length + 1,
      dispatch_slip_id,
      sequence_no,
      establishment_name,
      location_address,
      created_at: new Date().toISOString(),
    };
    fallbackStore.dispatch_slip_destinations.push(dest);
    return [{ affectedRows: 1, insertId: dest.id }, []] as any;
  }

  // 20. SYSTEM AUDIT LOGS
  if (normalizedSql.includes('FROM system_audit_logs sal')) {
    const list = fallbackStore.system_audit_logs.map((sal) => {
      const u = fallbackStore.users.find((usr) => usr.id === sal.user_id);
      return {
        ...sal,
        first_name: u?.first_name || null,
        last_name: u?.last_name || null,
        office_code: u?.office_code || null,
      };
    });
    return [list.slice(0, 250), []];
  }
  if (normalizedSql.startsWith('INSERT INTO system_audit_logs')) {
    const [event_type, user_id, user_email, user_role, description, target_entity_id, target_entity_name] = params;
    const newLog = {
      id: fallbackStore.system_audit_logs.length + 1,
      event_type,
      user_id,
      user_email,
      user_role,
      description,
      target_entity_id: target_entity_id || null,
      target_entity_name: target_entity_name || null,
      created_at: new Date().toISOString(),
    };
    fallbackStore.system_audit_logs.unshift(newLog);
    return [{ affectedRows: 1, insertId: newLog.id }, []] as any;
  }

  // Generic fallback
  return [[], []];
}

let isDatabaseAlive = false;

export function getIsDatabaseAlive(): boolean {
  return isDatabaseAlive;
}

export const pool = {
  async query(sql: string, params: any[] = []): Promise<[any[], any]> {
    if (isDatabaseAlive && rawPool) {
      try {
        return (await rawPool.query(sql, params)) as [any[], any];
      } catch (err: any) {
        if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'PROTOCOL_CONNECTION_LOST') {
          console.warn('⚠️ Lost connection to MySQL; switching to in-memory fallback.');
          isDatabaseAlive = false;
        } else {
          throw err;
        }
      }
    }

    // Execute in-memory fallback
    return executeFallbackQuery(sql, params);
  },

  async getConnection(): Promise<any> {
    if (isDatabaseAlive && rawPool) {
      try {
        return await rawPool.getConnection();
      } catch {
        isDatabaseAlive = false;
      }
    }

    return {
      query: (sql: string, params: any[] = []) => Promise.resolve(executeFallbackQuery(sql, params)),
      beginTransaction: () => Promise.resolve(),
      commit: () => Promise.resolve(),
      rollback: () => Promise.resolve(),
      release: () => {},
    };
  },

  async end(): Promise<void> {
    if (rawPool) {
      try {
        await rawPool.end();
      } catch {
        // Ignore teardown error
      }
    }
  },
};

export async function checkDatabaseConnection(): Promise<void> {
  if (!rawPool) {
    console.log('ℹ️ Operating in fallback in-memory database store.');
    return;
  }

  try {
    const conn = await rawPool.getConnection();
    try {
      await conn.query('SELECT 1');
      isDatabaseAlive = true;
      console.log(`✅ Connected to FROO MySQL database (${databaseConfig.host}:${databaseConfig.port})`);
    } finally {
      conn.release();
    }
  } catch (err: any) {
    isDatabaseAlive = false;
    console.log('ℹ️ Local MySQL container not detected; running in fallback in-memory store.');
  }
}
