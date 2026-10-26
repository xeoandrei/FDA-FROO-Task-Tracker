import React from 'react';
import {
  Plus,
  Building2,
  UserCheck,
  BarChart3,
  Download,
  RotateCcw,
  ShieldCheck,
  Users,
  FileSpreadsheet,
  LogOut,
  ChevronDown,
  Sparkles,
  Lock,
} from 'lucide-react';
import { FrooOffice, FrooUserPersona } from '../types/task';
import { UserAccount } from '../types/auth';
import { FROO_OFFICES } from '../data/offices';

interface HeaderProps {
  onCreateTask: () => void;
  currentUser: UserAccount | null;
  onLogout: () => void;
  onOpenUserManagement: () => void;
  onOpenSystemLogs: () => void;
  onOpenRegionalOverview: () => void;
  onExportCsv: () => void;
  onResetData: () => void;
  selectedRegionFilter: string;
  onSelectRegionFilter: (region: string) => void;
  allowedRegions?: string[];
  scopeLabel?: string;
  allStaffUsers?: UserAccount[];
  onSwitchUser?: (targetUser: UserAccount) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onCreateTask,
  currentUser,
  onLogout,
  onOpenUserManagement,
  onOpenSystemLogs,
  onOpenRegionalOverview,
  onExportCsv,
  onResetData,
  selectedRegionFilter,
  onSelectRegionFilter,
  allowedRegions,
  scopeLabel,
  allStaffUsers = [],
  onSwitchUser,
}) => {
  const isAdminOrSuper = currentUser?.role === 'SUPERADMIN' || currentUser?.role === 'ADMIN';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs font-sans">
      {/* Top Official FDA Green Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-[#056839] to-emerald-950 text-white text-xs px-4 sm:px-8 py-2 flex flex-wrap items-center justify-between gap-3 border-b border-emerald-800/40">
        <div className="flex items-center gap-2.5 font-medium tracking-wide">
          {/* Official FDA Circular Logo */}
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center p-0.5 overflow-hidden shadow-xs border border-emerald-300/80 shrink-0">
            <img
              src="/assets/aistudio/FDA-Web-Logo-150x150-1_975a7f7f.png"
              alt="FDA Philippines Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-emerald-50 font-semibold tracking-tight text-[13px]">
            Food and Drug Administration
          </span>
          <span className="text-emerald-300/60">•</span>
          <span className="text-amber-300 font-medium tracking-tight">
            Field Regulatory Operations Office (FROO)
          </span>
        </div>

        {/* User Account Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {currentUser ? (
            <>
              {/* Quick Persona Switcher for easy testing */}
              {allStaffUsers.length > 0 && onSwitchUser && (
                <div className="hidden lg:flex items-center gap-1.5 text-xs text-emerald-200 mr-2">
                  <span className="text-[11px] text-emerald-300/80">Switch Demo Staff:</span>
                  <select
                    value={currentUser.id}
                    onChange={(e) => {
                      const target = allStaffUsers.find((u) => u.id === e.target.value);
                      if (target) onSwitchUser(target);
                    }}
                    className="bg-emerald-950/80 text-white text-[11px] border border-emerald-700/60 rounded px-2 py-0.5 focus:outline-none cursor-pointer"
                  >
                    {allStaffUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.firstName} {u.lastName} ({u.role} - {u.office})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* User details badge */}
              <div className="flex items-center gap-2 bg-emerald-950/90 border border-emerald-700/70 rounded-lg px-2.5 py-1 text-xs text-white">
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                    currentUser.role === 'SUPERADMIN'
                      ? 'bg-purple-900 text-purple-200 border border-purple-600'
                      : currentUser.role === 'ADMIN'
                      ? 'bg-blue-900 text-blue-200 border border-blue-600'
                      : currentUser.role === 'CLUSTER_DIRECTOR'
                      ? 'bg-emerald-800 text-emerald-100'
                      : currentUser.role === 'REGIONAL_SUPERVISOR'
                      ? 'bg-teal-900 text-teal-200'
                      : 'bg-slate-800 text-slate-200'
                  }`}
                >
                  {currentUser.role}
                </span>

                <span className="font-semibold text-white">
                  {currentUser.firstName} {currentUser.lastName}
                </span>

                <span className="text-[11px] text-emerald-300 hidden sm:inline">
                  • {currentUser.position} ({currentUser.office})
                </span>
              </div>

              {/* Sign Out Button */}
              <button
                onClick={onLogout}
                className="flex items-center gap-1 text-emerald-200 hover:text-white px-2 py-1 text-xs hover:bg-white/10 rounded transition cursor-pointer"
                title="Sign out of system"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </>
          ) : null}

          {/* Reset Demo Data button */}
          <button
            onClick={onResetData}
            className="flex items-center gap-1 text-emerald-200 hover:text-white px-2 py-1 text-xs hover:bg-white/10 rounded transition cursor-pointer ml-1"
            title="Reset default operational tasks"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden xl:inline">Reset Tasks</span>
          </button>
        </div>
      </div>

      {/* Main Bar with Navigation & Primary Action */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
                Field Regulatory Operations Office Tracker
              </h1>
              <span className="bg-emerald-100 text-[#056839] text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                Official
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">
              Create, assign, monitor and manage operational tasks across the Food and Drug Regulatory Operations Office and Regional Field Offices.
            </p>
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {isAdminOrSuper && (
              <>
                <button
                  onClick={onOpenUserManagement}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition cursor-pointer"
                  title="Manage Staff Accounts"
                >
                  <Users className="w-3.5 h-3.5 text-[#056839]" />
                  <span>Users & Access</span>
                </button>

                <button
                  onClick={onOpenSystemLogs}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition cursor-pointer"
                  title="View Global System Audit Trail"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Audit Logs</span>
                </button>
              </>
            )}

            <button
              onClick={onOpenRegionalOverview}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition cursor-pointer"
              title="Regional Workload Distribution"
            >
              <BarChart3 className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Regional Workload</span>
            </button>

            <button
              onClick={onExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition cursor-pointer"
              title="Export filtered tasks to CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <button
              onClick={onCreateTask}
              className="inline-flex items-center justify-center gap-2 bg-[#056839] hover:bg-[#04522d] text-white font-semibold px-4 py-2 rounded-lg shadow-xs transition hover:shadow focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 active:scale-[0.99] cursor-pointer text-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Create Task</span>
            </button>
          </div>
        </div>

        {/* Office Quick-Filter Strip */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-600 flex-wrap">
            <span className="font-semibold text-slate-700">Jurisdiction View:</span>

            {/* Quick scope buttons based on permissions */}
            {isAdminOrSuper ? (
              <button
                onClick={() => onSelectRegionFilter('All')}
                className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                  selectedRegionFilter === 'All'
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-200 font-semibold'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                All Offices (17)
              </button>
            ) : null}

            {currentUser && currentUser.office !== 'ODDG-FROO' && (
              <button
                onClick={() => onSelectRegionFilter(currentUser.office)}
                className={`px-2.5 py-1 rounded-md font-medium transition flex items-center gap-1 cursor-pointer ${
                  selectedRegionFilter === currentUser.office
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-200 font-semibold'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                <Building2 className="w-3 h-3 text-[#056839]" />
                <span>My Jurisdiction: {currentUser.office}</span>
              </button>
            )}

            {scopeLabel && (
              <span className="text-[11px] text-slate-500 ml-1">
                ({scopeLabel})
              </span>
            )}
          </div>

          <div className="text-slate-400 text-xs hidden sm:block">
            {currentUser ? (
              <span>
                Authenticated as <strong className="text-slate-700">{currentUser.firstName} {currentUser.lastName}</strong> ({currentUser.email})
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
};
