import { pool } from './db';
import { hashPassword } from './auth';

export async function runAutoSeed(): Promise<void> {
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
    const colSet = new Set(existingCols.map((c: any) => c.COLUMN_NAME));

    if (!colSet.has('username')) {
      await connection.query(`ALTER TABLE users ADD COLUMN username VARCHAR(100) NULL AFTER id, ADD UNIQUE KEY uq_users_username (username)`);
    }
    if (!colSet.has('cluster_code')) {
      await connection.query(`ALTER TABLE users ADD COLUMN cluster_code VARCHAR(20) NULL AFTER office_code`);
    }
    if (!colSet.has('last_activity')) {
      await connection.query(`ALTER TABLE users ADD COLUMN last_activity VARCHAR(255) NULL AFTER last_login_at`);
    }

    // 5. Check if users table is populated
    const [userRows]: [any[], any] = await connection.query('SELECT COUNT(*) as count FROM users');
    const userCount = userRows[0]?.count || 0;

    if (userCount === 0) {
      console.log('🌱 Seeding initial FDA users with bcrypt hashed passwords...');
      const defaultPasswordHash = await hashPassword('password123');

      const initialUsersToSeed = [
        {
          id: 'usr-superadmin',
          username: 'amldelgado',
          email: 'amldelgado@fda.gov.ph',
          first_name: 'AML',
          middle_initial: 'M.',
          last_name: 'Delgado',
          position: 'IT Developer',
          role_code: 'SUPERADMIN',
          office_code: 'ODDG-FROO',
          cluster_code: null,
          last_activity: 'Active in System Console',
        },
        {
          id: 'usr-franklin',
          username: 'atty.franklin',
          email: 'franklin.tabaquin@fda.gov.ph',
          first_name: 'Franklin Anthony',
          middle_initial: 'M.',
          last_name: 'Tabaquin IV',
          position: 'Deputy Director General (DDG-FROO)',
          role_code: 'ADMIN',
          office_code: 'ODDG-FROO',
          cluster_code: null,
          last_activity: 'Approved regional dispatch slips',
        },
        {
          id: 'usr-ton',
          username: 'atty.ton',
          email: 'ton.froo@fda.gov.ph',
          first_name: 'Ton',
          middle_initial: 'S.',
          last_name: 'Villaruel',
          position: 'ODDG-FROO Staff',
          role_code: 'ADMIN',
          office_code: 'ODDG-FROO',
          cluster_code: null,
          last_activity: 'Created inspection directives',
        },
        {
          id: 'usr-gomel',
          username: 'director.gomel',
          email: 'gomel.gabuna@fda.gov.ph',
          first_name: 'Gomel',
          middle_initial: 'C.',
          last_name: 'Gabuna',
          position: 'Cluster Director',
          role_code: 'CLUSTER_DIRECTOR',
          office_code: 'North Luzon Cluster (NLC)',
          cluster_code: 'NLC',
          last_activity: 'Reviewed NLC regional workload',
        },
        {
          id: 'usr-slc-dir',
          username: 'director.slc',
          email: 'slc.director@fda.gov.ph',
          first_name: 'Maria Elena',
          middle_initial: 'V.',
          last_name: 'Ramos',
          position: 'Cluster Director',
          role_code: 'CLUSTER_DIRECTOR',
          office_code: 'South Luzon Cluster (SLC)',
          cluster_code: 'SLC',
          last_activity: 'Audited CALABARZON & NCR investigations',
        },
        {
          id: 'usr-sup-ncr',
          username: 'sup.ncr',
          email: 'ncr.supervisor@fda.gov.ph',
          first_name: 'Camille',
          middle_initial: 'B.',
          last_name: 'Bautista',
          position: 'Regional Supervisor',
          role_code: 'REGIONAL_SUPERVISOR',
          office_code: 'Region NCR',
          cluster_code: null,
          last_activity: 'Approved FDRO inspection dispatch',
        },
        {
          id: 'usr-sup-r4a',
          username: 'sup.r4a',
          email: 'r4a.supervisor@fda.gov.ph',
          first_name: 'Ronaldo',
          middle_initial: 'C.',
          last_name: 'Castillo',
          position: 'Regional Supervisor',
          role_code: 'REGIONAL_SUPERVISOR',
          office_code: 'Region 4A',
          cluster_code: null,
          last_activity: 'Assigned establishment investigation',
        },
        {
          id: 'usr-fdro-juan',
          username: 'juan.fdro',
          email: 'jdelacruz@fda.gov.ph',
          first_name: 'Juan',
          middle_initial: 'D.',
          last_name: 'Dela Cruz',
          position: 'Food-Drug Regulation Officer (FDRO)',
          role_code: 'STANDARD',
          office_code: 'Region NCR',
          cluster_code: null,
          last_activity: 'Field regulatory inspection',
        },
        {
          id: 'usr-fdro-maria',
          username: 'maria.fdro',
          email: 'msantos@fda.gov.ph',
          first_name: 'Maria',
          middle_initial: 'P.',
          last_name: 'Santos',
          position: 'Food-Drug Regulation Officer (FDRO)',
          role_code: 'STANDARD',
          office_code: 'Region 4A',
          cluster_code: null,
          last_activity: 'Awaiting task receipt for establishment investigation',
        },
        {
          id: 'usr-fdro-melgo',
          username: 'anthonette.fdro',
          email: 'anthonette.melgo@fda.gov.ph',
          first_name: 'Anthonette',
          middle_initial: 'J.',
          last_name: 'Melgo',
          position: 'Food-Drug Regulation Officer (FDRO)',
          role_code: 'STANDARD',
          office_code: 'Region 10',
          cluster_code: null,
          last_activity: 'Field dispatched for pharmacy PMS',
        },
        {
          id: 'usr-lo-carlos',
          username: 'carlos.lo',
          email: 'cmendoza@fda.gov.ph',
          first_name: 'Carlos',
          middle_initial: 'E.',
          last_name: 'Mendoza',
          position: 'Licensing Officer',
          role_code: 'STANDARD',
          office_code: 'Region 3',
          cluster_code: null,
          last_activity: 'Evaluated LTO renewal compliance',
        },
        {
          id: 'usr-io-gemma',
          username: 'gemma.io',
          email: 'gemma.bobis@fda.gov.ph',
          first_name: 'Gemma',
          middle_initial: 'R.',
          last_name: 'Bobis',
          position: 'Information Officer',
          role_code: 'STANDARD',
          office_code: 'Region 5',
          cluster_code: null,
          last_activity: 'Published public health advisory report',
        },
      ];

      for (const u of initialUsersToSeed) {
        await connection.query(
          `INSERT INTO users (id, username, email, password_hash, first_name, middle_initial, last_name, position, role_code, office_code, cluster_code, is_active, last_activity)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
          [
            u.id,
            u.username,
            u.email,
            defaultPasswordHash,
            u.first_name,
            u.middle_initial,
            u.last_name,
            u.position,
            u.role_code,
            u.office_code,
            u.cluster_code,
            u.last_activity,
          ]
        );
      }
      console.log('✅ Initial FDA staff users seeded.');
    }

    // 5. Seed initial tasks if tasks table is empty
    const [taskRows]: [any[], any] = await connection.query('SELECT COUNT(*) as count FROM tasks');
    const taskCount = taskRows[0]?.count || 0;

    if (taskCount === 0) {
      console.log('🌱 Seeding sample tasks...');
      const sampleTasks = [
        {
          id: 'FROO-TSK-2026-001',
          dtn: '20260310001824',
          task_title: 'Conduct Good Distribution Practice (GDP) Inspection of ABC Pharma Warehouse',
          category: 'Good Distribution Practice (GDP) Inspection',
          origin: 'FDA Centers / Offices',
          origin_details: 'Center for Drug Regulation and Research (CDRR) Referral',
          assigned_to_user_id: 'usr-fdro-juan',
          assigned_office_code: 'Region NCR',
          region: 'Region NCR',
          due_date: '2026-11-15',
          location: 'Taguig City, Metro Manila',
          description: 'Comprehensive Good Distribution Practice verification and cold-chain temperature log monitoring for critical biologic medicines.',
          outcome: 'Pending',
          status: 'Open',
          priority: 'High',
          created_by_user_id: 'usr-ton',
        },
        {
          id: 'FROO-TSK-2026-002',
          dtn: '20260310001825',
          task_title: 'Post-Market Surveillance of Cosmetic Creams and Skincare Products',
          category: 'Post-Market Surveillance (PMS)',
          origin: 'DOH / Other Government Agencies',
          origin_details: 'Inter-Agency Task Force Consumer Alert',
          assigned_to_user_id: 'usr-fdro-maria',
          assigned_office_code: 'Region 4A',
          region: 'Region 4A',
          due_date: '2026-11-20',
          location: 'Calamba City, Laguna',
          description: 'Mystery shopping and random product sampling of unregistered cosmetic whitening creams suspected of elevated mercury contents.',
          outcome: 'Pending',
          status: 'Open',
          priority: 'Urgent',
          created_by_user_id: 'usr-ton',
        },
      ];

      for (const t of sampleTasks) {
        await connection.query(
          `INSERT INTO tasks (id, dtn, task_title, category, origin, origin_details, assigned_to_user_id, assigned_office_code, region, due_date, location, description, outcome, status, priority, created_by_user_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            t.id,
            t.dtn,
            t.task_title,
            t.category,
            t.origin,
            t.origin_details,
            t.assigned_to_user_id,
            t.assigned_office_code,
            t.region,
            t.due_date,
            t.location,
            t.description,
            t.outcome,
            t.status,
            t.priority,
            t.created_by_user_id,
          ]
        );

        // Seed initial activity log
        await connection.query(
          `INSERT INTO task_activity_logs (task_id, action, actor_name, actor_office, actor_user_id, notes, new_status)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            t.id,
            'Task initialized and assigned in system',
            'Ton S. Villaruel',
            'ODDG-FROO',
            'usr-ton',
            'Directive logged from CDRR and assigned for regional execution.',
            'Open',
          ]
        );
      }
      console.log('✅ Baseline operational tasks seeded.');
    }

    // 6. Seed initial dispatch slip if dispatch_slips table is empty
    const [dispatchRows]: [any[], any] = await connection.query('SELECT COUNT(*) as count FROM dispatch_slips');
    const dispatchCount = dispatchRows[0]?.count || 0;

    if (dispatchCount === 0) {
      console.log('🌱 Seeding sample dispatch slip...');
      await connection.query(
        `INSERT IGNORE INTO dispatch_slips (
          id, task_id, ctrl_no, dispatch_date,
          purpose_inspection, purpose_pms, purpose_meeting, purpose_investigation, purpose_destruction,
          others_purpose, time_of_arrival, team_leader, team_members, driver, vehicle_plate_number,
          recommended_by_name, recommended_by_title, approved_by_name, approved_by_title,
          status, created_by_user_id
        ) VALUES (
          'DSP-2026-001', 'FROO-TSK-2026-001', 'NCR-2026-0001', 'October 28, 2026',
          1, 0, 0, 0, 0,
          'N/A', '09:00 AM', 'JUAN D. DELA CRUZ', 'NONE', 'HANNIBAL C. ECOBEN', 'AVANZA SAB 9141',
          'CAMILLE B. BAUTISTA', 'Regional Supervisor, Region NCR',
          'ATTY. FRANKLIN ANTHONY M. TABAQUIN, IV', 'Deputy Director General - Field Regulatory Operations Office',
          'Pending Regional Supervisor Approval', 'usr-fdro-juan'
        )`
      );

      await connection.query(
        `INSERT IGNORE INTO dispatch_slip_destinations (
          id, dispatch_slip_id, sequence_no, establishment_name, location_address
        ) VALUES (
          1, 'DSP-2026-001', 1, 'ABC PHARMA WAREHOUSE', 'Taguig City, Metro Manila'
        )`
      );
      console.log('✅ Sample dispatch slip seeded.');
    }
  } catch (err) {
    console.warn('⚠️ Auto-seed notice (database may already be configured or offline):', (err as Error).message);
  } finally {
    connection.release();
  }
}
