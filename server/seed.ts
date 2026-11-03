import { pool, getIsDatabaseAlive } from './db';
import { hashPassword } from './auth';

let hasSeededMySQL = false;
let hasSeededFallback = false;
let seedInProgress = false;

export async function runAutoSeed(): Promise<void> {
  const isMySQL = getIsDatabaseAlive();
  if ((isMySQL && hasSeededMySQL) || (!isMySQL && hasSeededFallback) || seedInProgress) {
    return;
  }

  seedInProgress = true;
  const connection = await pool.getConnection();

  try {
    console.log('🔄 Checking database seed status...');

    // 1. Seed clusters if needed
    await connection.query(`
      INSERT IGNORE INTO clusters (cluster_code, cluster_name, description) VALUES
      ('NLC', 'North Luzon Cluster', 'Ilocos Region, Cagayan Valley, Central Luzon, CAR'),
      ('SLC', 'South Luzon Cluster', 'CALABARZON, MIMAROPA, Bicol Region, NCR'),
      ('VBC', 'Visayas Cluster', 'Western, Central, and Eastern Visayas'),
      ('MOC', 'Mindanao Cluster', 'Zamboanga Peninsula, Northern Mindanao, Davao, SOCCSKSARGEN, Caraga, BARMM');
    `);

    // 2. Seed roles if needed
    await connection.query(`
      INSERT IGNORE INTO roles (role_code, role_name, hierarchy_level, can_approve_dispatch, description) VALUES
      ('SUPERADMIN', 'Super Administrator', 1, 1, 'Complete system-wide supervisory, user management, and override authority'),
      ('ADMIN', 'ODDG-FROO Executive Admin', 2, 1, 'Deputy Director General office administrator with approval authority'),
      ('CLUSTER_DIRECTOR', 'Cluster Director', 3, 1, 'Executive Director supervising Regional Field Offices across a cluster'),
      ('REGIONAL_SUPERVISOR', 'Regional Field Supervisor', 4, 1, 'Supervisor authorizing regional inspection assignments and dispatches'),
      ('STANDARD', 'Field Regulatory Operations Officer', 5, 0, 'Field inspector / staff officer restricted from dispatch slip approvals');
    `);

    // 3. Seed offices if needed
    await connection.query(`
      INSERT IGNORE INTO offices (office_code, office_name, cluster_code, office_type) VALUES
      ('ODDG-FROO', 'Office of the Deputy Director General - FROO', NULL, 'CENTRAL'),
      ('NLC', 'North Luzon Cluster Office (NLC)', 'NLC', 'REGIONAL'),
      ('SLC', 'South Luzon Cluster Office (SLC)', 'SLC', 'REGIONAL'),
      ('VBC', 'Visayas Cluster Office (VBC)', 'VBC', 'REGIONAL'),
      ('MOC', 'Mindanao Cluster Office (MOC)', 'MOC', 'REGIONAL'),
      ('North Luzon Cluster (NLC)', 'North Luzon Cluster (NLC)', 'NLC', 'REGIONAL'),
      ('South Luzon Cluster (SLC)', 'South Luzon Cluster (SLC)', 'SLC', 'REGIONAL'),
      ('Visayas Cluster (VC)', 'Visayas Cluster (VC)', 'VBC', 'REGIONAL'),
      ('Mindanao Cluster (MOC)', 'Mindanao Cluster (MOC)', 'MOC', 'REGIONAL'),
      ('Region NCR', 'Regional Field Office - NCR', 'SLC', 'REGIONAL'),
      ('Region 1', 'Regional Field Office - Ilocos Region (Region 1)', 'NLC', 'REGIONAL'),
      ('Region 2', 'Regional Field Office - Cagayan Valley (Region 2)', 'NLC', 'REGIONAL'),
      ('Region 3', 'Regional Field Office - Central Luzon (Region 3)', 'NLC', 'REGIONAL'),
      ('Region 4A', 'Regional Field Office - CALABARZON (Region 4A)', 'SLC', 'REGIONAL'),
      ('Region 4B', 'Regional Field Office - MIMAROPA (Region 4B)', 'SLC', 'REGIONAL'),
      ('Region 5', 'Regional Field Office - Bicol Region (Region 5)', 'SLC', 'REGIONAL'),
      ('Region 6', 'Regional Field Office - Western Visayas (Region 6)', 'VBC', 'REGIONAL'),
      ('Region 7', 'Regional Field Office - Central Visayas (Region 7)', 'VBC', 'REGIONAL'),
      ('Region 8', 'Regional Field Office - Eastern Visayas (Region 8)', 'VBC', 'REGIONAL'),
      ('Region 9', 'Regional Field Office - Zamboanga Peninsula (Region 9)', 'MOC', 'REGIONAL'),
      ('Region 10', 'Regional Field Office - Northern Mindanao (Region 10)', 'MOC', 'REGIONAL'),
      ('Region 11', 'Regional Field Office - Davao Region (Region 11)', 'MOC', 'REGIONAL'),
      ('Region 12', 'Regional Field Office - SOCCSKSARGEN (Region 12)', 'MOC', 'REGIONAL'),
      ('CARAGA', 'Regional Field Office - Caraga (Region 13)', 'MOC', 'REGIONAL'),
      ('CAR', 'Regional Field Office - Cordillera Administrative Region', 'NLC', 'REGIONAL'),
      ('BARMM', 'Regional Field Office - BARMM', 'MOC', 'REGIONAL');
    `);

    // 4. Ensure users table has required columns (in case created from an older schema version)
    const [existingCols]: [any[], any] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'`
    );
    const colSet = new Set(existingCols.map((c: any) => String(c.COLUMN_NAME || c.column_name || '')));

    if (colSet.size > 0 && !colSet.has('username')) {
      await connection.query(`ALTER TABLE users ADD COLUMN username VARCHAR(100) NULL AFTER id, ADD UNIQUE KEY uq_users_username (username)`);
    }
    if (colSet.size > 0 && !colSet.has('cluster_code')) {
      await connection.query(`ALTER TABLE users ADD COLUMN cluster_code VARCHAR(20) NULL AFTER office_code`);
    }
    if (colSet.size > 0 && !colSet.has('last_activity')) {
      await connection.query(`ALTER TABLE users ADD COLUMN last_activity VARCHAR(255) NULL AFTER last_login_at`);
    }

    // 4b. Ensure tasks table supports multiple assignees (assigned_to_names), N/A DTNs, and Normal/Urgent priorities
    const [taskCols]: [any[], any] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tasks'`
    );
    const taskColSet = new Set(taskCols.map((c: any) => String(c.COLUMN_NAME || c.column_name || '')));
    if (taskColSet.size > 0 && !taskColSet.has('assigned_to_names')) {
      await connection.query(`ALTER TABLE tasks ADD COLUMN assigned_to_names TEXT NULL AFTER assigned_to_user_id`);
    }
    if (isMySQL) {
      try {
        await connection.query(`ALTER TABLE tasks DROP CHECK chk_tasks_dtn_format`);
      } catch {
        // Check constraint already dropped or not present
      }
      try {
        await connection.query(`ALTER TABLE tasks DROP INDEX uq_tasks_dtn`);
      } catch {
        // Unique index already dropped or not present
      }
      try {
        await connection.query(`ALTER TABLE tasks MODIFY COLUMN dtn VARCHAR(50) NOT NULL DEFAULT 'N/A'`);
        await connection.query(`ALTER TABLE tasks MODIFY COLUMN priority VARCHAR(50) NOT NULL DEFAULT 'Normal'`);
      } catch {
        // Ignore if already modified
      }
    }

    // 5. Only seed the primary Superadmin if the users table is completely empty (do not add extra demo users)
    const [userRows]: [any[], any] = await connection.query('SELECT COUNT(*) as count FROM users');
    const userCount = userRows[0]?.count || 0;

    if (userCount === 0) {
      const defaultPasswordHash = await hashPassword('password123');
      await connection.query(
        `INSERT INTO users (id, username, email, password_hash, first_name, middle_initial, last_name, position, role_code, office_code, cluster_code, is_active, last_activity)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [
          'usr-superadmin',
          'amldelgado',
          'amldelgado@fda.gov.ph',
          defaultPasswordHash,
          'Andrei Manuel',
          'L.',
          'Delgado',
          'IT Developer',
          'SUPERADMIN',
          'ODDG-FROO',
          null,
          'Active in System Console',
        ]
      );
    }

    // Ensure Superadmin record always reflects Andrei Manuel L. Delgado & IT Developer in MySQL
    await connection.query(
      `UPDATE users
       SET first_name = 'Andrei Manuel',
           middle_initial = 'L.',
           last_name = 'Delgado',
           position = 'IT Developer'
       WHERE id = 'usr-superadmin' OR LOWER(email) = 'amldelgado@fda.gov.ph'`
    );

    if (isMySQL) {
      hasSeededMySQL = true;
    } else {
      hasSeededFallback = true;
    }
  } catch (err) {
    console.warn('⚠️ Auto-seed notice (database may already be configured or offline):', (err as Error).message);
  } finally {
    seedInProgress = false;
    connection.release();
  }
}

