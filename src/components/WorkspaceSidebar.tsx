import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  FileSpreadsheet,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
} from 'lucide-react';
import { WorkspaceModuleType, FisConnectionMode } from '../types/doctrack';

interface WorkspaceSidebarProps {
  activeModule: WorkspaceModuleType;
  onSelectModule: (module: WorkspaceModuleType) => void;
  totalTasksCount: number;
  tasksToReceiveCount: number;
  fisConnectionMode?: FisConnectionMode;
  isSuperAdmin?: boolean;
}

const SIDEBAR_COLLAPSED_KEY = 'froo_workspace_sidebar_collapsed_v1';

export const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = ({
  activeModule,
  onSelectModule,
  totalTasksCount,
  tasksToReceiveCount,
  isSuperAdmin = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isCollapsed));
    } catch {
      // Ignore storage error
    }
  }, [isCollapsed]);

  return (
    <aside
      className={`hidden md:flex flex-col shrink-0 self-start sticky top-6 mt-6 ml-4 lg:ml-6 bg-white rounded-xl border border-slate-200 shadow-xs transition-all duration-200 select-none overflow-hidden ${
        isCollapsed ? 'w-[68px]' : 'w-60'
      }`}
    >
      {/* Top Workspace Section Header */}
      <div className="px-3.5 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
        {!isCollapsed && (
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">
            FROO Workspaces
          </span>
        )}
        <button
          type="button"
          onClick={() => setIsCollapsed((prev) => !prev)}
          className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer ${
            isCollapsed ? 'mx-auto' : ''
          }`}
          title={isCollapsed ? 'Expand workspace sidebar' : 'Collapse workspace sidebar'}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Primary Workspace Navigation (Fits tightly to items with zero empty bottom space) */}
      <nav className="p-2.5 space-y-1.5">
        {/* 1. Operational Task Tracker */}
        <button
          type="button"
          onClick={() => onSelectModule('TASKS')}
          title="Task Tracker"
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-semibold transition cursor-pointer border ${
            activeModule === 'TASKS'
              ? 'bg-emerald-50/90 text-[#056839] border-emerald-200 shadow-2xs'
              : 'bg-white text-slate-700 border-transparent hover:bg-slate-50 hover:text-slate-900'
          } ${isCollapsed ? 'justify-center px-0' : ''}`}
        >
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              activeModule === 'TASKS'
                ? 'bg-[#056839] text-white'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
          </div>

          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1.5">
                <span className="truncate font-bold">Task Tracker</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold tabular-nums ${
                    activeModule === 'TASKS'
                      ? 'bg-emerald-100 text-[#056839]'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {totalTasksCount}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-normal truncate mt-0.5">
                {tasksToReceiveCount > 0
                  ? `${tasksToReceiveCount} awaiting receipt`
                  : 'Tasks & Dispatch Slips'}
              </div>
            </div>
          )}
        </button>

        {/* 2. DTN Integration (Bulk Upload) */}
        <button
          type="button"
          onClick={() => onSelectModule('FIS_DOCTRACK')}
          title="DTN Integration"
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-semibold transition cursor-pointer border ${
            activeModule === 'FIS_DOCTRACK'
              ? 'bg-emerald-50/90 text-[#056839] border-emerald-200 shadow-2xs'
              : 'bg-white text-slate-700 border-transparent hover:bg-slate-50 hover:text-slate-900'
          } ${isCollapsed ? 'justify-center px-0' : ''}`}
        >
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              activeModule === 'FIS_DOCTRACK'
                ? 'bg-[#056839] text-white'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
          </div>

          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="truncate font-bold">DTN Integration</div>
              <div className="text-[11px] text-slate-500 font-normal truncate mt-0.5">
                Bulk DTN Remarks (.xlsx)
              </div>
            </div>
          )}
        </button>

        {/* 3. System Configuration (Superadmin & ODDG-FROO Admin) */}
        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => onSelectModule('SYSTEM_CONFIG')}
            title="System Configuration (Superadmin & ODDG-FROO Admin)"
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-semibold transition cursor-pointer border ${
              activeModule === 'SYSTEM_CONFIG'
                ? 'bg-emerald-50/90 text-[#056839] border-emerald-200 shadow-2xs'
                : 'bg-white text-slate-700 border-transparent hover:bg-slate-50 hover:text-slate-900'
            } ${isCollapsed ? 'justify-center px-0' : ''}`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                activeModule === 'SYSTEM_CONFIG'
                  ? 'bg-[#056839] text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              <Settings className="w-4 h-4" />
            </div>

            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate font-bold">System Configuration</span>
                </div>
                <div className="text-[11px] text-slate-500 font-normal truncate mt-0.5">
                  Categories, Positions &amp; CRUD
                </div>
              </div>
            )}
          </button>
        )}
      </nav>
    </aside>
  );
};

