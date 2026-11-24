import { useState, useEffect } from 'react';
import { FrooOffice } from '../types/task';
import { UserRole } from '../types/auth';
import { CATEGORIES, ORIGINS, OUTCOMES, FROO_OFFICES } from '../data/offices';

export interface StaffPositionConfigItem {
  title: string;
  defaultRole: UserRole;
  selfRegisterAllowed: boolean;
}

export interface SystemConfigData {
  categories: string[];
  origins: string[];
  outcomes: string[];
  positions: StaffPositionConfigItem[];
  offices: FrooOffice[];
  updatedAt?: string;
  updatedBy?: string;
}

const SYSTEM_CONFIG_STORAGE_KEY = 'froo_system_config_v1';

export const DEFAULT_POSITIONS: StaffPositionConfigItem[] = [
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

export function getDefaultSystemConfig(): SystemConfigData {
  return {
    categories: [...CATEGORIES],
    origins: [...ORIGINS],
    outcomes: [...OUTCOMES],
    positions: DEFAULT_POSITIONS.map((p) => ({ ...p })),
    offices: FROO_OFFICES.map((o) => ({ ...o, defaultPersonnel: [...(o.defaultPersonnel || [])] })),
  };
}

export function normalizeSystemConfig(raw: Partial<SystemConfigData> | null | undefined): SystemConfigData {
  const defaults = getDefaultSystemConfig();
  if (!raw || typeof raw !== 'object') {
    return defaults;
  }

  const categories =
    Array.isArray(raw.categories) && raw.categories.length > 0
      ? raw.categories.map((c) => String(c).trim()).filter(Boolean)
      : defaults.categories;

  const origins =
    Array.isArray(raw.origins) && raw.origins.length > 0
      ? raw.origins.map((o) => String(o).trim()).filter(Boolean)
      : defaults.origins;

  const outcomes =
    Array.isArray(raw.outcomes) && raw.outcomes.length > 0
      ? raw.outcomes.map((o) => String(o).trim()).filter(Boolean)
      : defaults.outcomes;

  const positions: StaffPositionConfigItem[] =
    Array.isArray(raw.positions) && raw.positions.length > 0
      ? raw.positions
          .map((p: any) => ({
            title: String(p?.title || '').trim(),
            defaultRole: (p?.defaultRole || 'STANDARD') as UserRole,
            selfRegisterAllowed:
              typeof p?.selfRegisterAllowed === 'boolean'
                ? p.selfRegisterAllowed
                : p?.defaultRole === 'STANDARD' || p?.defaultRole === 'REGIONAL_SUPERVISOR',
          }))
          .filter((p) => Boolean(p.title))
      : defaults.positions;

  const offices: FrooOffice[] =
    Array.isArray(raw.offices) && raw.offices.length > 0
      ? raw.offices
          .map((o: any) => ({
            id: String(o?.id || `office-${String(o?.code || '').toLowerCase().replace(/[^a-z0-9]/g, '-')}`),
            code: String(o?.code || o?.shortLabel || '').trim(),
            name: String(o?.name || o?.code || '').trim(),
            shortLabel: String(o?.shortLabel || o?.code || '').trim(),
            coverage: String(o?.coverage || '').trim(),
            defaultPersonnel: Array.isArray(o?.defaultPersonnel) ? o.defaultPersonnel : [],
          }))
          .filter((o) => Boolean(o.code))
      : defaults.offices;

  return {
    categories,
    origins,
    outcomes,
    positions,
    offices,
    updatedAt: raw.updatedAt,
    updatedBy: raw.updatedBy,
  };
}

export function getStoredSystemConfig(): SystemConfigData {
  try {
    const raw = localStorage.getItem(SYSTEM_CONFIG_STORAGE_KEY);
    if (!raw) return getDefaultSystemConfig();
    const parsed = JSON.parse(raw);
    return normalizeSystemConfig(parsed);
  } catch {
    return getDefaultSystemConfig();
  }
}

export function saveStoredSystemConfig(config: SystemConfigData): SystemConfigData {
  const normalized = normalizeSystemConfig(config);
  try {
    localStorage.setItem(SYSTEM_CONFIG_STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent('froo-system-config-updated', { detail: normalized }));
  } catch (err) {
    console.warn('Could not save system config to localStorage:', err);
  }
  return normalized;
}

export function useSystemConfig(): [
  SystemConfigData,
  React.Dispatch<React.SetStateAction<SystemConfigData>>
] {
  const [config, setConfig] = useState<SystemConfigData>(() => getStoredSystemConfig());

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const custom = e as CustomEvent<SystemConfigData>;
      if (custom.detail) {
        setConfig(normalizeSystemConfig(custom.detail));
      } else {
        setConfig(getStoredSystemConfig());
      }
    };

    window.addEventListener('froo-system-config-updated', handleUpdate);
    return () => {
      window.removeEventListener('froo-system-config-updated', handleUpdate);
    };
  }, []);

  return [config, setConfig];
}

