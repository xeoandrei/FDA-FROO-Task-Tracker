import { UserAccount, UserRole, UserPosition, SystemLog, SystemActionType, ClusterCode } from '../types/auth';
import { INITIAL_USERS } from '../data/initialUsers';
import { FROO_CLUSTERS, getClusterForRegion } from '../data/clusters';

const USERS_STORAGE_KEY = 'froo_user_accounts_v2';
const CURRENT_USER_KEY = 'froo_current_user_session_v2';
const SYSTEM_LOGS_KEY = 'froo_system_audit_logs_v2';

export const SUPERADMIN_EMAIL = 'amldelgado@fda.gov.ph';

// Helper to check if an email is a valid FDA government email
export function isValidFdaEmail(email: string): boolean {
  if (!email) return false;
  const trimmed = email.trim().toLowerCase();
  return /^[a-zA-Z0-9._%+-]+@fda\.gov\.ph$/.test(trimmed);
}

// Automatic RBAC determination logic based on user specifications
export function determineRole(email: string, office: string, position: UserPosition): UserRole {
  const normEmail = email.trim().toLowerCase();
  if (normEmail === SUPERADMIN_EMAIL) {
    return 'SUPERADMIN';
  }
  // All accounts created with Office / Region ODDG-FROO will be Admin
  if (office === 'ODDG-FROO') {
    return 'ADMIN';
  }
  if (position === 'Cluster Director') {
    return 'CLUSTER_DIRECTOR';
  }
  if (position === 'Regional Supervisor') {
    return 'REGIONAL_SUPERVISOR';
  }
  return 'STANDARD';
}

export function getStoredUsers(): UserAccount[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Normalize any older RANK_AND_FILE to STANDARD and ensure superadmin has IT Developer position
      const normalized = parsed.map((u: UserAccount) => {
        const isSuper = u.email.toLowerCase() === SUPERADMIN_EMAIL;
        return {
          ...u,
          role: (u.role as string) === 'RANK_AND_FILE' ? 'STANDARD' : u.role,
          position: isSuper ? 'IT Developer' : u.position,
        };
      });
      // Ensure superadmin always exists
      const hasSuper = normalized.some((u: UserAccount) => u.email.toLowerCase() === SUPERADMIN_EMAIL);
      if (!hasSuper) {
        const superUser = INITIAL_USERS[0];
        const combined = [superUser, ...normalized];
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(combined));
        return combined;
      }
      return normalized;
    }
    return INITIAL_USERS;
  } catch (e) {
    console.error('Failed to get users', e);
    return INITIAL_USERS;
  }
}

export function saveStoredUsers(users: UserAccount[]): void {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Failed to save users', e);
  }
}

export function getCurrentUser(): UserAccount | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (!raw) return null;
    const user: UserAccount = JSON.parse(raw);
    if ((user.role as string) === 'RANK_AND_FILE') {
      user.role = 'STANDARD';
    }
    if (user.email.toLowerCase() === SUPERADMIN_EMAIL) {
      user.position = 'IT Developer';
    }
    // Double check if account was deactivated or updated in registry
    const allUsers = getStoredUsers();
    const fresh = allUsers.find((u) => u.id === user.id);
    if (fresh) {
      if (fresh.status === 'deactivated') {
        setCurrentUser(null);
        return null;
      }
      return fresh;
    }
    return user;
  } catch (e) {
    return null;
  }
}

export function setCurrentUser(user: UserAccount | null): void {
  try {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  } catch (e) {
    console.error('Failed to update session', e);
  }
}

// Global System Audit Logs
export function getSystemLogs(): SystemLog[] {
  try {
    const raw = localStorage.getItem(SYSTEM_LOGS_KEY);
    if (!raw) {
      const initialLogs = getInitialSeedLogs();
      localStorage.setItem(SYSTEM_LOGS_KEY, JSON.stringify(initialLogs));
      return initialLogs;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function logSystemAction(
  actionType: SystemActionType,
  user: { id: string; firstName: string; lastName: string; email: string; office: string; role: UserRole },
  description: string,
  extra?: { targetEntityId?: string; targetEntityName?: string; metadata?: Record<string, unknown> }
): void {
  try {
    const existing = getSystemLogs();
    const now = new Date();
    const formattedTimestamp = now.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const newLog: SystemLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: formattedTimestamp,
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userEmail: user.email,
      office: user.office,
      role: user.role,
      actionType,
      description,
      targetEntityId: extra?.targetEntityId,
      targetEntityName: extra?.targetEntityName,
      metadata: extra?.metadata,
    };

    const updated = [newLog, ...existing.slice(0, 499)]; // Keep recent 500 logs
    localStorage.setItem(SYSTEM_LOGS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to log system action', e);
  }
}

export function clearSystemLogs(): void {
  localStorage.removeItem(SYSTEM_LOGS_KEY);
}

function getInitialSeedLogs(): SystemLog[] {
  return [
    {
      id: 'log-seed-1',
      timestamp: 'Oct 26, 2026, 09:30:15 AM',
      userId: 'usr-superadmin',
      userName: 'AML Delgado',
      userEmail: 'amldelgado@fda.gov.ph',
      office: 'ODDG-FROO',
      role: 'SUPERADMIN',
      actionType: 'USER_LOGIN',
      description: 'Superadmin authenticated successfully into Field Regulatory Operations Portal.',
    },
    {
      id: 'log-seed-2',
      timestamp: 'Oct 26, 2026, 09:15:22 AM',
      userId: 'usr-fdro-juan',
      userName: 'Juan Dela Cruz',
      userEmail: 'jdelacruz@fda.gov.ph',
      office: 'Region NCR',
      role: 'STANDARD',
      actionType: 'TASK_RECEIVED',
      description: 'Task received and accepted: "Conduct inspection of ABC Manufacturing". Status moved to In Progress.',
      targetEntityId: 'task-1',
      targetEntityName: 'Conduct inspection of ABC Manufacturing',
    },
    {
      id: 'log-seed-3',
      timestamp: 'Oct 25, 2026, 04:15:10 PM',
      userId: 'usr-franklin',
      userName: 'Franklin Anthony Tabaquin IV',
      userEmail: 'franklin.tabaquin@fda.gov.ph',
      office: 'ODDG-FROO',
      role: 'ADMIN',
      actionType: 'DISPATCH_APPROVED',
      description: 'Approved official field dispatch slip CTRL No. RFOX-2026-510 for Northern Mindanao field inspection.',
      targetEntityId: 'RFOX-2026-510',
    },
    {
      id: 'log-seed-4',
      timestamp: 'Oct 25, 2026, 03:42:00 PM',
      userId: 'usr-sup-r4a',
      userName: 'Ronaldo Castillo',
      userEmail: 'r4a.supervisor@fda.gov.ph',
      office: 'Region 4A',
      role: 'REGIONAL_SUPERVISOR',
      actionType: 'TASK_ASSIGNED',
      description: 'Assigned establishment investigation task to Maria Santos (FDRO - Region 4A).',
      targetEntityId: 'task-2',
      targetEntityName: 'Investigate reported establishment',
    },
  ];
}
