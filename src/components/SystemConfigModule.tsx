import React, { useState } from 'react';
import {
  Settings,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  RotateCcw,
  Tag,
  Compass,
  Briefcase,
  CheckCircle2,
  Building2,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { UserAccount, UserRole } from '../types/auth';
import { FrooOffice } from '../types/task';
import {
  useSystemConfig,
  saveStoredSystemConfig,
  getDefaultSystemConfig,
  SystemConfigData,
  StaffPositionConfigItem,
} from '../utils/systemConfigStorage';
import { logSystemAction } from '../utils/authStorage';
import { api } from '../api/client';

interface SystemConfigModuleProps {
  currentUser: UserAccount;
  onShowToast: (msg: string) => void;
}

type ConfigTabKey = 'CATEGORIES' | 'ORIGINS' | 'POSITIONS' | 'OUTCOMES' | 'OFFICES';

const ROLE_OPTIONS: Array<{ value: Exclude<UserRole, 'SUPERADMIN' | 'RANK_AND_FILE'>; label: string }> = [
  { value: 'STANDARD', label: 'STANDARD (Field Inspector / Officer)' },
  { value: 'REGIONAL_SUPERVISOR', label: 'REGIONAL_SUPERVISOR (Regional Supervisor)' },
  { value: 'CLUSTER_DIRECTOR', label: 'CLUSTER_DIRECTOR (Cluster Director)' },
  { value: 'ADMIN', label: 'ADMIN (ODDG-FROO Headquarters)' },
];

export const SystemConfigModule: React.FC<SystemConfigModuleProps> = ({
  currentUser,
  onShowToast,
}) => {
  const [config, setConfig] = useSystemConfig();
  const [activeTab, setActiveTab] = useState<ConfigTabKey>('CATEGORIES');
  const [isSaving, setIsSaving] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Add item form states
  const [newStringItem, setNewStringItem] = useState('');
  const [newPosTitle, setNewPosTitle] = useState('');
  const [newPosRole, setNewPosRole] =
    useState<Exclude<UserRole, 'SUPERADMIN' | 'RANK_AND_FILE'>>('STANDARD');
  const [newPosAllowSelfReg, setNewPosAllowSelfReg] = useState(true);

  const [newOfficeCode, setNewOfficeCode] = useState('');
  const [newOfficeName, setNewOfficeName] = useState('');
  const [newOfficeShortLabel, setNewOfficeShortLabel] = useState('');
  const [newOfficeCoverage, setNewOfficeCoverage] = useState('');

  // Inline editing states
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingTextValue, setEditingTextValue] = useState('');
  const [editingPosition, setEditingPosition] = useState<StaffPositionConfigItem | null>(null);
  const [editingOffice, setEditingOffice] = useState<FrooOffice | null>(null);

  // Confirm reset section
  const [confirmingResetTab, setConfirmingResetTab] = useState<ConfigTabKey | null>(null);

  if (currentUser.role !== 'SUPERADMIN') {
    return (
      <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center max-w-lg mx-auto my-12">
        <AlertCircle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
        <h3 className="text-base font-bold text-slate-900">Superadmin Access Required</h3>
        <p className="text-xs text-slate-500 mt-1">
          Only the root Superadmin account is authorized to modify global system configurations.
        </p>
      </div>
    );
  }

  const persistConfigUpdate = async (
    nextConfig: SystemConfigData,
    auditDescription: string
  ) => {
    setErrorBanner(null);
    setIsSaving(true);

    // Save locally and notify all mounted components immediately
    const normalized = saveStoredSystemConfig(nextConfig);
    setConfig(normalized);

    try {
      const remoteUpdated = await api.updateSystemConfig(normalized);
      if (remoteUpdated) {
        const synced = saveStoredSystemConfig(remoteUpdated);
        setConfig(synced);
      }
    } catch (err: any) {
      console.warn('System config API save fallback:', err?.message);
    } finally {
      setIsSaving(false);
    }

    logSystemAction('SYSTEM_CONFIG_UPDATED', currentUser, auditDescription);
    onShowToast(auditDescription);
  };

  // Switch active tab and reset inline edit states
  const handleSelectTab = (tab: ConfigTabKey) => {
    setActiveTab(tab);
    setEditingIndex(null);
    setEditingTextValue('');
    setEditingPosition(null);
    setEditingOffice(null);
    setNewStringItem('');
    setErrorBanner(null);
    setConfirmingResetTab(null);
  };

  // ==================== 1. STRING LIST CRUD (CATEGORIES / ORIGINS / OUTCOMES) ====================
  const getActiveStringList = (): string[] => {
    if (activeTab === 'CATEGORIES') return config.categories;
    if (activeTab === 'ORIGINS') return config.origins;
    return config.outcomes;
  };

  const getActiveStringLabel = (): string => {
    if (activeTab === 'CATEGORIES') return 'Task Category';
    if (activeTab === 'ORIGINS') return 'Task Origin';
    return 'Regulatory Outcome';
  };

  const updateStringListInConfig = (nextList: string[]): SystemConfigData => {
    if (activeTab === 'CATEGORIES') return { ...config, categories: nextList };
    if (activeTab === 'ORIGINS') return { ...config, origins: nextList };
    return { ...config, outcomes: nextList };
  };

  const handleAddStringItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = newStringItem.trim();
    const label = getActiveStringLabel();
    if (!val) {
      setErrorBanner(`Please enter a ${label.toLowerCase()} name.`);
      return;
    }

    const currentList = getActiveStringList();
    if (currentList.some((item) => item.toLowerCase() === val.toLowerCase())) {
      setErrorBanner(`"${val}" already exists in the ${label} list.`);
      return;
    }

    const nextList = [...currentList, val];
    setNewStringItem('');
    await persistConfigUpdate(
      updateStringListInConfig(nextList),
      `Added new ${label}: "${val}".`
    );
  };

  const handleSaveEditedStringItem = async (index: number) => {
    const val = editingTextValue.trim();
    const label = getActiveStringLabel();
    if (!val) {
      setErrorBanner(`${label} name cannot be empty.`);
      return;
    }

    const currentList = getActiveStringList();
    const oldVal = currentList[index];
    if (
      currentList.some(
        (item, idx) => idx !== index && item.toLowerCase() === val.toLowerCase()
      )
    ) {
      setErrorBanner(`"${val}" already exists in the ${label} list.`);
      return;
    }

    const nextList = currentList.map((item, idx) => (idx === index ? val : item));
    setEditingIndex(null);
    setEditingTextValue('');
    await persistConfigUpdate(
      updateStringListInConfig(nextList),
      `Updated ${label} from "${oldVal}" to "${val}".`
    );
  };

  const handleDeleteStringItem = async (index: number) => {
    const currentList = getActiveStringList();
    const label = getActiveStringLabel();
    if (currentList.length <= 1) {
      setErrorBanner(`At least one ${label.toLowerCase()} must remain configured.`);
      return;
    }
    const target = currentList[index];
    const nextList = currentList.filter((_, idx) => idx !== index);
    await persistConfigUpdate(
      updateStringListInConfig(nextList),
      `Deleted ${label}: "${target}".`
    );
  };

  // ==================== 2. STAFF POSITIONS CRUD ====================
  const handleAddPosition = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newPosTitle.trim();
    if (!title) {
      setErrorBanner('Please enter a staff position title.');
      return;
    }
    if (config.positions.some((p) => p.title.toLowerCase() === title.toLowerCase())) {
      setErrorBanner(`Staff position "${title}" already exists.`);
      return;
    }

    const nextPositions: StaffPositionConfigItem[] = [
      ...config.positions,
      {
        title,
        defaultRole: newPosRole,
        selfRegisterAllowed: newPosAllowSelfReg,
      },
    ];
    setNewPosTitle('');
    setNewPosRole('STANDARD');
    setNewPosAllowSelfReg(true);

    await persistConfigUpdate(
      { ...config, positions: nextPositions },
      `Added staff position "${title}" mapped to ${newPosRole}.`
    );
  };

  const handleSaveEditedPosition = async (index: number) => {
    if (!editingPosition || !editingPosition.title.trim()) {
      setErrorBanner('Staff position title cannot be empty.');
      return;
    }
    const cleanTitle = editingPosition.title.trim();
    if (
      config.positions.some(
        (p, idx) => idx !== index && p.title.toLowerCase() === cleanTitle.toLowerCase()
      )
    ) {
      setErrorBanner(`Another position with title "${cleanTitle}" already exists.`);
      return;
    }

    const nextPositions = config.positions.map((p, idx) =>
      idx === index ? { ...editingPosition, title: cleanTitle } : p
    );
    setEditingIndex(null);
    setEditingPosition(null);
    await persistConfigUpdate(
      { ...config, positions: nextPositions },
      `Updated staff position "${cleanTitle}" (Role: ${editingPosition.defaultRole}).`
    );
  };

  const handleDeletePosition = async (index: number) => {
    if (config.positions.length <= 1) {
      setErrorBanner('At least one staff position must remain configured.');
      return;
    }
    const target = config.positions[index];
    const nextPositions = config.positions.filter((_, idx) => idx !== index);
    await persistConfigUpdate(
      { ...config, positions: nextPositions },
      `Removed staff position "${target.title}".`
    );
  };

  // ==================== 3. REGIONS & OFFICES CRUD ====================
  const handleAddOffice = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = newOfficeCode.trim();
    const name = newOfficeName.trim() || code;
    const shortLabel = newOfficeShortLabel.trim() || code;
    const coverage = newOfficeCoverage.trim() || 'Designated Regional / Operational Coverage';

    if (!code) {
      setErrorBanner('Please enter an Office / Region Code (e.g., Region NIR or FROO-CSU).');
      return;
    }

    if (
      config.offices.some(
        (o) =>
          o.code.toLowerCase() === code.toLowerCase() ||
          o.name.toLowerCase() === name.toLowerCase()
      )
    ) {
      setErrorBanner(`An office with code "${code}" or name "${name}" already exists.`);
      return;
    }

    const newOffice: FrooOffice = {
      id: `off-${code.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`,
      code,
      name,
      shortLabel,
      coverage,
      defaultPersonnel: [name],
    };

    const nextOffices = [...config.offices, newOffice];
    setNewOfficeCode('');
    setNewOfficeName('');
    setNewOfficeShortLabel('');
    setNewOfficeCoverage('');

    await persistConfigUpdate(
      { ...config, offices: nextOffices },
      `Added new FROO Region/Office: "${name}" (${code}).`
    );
  };

  const handleSaveEditedOffice = async (index: number) => {
    if (!editingOffice || !editingOffice.code.trim() || !editingOffice.name.trim()) {
      setErrorBanner('Office code and full name are required.');
      return;
    }
    const cleanCode = editingOffice.code.trim();
    const cleanName = editingOffice.name.trim();
    const cleanShort = editingOffice.shortLabel.trim() || cleanCode;
    const cleanCoverage = editingOffice.coverage.trim();

    const nextOffices = config.offices.map((o, idx) =>
      idx === index
        ? {
            ...editingOffice,
            code: cleanCode,
            name: cleanName,
            shortLabel: cleanShort,
            coverage: cleanCoverage,
          }
        : o
    );
    setEditingIndex(null);
    setEditingOffice(null);
    await persistConfigUpdate(
      { ...config, offices: nextOffices },
      `Updated office directory entry: "${cleanName}" (${cleanCode}).`
    );
  };

  const handleDeleteOffice = async (index: number) => {
    const target = config.offices[index];
    if (target.code === 'ODDG-FROO') {
      setErrorBanner('The central ODDG-FROO headquarters office cannot be deleted.');
      return;
    }
    const nextOffices = config.offices.filter((_, idx) => idx !== index);
    await persistConfigUpdate(
      { ...config, offices: nextOffices },
      `Removed office "${target.name}" (${target.code}) from directory.`
    );
  };

  // ==================== 4. RESET SECTION TO DEFAULTS ====================
  const handleResetSection = async (tab: ConfigTabKey) => {
    const defaults = getDefaultSystemConfig();
    setConfirmingResetTab(null);
    if (tab === 'CATEGORIES') {
      await persistConfigUpdate(
        { ...config, categories: defaults.categories },
        'Reset Task Categories to official FROO defaults.'
      );
    } else if (tab === 'ORIGINS') {
      await persistConfigUpdate(
        { ...config, origins: defaults.origins },
        'Reset Task Origins to official FROO defaults.'
      );
    } else if (tab === 'POSITIONS') {
      await persistConfigUpdate(
        { ...config, positions: defaults.positions },
        'Reset Staff Positions & Role Mapping to official FROO defaults.'
      );
    } else if (tab === 'OUTCOMES') {
      await persistConfigUpdate(
        { ...config, outcomes: defaults.outcomes },
        'Reset Regulatory Outcomes to official FROO defaults.'
      );
    } else if (tab === 'OFFICES') {
      await persistConfigUpdate(
        { ...config, offices: defaults.offices },
        'Reset Regions & Offices directory to official FROO defaults.'
      );
    }
  };

  return (
    <div className="space-y-5 font-sans">
      {/* Top Banner Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-purple-100 text-purple-900 border border-purple-200">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
              <span>Superadmin Live CRUD Control</span>
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              • Changes take effect immediately across the website
            </span>
          </div>

          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#056839]" />
            <span>System Configuration &amp; Dropdown Lists</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-3xl leading-relaxed">
            Dynamically add, rename, or remove Task Categories, Task Origins, Staff Account Positions, Regulatory Outcomes, and Regional Offices without modifying source code.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {confirmingResetTab === activeTab ? (
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
              <span className="text-[11px] font-semibold text-amber-900">
                Restore default list?
              </span>
              <button
                type="button"
                onClick={() => setConfirmingResetTab(null)}
                className="px-2 py-1 text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 rounded-md cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleResetSection(activeTab)}
                className="px-2.5 py-1 text-[11px] font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-md cursor-pointer"
              >
                Confirm Reset
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingResetTab(activeTab)}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
              title="Restore current tab to default items"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset Section to Defaults</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Navigation Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <button
          type="button"
          onClick={() => handleSelectTab('CATEGORIES')}
          className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
            activeTab === 'CATEGORIES'
              ? 'bg-[#056839] text-white border-[#056839] shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-bold truncate">
              <Tag className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Task Categories</span>
            </div>
            <div
              className={`text-[11px] mt-0.5 ${
                activeTab === 'CATEGORIES' ? 'text-emerald-100' : 'text-slate-400'
              }`}
            >
              {config.categories.length} items
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleSelectTab('ORIGINS')}
          className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
            activeTab === 'ORIGINS'
              ? 'bg-[#056839] text-white border-[#056839] shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-bold truncate">
              <Compass className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Task Origins</span>
            </div>
            <div
              className={`text-[11px] mt-0.5 ${
                activeTab === 'ORIGINS' ? 'text-emerald-100' : 'text-slate-400'
              }`}
            >
              {config.origins.length} items
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleSelectTab('POSITIONS')}
          className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
            activeTab === 'POSITIONS'
              ? 'bg-[#056839] text-white border-[#056839] shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-bold truncate">
              <Briefcase className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Staff Positions</span>
            </div>
            <div
              className={`text-[11px] mt-0.5 ${
                activeTab === 'POSITIONS' ? 'text-emerald-100' : 'text-slate-400'
              }`}
            >
              {config.positions.length} positions
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleSelectTab('OUTCOMES')}
          className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
            activeTab === 'OUTCOMES'
              ? 'bg-[#056839] text-white border-[#056839] shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-bold truncate">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Task Outcomes</span>
            </div>
            <div
              className={`text-[11px] mt-0.5 ${
                activeTab === 'OUTCOMES' ? 'text-emerald-100' : 'text-slate-400'
              }`}
            >
              {config.outcomes.length} items
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleSelectTab('OFFICES')}
          className={`col-span-2 sm:col-span-1 p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
            activeTab === 'OFFICES'
              ? 'bg-[#056839] text-white border-[#056839] shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-bold truncate">
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Regions &amp; Offices</span>
            </div>
            <div
              className={`text-[11px] mt-0.5 ${
                activeTab === 'OFFICES' ? 'text-emerald-100' : 'text-slate-400'
              }`}
            >
              {config.offices.length} offices
            </div>
          </div>
        </button>
      </div>

      {errorBanner && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{errorBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorBanner(null)}
            className="text-rose-500 hover:text-rose-800 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ==================== TAB CONTENT: CATEGORIES / ORIGINS / OUTCOMES ==================== */}
      {(activeTab === 'CATEGORIES' || activeTab === 'ORIGINS' || activeTab === 'OUTCOMES') && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70">
            <form onSubmit={handleAddStringItem} className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={newStringItem}
                onChange={(e) => setNewStringItem(e.target.value)}
                placeholder={`Enter new ${getActiveStringLabel()} name (e.g., ${
                  activeTab === 'CATEGORIES'
                    ? 'Post-Marketing Surveillance'
                    : activeTab === 'ORIGINS'
                    ? 'CDRR / CDRRHR Referral'
                    : 'Referred to Legal Service'
                })...`}
                className="flex-1 text-xs bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#056839]"
              />
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2.5 text-xs font-bold text-white bg-[#056839] hover:bg-[#04522d] rounded-xl shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add {getActiveStringLabel()}</span>
              </button>
            </form>
          </div>

          <div className="divide-y divide-slate-100">
            {getActiveStringList().map((item, idx) => (
              <div
                key={`${item}-${idx}`}
                className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition"
              >
                {editingIndex === idx ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={editingTextValue}
                      onChange={(e) => setEditingTextValue(e.target.value)}
                      className="flex-1 text-xs border border-[#056839] rounded-lg px-3 py-1.5 focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveEditedStringItem(idx)}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-[#056839] hover:bg-[#04522d] rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Save</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingIndex(null);
                        setEditingTextValue('');
                      }}
                      className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-md bg-emerald-50 text-[#056839] border border-emerald-200 text-[11px] font-bold flex items-center justify-center shrink-0 tabular-nums">
                        {idx + 1}
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-slate-800 truncate">
                        {item}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingIndex(idx);
                          setEditingTextValue(item);
                        }}
                        className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Rename</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteStringItem(idx)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition cursor-pointer"
                        title={`Delete ${item}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== TAB CONTENT: STAFF POSITIONS ==================== */}
      {activeTab === 'POSITIONS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70">
            <form onSubmit={handleAddPosition} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-5">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  New Staff Position Title *
                </label>
                <input
                  type="text"
                  value={newPosTitle}
                  onChange={(e) => setNewPosTitle(e.target.value)}
                  placeholder="e.g., Health Program Officer II or Legal Assistant"
                  className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#056839]"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Mapped RBAC Access Role *
                </label>
                <select
                  value={newPosRole}
                  onChange={(e) =>
                    setNewPosRole(
                      e.target.value as Exclude<UserRole, 'SUPERADMIN' | 'RANK_AND_FILE'>
                    )
                  }
                  className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#056839]"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3 flex flex-col gap-2">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newPosAllowSelfReg}
                    onChange={(e) => setNewPosAllowSelfReg(e.target.checked)}
                    className="rounded border-slate-300 text-[#056839] focus:ring-[#056839]"
                  />
                  <span>Show on Self-Registration</span>
                </label>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full px-4 py-2.5 text-xs font-bold text-white bg-[#056839] hover:bg-[#04522d] rounded-xl shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Staff Position</span>
                </button>
              </div>
            </form>
          </div>

          <div className="divide-y divide-slate-100">
            {config.positions.map((pos, idx) => (
              <div
                key={`${pos.title}-${idx}`}
                className="px-4 sm:px-5 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50/80 transition"
              >
                {editingIndex === idx && editingPosition ? (
                  <div className="w-full grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                    <div className="sm:col-span-5">
                      <input
                        type="text"
                        value={editingPosition.title}
                        onChange={(e) =>
                          setEditingPosition({ ...editingPosition, title: e.target.value })
                        }
                        className="w-full text-xs border border-[#056839] rounded-lg px-3 py-2"
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <select
                        value={editingPosition.defaultRole}
                        onChange={(e) =>
                          setEditingPosition({
                            ...editingPosition,
                            defaultRole: e.target.value as Exclude<
                              UserRole,
                              'SUPERADMIN' | 'RANK_AND_FILE'
                            >,
                          })
                        }
                        className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2"
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-3 flex items-center justify-between sm:justify-end gap-2">
                      <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingPosition.selfRegisterAllowed}
                          onChange={(e) =>
                            setEditingPosition({
                              ...editingPosition,
                              selfRegisterAllowed: e.target.checked,
                            })
                          }
                          className="rounded border-slate-300 text-[#056839]"
                        />
                        <span>Self-Reg</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleSaveEditedPosition(idx)}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-[#056839] rounded-lg cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingIndex(null);
                          setEditingPosition(null);
                        }}
                        className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-slate-900">
                          {pos.title}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-[#056839] border border-emerald-200">
                          Role: {pos.defaultRole}
                        </span>
                        {pos.selfRegisterAllowed ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            Visible on Self-Registration &amp; Admin Provisioning
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            Admin Provisioning Only
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingIndex(idx);
                          setEditingPosition({ ...pos });
                        }}
                        className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePosition(idx)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition cursor-pointer"
                        title={`Delete ${pos.title}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== TAB CONTENT: REGIONS & OFFICES ==================== */}
      {activeTab === 'OFFICES' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70">
            <form onSubmit={handleAddOffice} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Office Code *
                </label>
                <input
                  type="text"
                  value={newOfficeCode}
                  onChange={(e) => setNewOfficeCode(e.target.value)}
                  placeholder="e.g., Region NIR"
                  className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#056839]"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Official Office Name *
                </label>
                <input
                  type="text"
                  value={newOfficeName}
                  onChange={(e) => setNewOfficeName(e.target.value)}
                  placeholder="e.g., Region NIR (Negros Island)"
                  className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#056839]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Short Label
                </label>
                <input
                  type="text"
                  value={newOfficeShortLabel}
                  onChange={(e) => setNewOfficeShortLabel(e.target.value)}
                  placeholder="e.g., Region NIR"
                  className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#056839]"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Jurisdiction / Coverage Area
                </label>
                <input
                  type="text"
                  value={newOfficeCoverage}
                  onChange={(e) => setNewOfficeCoverage(e.target.value)}
                  placeholder="e.g., Negros Occidental & Oriental"
                  className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#056839]"
                />
              </div>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full px-3 py-2.5 text-xs font-bold text-white bg-[#056839] hover:bg-[#04522d] rounded-xl shadow-2xs flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Office</span>
                </button>
              </div>
            </form>
          </div>

          <div className="divide-y divide-slate-100">
            {config.offices.map((office, idx) => (
              <div
                key={office.id}
                className="px-4 sm:px-5 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50/80 transition"
              >
                {editingIndex === idx && editingOffice ? (
                  <div className="w-full grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        value={editingOffice.code}
                        onChange={(e) =>
                          setEditingOffice({ ...editingOffice, code: e.target.value })
                        }
                        placeholder="Code"
                        className="w-full text-xs border border-[#056839] rounded-lg px-2.5 py-1.5"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <input
                        type="text"
                        value={editingOffice.name}
                        onChange={(e) =>
                          setEditingOffice({ ...editingOffice, name: e.target.value })
                        }
                        placeholder="Full Name"
                        className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        value={editingOffice.shortLabel}
                        onChange={(e) =>
                          setEditingOffice({ ...editingOffice, shortLabel: e.target.value })
                        }
                        placeholder="Short Label"
                        className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <input
                        type="text"
                        value={editingOffice.coverage}
                        onChange={(e) =>
                          setEditingOffice({ ...editingOffice, coverage: e.target.value })
                        }
                        placeholder="Coverage"
                        className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5"
                      />
                    </div>
                    <div className="sm:col-span-2 flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSaveEditedOffice(idx)}
                        className="px-2.5 py-1.5 text-xs font-bold text-white bg-[#056839] rounded-lg cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingIndex(null);
                          setEditingOffice(null);
                        }}
                        className="px-2 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-slate-900">
                          {office.name}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          Code: {office.code}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-[#056839] border border-emerald-200">
                          Label: {office.shortLabel}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">{office.coverage}</div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingIndex(idx);
                          setEditingOffice({ ...office });
                        }}
                        className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Edit</span>
                      </button>
                      {office.code !== 'ODDG-FROO' && (
                        <button
                          type="button"
                          onClick={() => handleDeleteOffice(idx)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition cursor-pointer"
                          title={`Remove ${office.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
