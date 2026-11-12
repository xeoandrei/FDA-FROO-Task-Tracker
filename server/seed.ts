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

    if (isMySQL) {
      // Automatically bootstrap schema tables on fresh cloud MySQL instances (e.g., Railway / Aiven)
      await connection.query(`
        CREATE TABLE IF NOT EXISTS clusters (
          cluster_code VARCHAR(20) NOT NULL,
          cluster_name VARCHAR(150) NOT NULL,
          description VARCHAR(255) NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (cluster_code)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS roles (
          role_code VARCHAR(30) NOT NULL,
          role_name VARCHAR(100) NOT NULL,
          hierarchy_level INT NOT NULL,
          can_approve_dispatch TINYINT(1) NOT NULL DEFAULT 0,
          description VARCHAR(255) NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (role_code)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS offices (
          office_code VARCHAR(30) NOT NULL,
          office_name VARCHAR(150) NOT NULL,
          cluster_code VARCHAR(20) NULL,
          office_type ENUM('CENTRAL', 'REGIONAL') NOT NULL DEFAULT 'REGIONAL',
          is_active TINYINT(1) NOT NULL DEFAULT 1,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (office_code),
          CONSTRAINT fk_offices_cluster FOREIGN KEY (cluster_code) REFERENCES clusters (cluster_code) ON UPDATE CASCADE ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
          id CHAR(36) NOT NULL,
          username VARCHAR(100) NULL,
          email VARCHAR(150) NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          first_name VARCHAR(100) NOT NULL,
          middle_initial VARCHAR(10) NULL,
          last_name VARCHAR(100) NOT NULL,
          position VARCHAR(150) NOT NULL,
          role_code VARCHAR(30) NOT NULL DEFAULT 'STANDARD',
          office_code VARCHAR(30) NOT NULL,
          cluster_code VARCHAR(20) NULL,
          is_active TINYINT(1) NOT NULL DEFAULT 1,
          last_login_at DATETIME NULL,
          last_activity VARCHAR(255) NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uq_users_username (username),
          UNIQUE KEY uq_users_email (email),
          CONSTRAINT fk_users_role FOREIGN KEY (role_code) REFERENCES roles (role_code) ON UPDATE CASCADE ON DELETE RESTRICT,
          CONSTRAINT fk_users_office FOREIGN KEY (office_code) REFERENCES offices (office_code) ON UPDATE CASCADE ON DELETE RESTRICT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS tasks (
          id VARCHAR(40) NOT NULL,
          dtn VARCHAR(50) NOT NULL DEFAULT 'N/A',
          task_title VARCHAR(255) NOT NULL,
          category VARCHAR(100) NOT NULL,
          origin VARCHAR(100) NOT NULL,
          origin_details VARCHAR(150) NULL,
          assigned_to_user_id CHAR(36) NULL,
          assigned_to_names TEXT NULL,
          assigned_office_code VARCHAR(30) NOT NULL,
          region VARCHAR(255) NOT NULL,
          due_date DATE NOT NULL,
          scheduled_date DATE NULL,
          location VARCHAR(255) NOT NULL DEFAULT 'In-Office / N/A',
          description TEXT NOT NULL,
          outcome VARCHAR(150) NOT NULL DEFAULT 'Pending',
          remarks TEXT NULL,
          status ENUM('Open', 'In Progress', 'Completed', 'Overdue', 'Pending Approval', 'Cancelled') NOT NULL DEFAULT 'Open',
          priority VARCHAR(50) NOT NULL DEFAULT 'Normal',
          received_at DATETIME NULL,
          received_by_user_id CHAR(36) NULL,
          completed_at DATETIME NULL,
          completed_by_user_id CHAR(36) NULL,
          created_by_user_id CHAR(36) NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          CONSTRAINT fk_tasks_assigned_user FOREIGN KEY (assigned_to_user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE RESTRICT,
          CONSTRAINT fk_tasks_assigned_office FOREIGN KEY (assigned_office_code) REFERENCES offices (office_code) ON UPDATE CASCADE ON DELETE RESTRICT,
          CONSTRAINT fk_tasks_received_user FOREIGN KEY (received_by_user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL,
          CONSTRAINT fk_tasks_completed_user FOREIGN KEY (completed_by_user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL,
          CONSTRAINT fk_tasks_created_user FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS task_activity_logs (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          task_id VARCHAR(40) NOT NULL,
          action VARCHAR(255) NOT NULL,
          actor_user_id CHAR(36) NULL,
          actor_name VARCHAR(150) NOT NULL,
          actor_office VARCHAR(50) NOT NULL,
          notes TEXT NULL,
          new_status VARCHAR(50) NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          CONSTRAINT fk_activity_task FOREIGN KEY (task_id) REFERENCES tasks (id) ON UPDATE CASCADE ON DELETE CASCADE,
          CONSTRAINT fk_activity_actor FOREIGN KEY (actor_user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS dispatch_slips (
          id VARCHAR(40) NOT NULL,
          task_id VARCHAR(40) NOT NULL,
          ctrl_no VARCHAR(50) NOT NULL,
          dispatch_date VARCHAR(255) NOT NULL,
          purpose_inspection TINYINT(1) NOT NULL DEFAULT 0,
          purpose_pms TINYINT(1) NOT NULL DEFAULT 0,
          purpose_meeting TINYINT(1) NOT NULL DEFAULT 0,
          purpose_investigation TINYINT(1) NOT NULL DEFAULT 0,
          purpose_destruction TINYINT(1) NOT NULL DEFAULT 0,
          others_purpose VARCHAR(255) NULL DEFAULT 'N/A',
          time_of_arrival VARCHAR(50) NULL,
          team_leader VARCHAR(150) NOT NULL,
          team_members TEXT NOT NULL,
          driver VARCHAR(150) NOT NULL DEFAULT 'HANNIBAL C. ECOBEN',
          vehicle_plate_number VARCHAR(50) NOT NULL DEFAULT 'AVANZA SAB 9141',
          recommended_by_name VARCHAR(150) NOT NULL,
          recommended_by_title VARCHAR(150) NOT NULL,
          approved_by_name VARCHAR(150) NOT NULL,
          approved_by_title VARCHAR(150) NOT NULL,
          status ENUM('Draft', 'Pending Regional Supervisor Approval', 'Pending ODDG Approval', 'Approved', 'Rejected', 'Completed') NOT NULL DEFAULT 'Pending Regional Supervisor Approval',
          rejection_reason TEXT NULL,
          created_by_user_id CHAR(36) NULL,
          approved_by_user_id CHAR(36) NULL,
          approved_at DATETIME NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uq_dispatch_ctrl_no (ctrl_no),
          CONSTRAINT fk_dispatch_task FOREIGN KEY (task_id) REFERENCES tasks (id) ON UPDATE CASCADE ON DELETE CASCADE,
          CONSTRAINT fk_dispatch_created_by FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL,
          CONSTRAINT fk_dispatch_approved_by FOREIGN KEY (approved_by_user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS dispatch_slip_destinations (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          dispatch_slip_id VARCHAR(40) NOT NULL,
          sequence_no INT NOT NULL DEFAULT 1,
          establishment_name VARCHAR(255) NOT NULL,
          location_address VARCHAR(255) NOT NULL,
          target_date VARCHAR(150) NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          CONSTRAINT fk_dest_dispatch_slip FOREIGN KEY (dispatch_slip_id) REFERENCES dispatch_slips (id) ON UPDATE CASCADE ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS system_audit_logs (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          event_type VARCHAR(50) NOT NULL,
          user_id VARCHAR(50) NULL,
          user_email VARCHAR(150) NOT NULL,
          user_role VARCHAR(30) NOT NULL,
          description TEXT NOT NULL,
          target_entity_id VARCHAR(100) NULL,
          target_entity_name VARCHAR(255) NULL,
          ip_address VARCHAR(45) NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    }

    // 1. Seed clusters if needed
    await connection.query(`
      INSERT IGNORE INTO clusters (cluster_code, cluster_name, description) VALUES
      ('NLC', 'North Luzon Cluster', 'Ilocos Region, Cagayan Valley, Central Luzon, CAR'),
      ('SLC', 'South Luzon Cluster', 'CALABARZON, MIMAROPA, Bicol Region, NCR'),
      ('VC', 'Visayas Cluster', 'Western, Central, and Eastern Visayas'),
      ('VBC', 'Visayas Cluster', 'Western, Central, and Eastern Visayas'),
      ('MEC', 'Mindanao East Cluster', 'Northern Mindanao (Region 10), Davao Region (Region 11), Caraga (Region 13)'),
      ('MWC', 'Mindanao West Cluster', 'Zamboanga Peninsula (Region 9), SOCCSKSARGEN (Region 12) / BARMM'),
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
      ('VC', 'Visayas Cluster Office (VC)', 'VC', 'REGIONAL'),
      ('VBC', 'Visayas Cluster Office (VBC)', 'VBC', 'REGIONAL'),
      ('MEC', 'Mindanao East Cluster Office (MEC)', 'MEC', 'REGIONAL'),
      ('MWC', 'Mindanao West Cluster Office (MWC)', 'MWC', 'REGIONAL'),
      ('MOC', 'Mindanao Cluster Office (MOC)', 'MOC', 'REGIONAL'),
      ('North Luzon Cluster (NLC)', 'North Luzon Cluster (NLC)', 'NLC', 'REGIONAL'),
      ('South Luzon Cluster (SLC)', 'South Luzon Cluster (SLC)', 'SLC', 'REGIONAL'),
      ('Visayas Cluster (VC)', 'Visayas Cluster (VC)', 'VC', 'REGIONAL'),
      ('Mindanao East Cluster (MEC)', 'Mindanao East Cluster (MEC)', 'MEC', 'REGIONAL'),
      ('Mindanao West Cluster (MWC)', 'Mindanao West Cluster (MWC)', 'MWC', 'REGIONAL'),
      ('Mindanao Cluster (MOC)', 'Mindanao Cluster (MOC)', 'MOC', 'REGIONAL'),
      ('Region NCR', 'Regional Field Office - NCR', 'SLC', 'REGIONAL'),
      ('NCR', 'Region NCR', 'SLC', 'REGIONAL'),
      ('Region 1', 'Regional Field Office - Ilocos Region (Region 1)', 'NLC', 'REGIONAL'),
      ('Region 2', 'Regional Field Office - Cagayan Valley (Region 2)', 'NLC', 'REGIONAL'),
      ('Region 3', 'Regional Field Office - Central Luzon (Region 3)', 'NLC', 'REGIONAL'),
      ('Region 4A', 'Regional Field Office - CALABARZON (Region 4A)', 'SLC', 'REGIONAL'),
      ('Region 4B', 'Regional Field Office - MIMAROPA (Region 4B)', 'SLC', 'REGIONAL'),
      ('Region 5', 'Regional Field Office - Bicol Region (Region 5)', 'SLC', 'REGIONAL'),
      ('Region 6', 'Regional Field Office - Western Visayas (Region 6)', 'VBC', 'REGIONAL'),
      ('Region 7', 'Regional Field Office - Central Visayas (Region 7)', 'VBC', 'REGIONAL'),
      ('Region 8', 'Regional Field Office - Eastern Visayas (Region 8)', 'VBC', 'REGIONAL'),
      ('Region 9', 'Regional Field Office - Zamboanga Peninsula (Region 9)', 'MWC', 'REGIONAL'),
      ('Region 10', 'Regional Field Office - Northern Mindanao (Region 10)', 'MEC', 'REGIONAL'),
      ('Region 11', 'Regional Field Office - Davao Region (Region 11)', 'MEC', 'REGIONAL'),
      ('Region 12', 'Regional Field Office - SOCCSKSARGEN (Region 12)', 'MWC', 'REGIONAL'),
      ('Region 12 / BARMM', 'Region 12 / BARMM', 'MWC', 'REGIONAL'),
      ('Region 13', 'Region 13 (Caraga)', 'MEC', 'REGIONAL'),
      ('CARAGA', 'Regional Field Office - Caraga (Region 13)', 'MEC', 'REGIONAL'),
      ('CAR', 'Regional Field Office - Cordillera Administrative Region', 'NLC', 'REGIONAL'),
      ('Region CAR', 'Region CAR', 'NLC', 'REGIONAL'),
      ('BARMM', 'Regional Field Office - BARMM', 'MWC', 'REGIONAL'),
      ('FDA Centers', 'FDA Product & Regulatory Centers', NULL, 'CENTRAL'),
      ('LSSC', 'Legal Services Support Center (LSSC)', NULL, 'CENTRAL'),
      ('CSL', 'Common Services Laboratory (CSL)', NULL, 'CENTRAL'),
      ('PPO', 'Policy and Planning Office (PPO)', NULL, 'CENTRAL');
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

    // 4b. Ensure tasks table supports multiple assignees (assigned_to_names), multiple regions, N/A DTNs, and Normal/Urgent priorities
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
        await connection.query(`ALTER TABLE tasks MODIFY COLUMN category VARCHAR(100) NOT NULL`);
        await connection.query(`ALTER TABLE tasks MODIFY COLUMN origin VARCHAR(100) NOT NULL`);
        await connection.query(`ALTER TABLE tasks MODIFY COLUMN assigned_to_user_id CHAR(36) NULL`);
        await connection.query(`ALTER TABLE tasks MODIFY COLUMN region VARCHAR(255) NOT NULL`);
        await connection.query(`ALTER TABLE tasks MODIFY COLUMN scheduled_date DATE NULL`);
        await connection.query(`ALTER TABLE tasks MODIFY COLUMN priority VARCHAR(50) NOT NULL DEFAULT 'Normal'`);
      } catch {
        // Ignore if already modified
      }
      try {
        await connection.query(`ALTER TABLE dispatch_slips MODIFY COLUMN dispatch_date VARCHAR(255) NOT NULL`);
      } catch {
        // Ignore if already modified
      }
      try {
        const [destCols]: [any[], any] = await connection.query(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dispatch_slip_destinations'`
        );
        const destColSet = new Set(destCols.map((c: any) => String(c.COLUMN_NAME || c.column_name || '')));
        if (destColSet.size > 0 && !destColSet.has('target_date')) {
          await connection.query(`ALTER TABLE dispatch_slip_destinations ADD COLUMN target_date VARCHAR(150) NULL AFTER location_address`);
        }
      } catch {
        // Ignore if already present
      }
    }

    // 5. Ensure primary Superadmin and the standard "Admin" account exist in MySQL
    const [userRows]: [any[], any] = await connection.query('SELECT COUNT(*) as count FROM users');
    const userCount = userRows[0]?.count || 0;
    const defaultPasswordHash = await hashPassword('password123');

    if (userCount === 0) {
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

