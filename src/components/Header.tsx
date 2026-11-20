import React, { useState, useEffect } from 'react';
import {
  Plus,
  Building2,
  BarChart3,
  Download,
  ShieldCheck,
  Users,
  LogOut,
  Lock,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import { UserAccount } from '../types/auth';

interface HeaderProps {
  onCreateTask: () => void;
  currentUser: UserAccount | null;
  onLogout: () => void;
  onOpenUserManagement: () => void;
  onOpenSystemLogs: () => void;
  onOpenRegionalOverview: () => void;
  onExportCsv: () => void;
  selectedRegionFilter: string;
  onSelectRegionFilter: (region: string) => void;
  allowedRegions?: string[];
  scopeLabel?: string;
  allStaffUsers?: UserAccount[];
  onSwitchUser?: (targetUser: UserAccount) => void;
  onOpenChangePassword?: () => void;
  dbStatus?: 'connecting' | 'online' | 'offline';
}

export const Header: React.FC<HeaderProps> = ({
  onCreateTask,
  currentUser,
  onLogout,
  onOpenUserManagement,
  onOpenSystemLogs,
  onOpenRegionalOverview,
  onExportCsv,
  selectedRegionFilter,
  onSelectRegionFilter,
  scopeLabel,
  allStaffUsers = [],
  onOpenChangePassword,
  dbStatus = 'offline',
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isAdminOrSuper = currentUser?.role === 'SUPERADMIN' || currentUser?.role === 'ADMIN';
  const pendingUsersCount = allStaffUsers.filter((u) => u.status === 'pending').length;

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isMobileMenuOpen]);

  const runMobileMenuAction = (action: () => void) => {
    setIsMobileMenuOpen(false);
    action();
  };

  return (
    <>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs font-sans">
        {/* ================= MOBILE COMPACT TOP BAR (< 768px) ================= */}
        <div className="md:hidden bg-gradient-to-r from-emerald-950 via-[#056839] to-emerald-950 text-white px-3.5 h-[54px] flex items-center justify-between gap-2 pt-safe">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center p-0.5 overflow-hidden shadow-xs border border-emerald-300/80 shrink-0">
              <img
                src="/assets/aistudio/FDA-Web-Logo-150x150-1_975a7f7f.png"
                alt="FDA Philippines Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <div className="text-[14px] font-bold tracking-tight text-white truncate leading-tight">
                FROO Tracker
              </div>
              <div className="text-[10.5px] text-emerald-200/90 truncate leading-tight">
                {currentUser ? `${currentUser.office} · ${currentUser.firstName}` : 'FDA Philippines'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open menu"
              className="relative min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-white hover:bg-white/10 active:bg-white/15 transition cursor-pointer"
            >
              <Menu className="w-5 h-5" />
              {isAdminOrSuper && pendingUsersCount > 0 && (
                <span className="absolute top-2 right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-amber-400 text-emerald-950 text-[9.5px] font-extrabold flex items-center justify-center leading-none">
                  {pendingUsersCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ================= DESKTOP HEADER (>= 768px — UNCHANGED) ================= */}
        <div className="hidden md:block">
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

            {/* User Account & Database Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Database Connectivity Indicator */}
              <div
                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium border ${
                  dbStatus === 'online'
                    ? 'bg-emerald-900/80 text-emerald-200 border-emerald-500/50'
                    : 'bg-emerald-950/60 text-emerald-300/80 border-emerald-700/50'
                }`}
                title={
                  dbStatus === 'online'
                    ? 'Connected to Express API & MySQL Database (froo_db on port 3307)'
                    : 'Running in Local Storage Mode (Express API offline). Start Docker MySQL and run "npm run server" for live DB.'
                }
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    dbStatus === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span>{dbStatus === 'online' ? 'MySQL Live' : 'Local Mode'}</span>
              </div>

              {currentUser ? (
                <>
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
                      {currentUser.firstName} {currentUser.middleInitial ? `${currentUser.middleInitial} ` : ''}
                      {currentUser.lastName}
                    </span>

                    <span className="text-[11px] text-emerald-300 hidden sm:inline">
                      • {currentUser.position} ({currentUser.office})
                    </span>
                  </div>

                  {/* Change Password Button */}
                  {onOpenChangePassword && (
                    <button
                      onClick={onOpenChangePassword}
                      className="flex items-center gap-1 text-emerald-200 hover:text-white px-2.5 py-1 text-xs bg-emerald-900/60 hover:bg-emerald-800/80 border border-emerald-700/60 rounded-lg transition cursor-pointer"
                      title="Change your account password"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Change Password</span>
                    </button>
                  )}

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
                  Create, assign, monitor and manage operational tasks across FROO.
                </p>
              </div>

              {/* Right Action buttons */}
              <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                {isAdminOrSuper && (
                  <>
                    <button
                      onClick={onOpenUserManagement}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition cursor-pointer relative"
                      title="Manage Staff Accounts"
                    >
                      <Users className="w-3.5 h-3.5 text-[#056839]" />
                      <span>Users & Access</span>
                      {pendingUsersCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold animate-pulse leading-none">
                          {pendingUsersCount}
                        </span>
                      )}
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
                    All Regions/Offices
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
                  <span className="text-[11px] text-slate-500 ml-1">({scopeLabel})</span>
                )}
              </div>

              <div className="text-slate-400 text-xs hidden sm:block">
                {currentUser ? (
                  <span>
                    Authenticated as{' '}
                    <strong className="text-slate-700">
                      {currentUser.firstName} {currentUser.lastName}
                    </strong>{' '}
                    ({currentUser.email})
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ================= MOBILE SLIDE-OUT MENU DRAWER (< 768px) ================= */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/55 backdrop-blur-2xs animate-in fade-in duration-150"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer Panel */}
          <aside className="relative z-10 w-[86vw] max-w-[320px] h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="px-4 py-4 bg-gradient-to-r from-emerald-950 via-[#056839] to-emerald-950 text-white flex items-center justify-between gap-2 pt-safe">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-white p-0.5 flex items-center justify-center shrink-0">
                  <img
                    src="/assets/aistudio/FDA-Web-Logo-150x150-1_975a7f7f.png"
                    alt="FDA Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold leading-tight truncate">FDA FROO Portal</div>
                  <div className="text-[11px] text-emerald-200 truncate">
                    {dbStatus === 'online' ? 'MySQL Live' : 'Local Mode'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Close menu"
                className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center text-emerald-100 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Current User Profile Card */}
              {currentUser && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-slate-900 leading-snug">
                      {currentUser.firstName}{' '}
                      {currentUser.middleInitial ? `${currentUser.middleInitial} ` : ''}
                      {currentUser.lastName}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-[#056839] shrink-0">
                      {currentUser.role === 'RANK_AND_FILE' ? 'STANDARD' : currentUser.role}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 font-medium">{currentUser.position}</div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#056839] shrink-0" />
                    <span className="truncate">{currentUser.office}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">{currentUser.email}</div>
                </div>
              )}

              {/* Jurisdiction Quick Scope */}
              {(isAdminOrSuper || (currentUser && currentUser.office !== 'ODDG-FROO')) && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                    Jurisdiction Scope
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {isAdminOrSuper && (
                      <button
                        type="button"
                        onClick={() => runMobileMenuAction(() => onSelectRegionFilter('All'))}
                        className={`w-full min-h-[44px] px-3.5 py-2 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition cursor-pointer border ${
                          selectedRegionFilter === 'All'
                            ? 'bg-emerald-50 text-[#056839] border-emerald-200'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span>All Regions / Offices</span>
                        {selectedRegionFilter === 'All' && (
                          <span className="text-[10px] font-bold uppercase text-[#056839]">Active</span>
                        )}
                      </button>
                    )}

                    {currentUser && currentUser.office !== 'ODDG-FROO' && (
                      <button
                        type="button"
                        onClick={() =>
                          runMobileMenuAction(() => onSelectRegionFilter(currentUser.office))
                        }
                        className={`w-full min-h-[44px] px-3.5 py-2 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition cursor-pointer border ${
                          selectedRegionFilter === currentUser.office
                            ? 'bg-emerald-50 text-[#056839] border-emerald-200'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span className="truncate">My Office: {currentUser.office}</span>
                        {selectedRegionFilter === currentUser.office && (
                          <span className="text-[10px] font-bold uppercase text-[#056839] shrink-0">
                            Active
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Workspace & Admin Tools */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  Tools & Controls
                </div>

                {isAdminOrSuper && (
                  <button
                    type="button"
                    onClick={() => runMobileMenuAction(onOpenUserManagement)}
                    className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-800 transition cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      <Users className="w-4 h-4 text-[#056839]" />
                      <span>Users & Access</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      {pendingUsersCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10.5px] font-bold tabular-nums">
                          {pendingUsersCount} pending
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </span>
                  </button>
                )}

                {isAdminOrSuper && (
                  <button
                    type="button"
                    onClick={() => runMobileMenuAction(onOpenSystemLogs)}
                    className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-800 transition cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                      <span>System Audit Logs</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => runMobileMenuAction(onOpenRegionalOverview)}
                  className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-800 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <BarChart3 className="w-4 h-4 text-slate-600" />
                    <span>Regional Workload</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => runMobileMenuAction(onExportCsv)}
                  className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-800 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Download className="w-4 h-4 text-slate-600" />
                    <span>Export Tasks to CSV</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                {onOpenChangePassword && (
                  <button
                    type="button"
                    onClick={() => runMobileMenuAction(onOpenChangePassword)}
                    className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-800 transition cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      <Lock className="w-4 h-4 text-slate-600" />
                      <span>Change Password</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                )}
              </div>
            </div>

            {/* Sticky Bottom Sign Out */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 pb-safe">
              <button
                type="button"
                onClick={() => runMobileMenuAction(onLogout)}
                className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};
