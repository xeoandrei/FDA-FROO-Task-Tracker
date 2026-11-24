import { Router } from 'express';
import { pool, getIsDatabaseAlive } from '../db';
import { authenticateToken, requireRoles, AuthenticatedRequest } from '../auth';
import { CATEGORIES, ORIGINS, OUTCOMES, FROO_OFFICES } from '../../src/data/offices';

const router = Router();

const DEFAULT_STAFF_POSITIONS = [
  {
    title: 'Food-Drug Regulation Officer (FDRO)',
    defaultRole: 'STANDARD',
    selfRegisterAllowed: true,
  },
  {
    title: 'Licensing Officer',
    defaultRole: 'STANDARD',
    selfRegisterAllowed: true,
  },
  {
    title: 'Information Officer',
    defaultRole: 'STANDARD',
    selfRegisterAllowed: true,
  },
  {
    title: 'Administrative',
    defaultRole: 'STANDARD',
    selfRegisterAllowed: true,
  },
  {
    title: 'Regional Supervisor',
    defaultRole: 'REGIONAL_SUPERVISOR',
    selfRegisterAllowed: true,
  },
  {
    title: 'Cluster Director',
    defaultRole: 'CLUSTER_DIRECTOR',
    selfRegisterAllowed: false,
  },
  {
    title: 'ODDG-FROO Staff',
    defaultRole: 'ADMIN',
    selfRegisterAllowed: false,
  },
  {
    title: 'Deputy Director General (DDG-FROO)',
    defaultRole: 'ADMIN',
    selfRegisterAllowed: false,
  },
  {
    title: 'IT Developer',
    defaultRole: 'ADMIN',
    selfRegisterAllowed: false,
  },
];

let memorySystemConfig: any = {
  categories: [...CATEGORIES],
  origins: [...ORIGINS],
  outcomes: [...OUTCOMES],
  positions: [...DEFAULT_STAFF_POSITIONS],
  offices: [...FROO_OFFICES],
  updatedAt: new Date().toISOString(),
  updatedBy: 'System Default',
};

async function ensureSystemConfigTable(): Promise<void> {
  if (!getIsDatabaseAlive()) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS system_configurations (
      config_key VARCHAR(64) NOT NULL,
      config_json LONGTEXT NOT NULL,
      updated_by VARCHAR(150) NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (config_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

export async function getLiveSystemConfig(): Promise<any> {
  try {
    if (getIsDatabaseAlive()) {
      await ensureSystemConfigTable();
      const [rows]: [any[], any] = await pool.query(
        'SELECT config_json, updated_by, updated_at FROM system_configurations WHERE config_key = ? LIMIT 1',
        ['GLOBAL_CONFIG']
      );

      if (rows.length > 0 && rows[0].config_json) {
        const parsed = JSON.parse(rows[0].config_json);
        memorySystemConfig = {
          ...memorySystemConfig,
          ...parsed,
          updatedBy: rows[0].updated_by || parsed.updatedBy || 'Superadmin',
          updatedAt: rows[0].updated_at || parsed.updatedAt || new Date().toISOString(),
        };
        return memorySystemConfig;
      }
    }
  } catch (err) {
    console.warn('getLiveSystemConfig fallback notice:', err);
  }
  return memorySystemConfig;
}

// GET /api/references/config - returns global dynamic dropdown configurations for all users
router.get('/config', async (_req, res) => {
  const cfg = await getLiveSystemConfig();
  res.json(cfg);
});

// PUT /api/references/config - updates global dynamic dropdown configurations (SUPERADMIN only)
router.put(
  '/config',
  authenticateToken,
  requireRoles('SUPERADMIN'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { categories, origins, outcomes, positions, offices } = req.body || {};
      const actorName = req.user
        ? `${req.user.firstName} ${req.user.lastName} (${req.user.email})`
        : 'Superadmin';

      const nextConfig = {
        categories:
          Array.isArray(categories) && categories.length > 0
            ? categories.map((c: any) => String(c).trim()).filter(Boolean)
            : memorySystemConfig.categories,
        origins:
          Array.isArray(origins) && origins.length > 0
            ? origins.map((o: any) => String(o).trim()).filter(Boolean)
            : memorySystemConfig.origins,
        outcomes:
          Array.isArray(outcomes) && outcomes.length > 0
            ? outcomes.map((o: any) => String(o).trim()).filter(Boolean)
            : memorySystemConfig.outcomes,
        positions:
          Array.isArray(positions) && positions.length > 0
            ? positions
                .map((p: any) => ({
                  title: String(p?.title || '').trim(),
                  defaultRole: p?.defaultRole || 'STANDARD',
                  selfRegisterAllowed:
                    typeof p?.selfRegisterAllowed === 'boolean' ? p.selfRegisterAllowed : true,
                }))
                .filter((p: any) => Boolean(p.title))
            : memorySystemConfig.positions,
        offices:
          Array.isArray(offices) && offices.length > 0
            ? offices
                .map((o: any) => ({
                  id: String(
                    o?.id ||
                      `office-${String(o?.code || '')
                        .toLowerCase()
                        .replace(/[^a-z0-9]/g, '-')}`
                  ),
                  code: String(o?.code || o?.shortLabel || '').trim(),
                  name: String(o?.name || o?.code || '').trim(),
                  shortLabel: String(o?.shortLabel || o?.code || '').trim(),
                  coverage: String(o?.coverage || '').trim(),
                  defaultPersonnel: Array.isArray(o?.defaultPersonnel) ? o.defaultPersonnel : [],
                }))
                .filter((o: any) => Boolean(o.code))
            : memorySystemConfig.offices,
        updatedAt: new Date().toISOString(),
        updatedBy: actorName,
      };

      memorySystemConfig = nextConfig;

      if (getIsDatabaseAlive()) {
        await ensureSystemConfigTable();
        await pool.query(
          `INSERT INTO system_configurations (config_key, config_json, updated_by)
           VALUES ('GLOBAL_CONFIG', ?, ?)
           ON DUPLICATE KEY UPDATE config_json = VALUES(config_json), updated_by = VALUES(updated_by)`,
          [JSON.stringify(nextConfig), actorName]
        );

        // Also ensure any new custom offices exist in the MySQL offices table so foreign keys never fail
        for (const off of nextConfig.offices) {
          const officeType = off.code.toUpperCase().includes('ODDG') ? 'CENTRAL' : 'REGIONAL';
          await pool
            .query(
              `INSERT IGNORE INTO offices (office_code, office_name, office_type, is_active)
               VALUES (?, ?, ?, 1)`,
              [off.code, off.name, officeType]
            )
            .catch(() => {});
        }

        if (req.user) {
          await pool
            .query(
              `INSERT INTO system_audit_logs (event_type, user_id, user_email, user_role, description, target_entity_id, target_entity_name)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                'SYSTEM_CONFIG_UPDATED',
                req.user.id,
                req.user.email,
                req.user.role,
                `Superadmin updated live System Configurations (${nextConfig.categories.length} categories, ${nextConfig.origins.length} origins, ${nextConfig.positions.length} positions, ${nextConfig.outcomes.length} outcomes, ${nextConfig.offices.length} offices).`,
                'GLOBAL_CONFIG',
                'System Configuration',
              ]
            )
            .catch(() => {});
        }
      }

      res.json(nextConfig);
    } catch (error: any) {
      console.error('Update system config error:', error);
      res.status(500).json({ error: error?.message || 'Failed to save system configuration' });
    }
  }
);

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
