import React from 'react';
import { X, Building2, ExternalLink } from 'lucide-react';
import { FROO_OFFICES } from '../data/offices';
import { Task } from '../types/task';
import { useSystemConfig } from '../utils/systemConfigStorage';
import { doesRegionMatch } from '../utils/taskAuthorization';

interface RegionalOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  onSelectOfficeFilter: (officeCode: string) => void;
  currentOfficeFilter: string;
  allowedRegions?: string[];
}

export const RegionalOverviewModal: React.FC<RegionalOverviewModalProps> = ({
  isOpen,
  onClose,
  tasks,
  onSelectOfficeFilter,
  currentOfficeFilter,
  allowedRegions,
}) => {
  const [systemConfig] = useSystemConfig();
  const allOffices = systemConfig.offices?.length ? systemConfig.offices : FROO_OFFICES;
  const dynamicOffices =
    allowedRegions && allowedRegions.length > 0
      ? allOffices.filter((o) =>
          allowedRegions.some((ar) => doesRegionMatch(o.code, ar) || doesRegionMatch(o.name, ar))
        )
      : allOffices;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-0 md:p-4">
      <div className="bg-white rounded-none md:rounded-2xl shadow-2xl border-0 md:border border-slate-200 w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col h-[100dvh] md:h-auto md:max-h-[90vh]">
        
        {/* Header */}
        <div className="px-4 py-4 md:px-6 md:py-5 border-b border-slate-200 bg-gradient-to-r from-emerald-950 via-[#056839] to-emerald-950 text-white flex items-center justify-between gap-2 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-400 shrink-0" />
              <h3 className="text-sm sm:text-lg font-bold truncate">FROO Regional Offices & Caseload</h3>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 sm:mt-1">
              Live operational workload across {dynamicOffices.length} authorized Regional &amp; FROO offices.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-2 sm:p-1.5 rounded-lg hover:bg-white/10 transition shrink-0"
            aria-label="Close Regional Overview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Table / Cards */}
        <div className="p-3.5 md:p-6 overflow-y-auto space-y-4 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {dynamicOffices.map((office) => {
              // Match tasks either by region (including comma-separated multi-select) or assignedOffice
              const officeTasks = tasks.filter(
                (t) =>
                  doesRegionMatch(t.region, office.code) ||
                  (t.assignedOffice ? doesRegionMatch(t.assignedOffice, office.code) : false)
              );

              const openCount = officeTasks.filter((t) => t.status === 'Open').length;
              const inProgressCount = officeTasks.filter((t) => t.status === 'In Progress').length;
              const completedCount = officeTasks.filter((t) => t.status === 'Completed').length;
              const overdueCount = officeTasks.filter((t) => t.status === 'Overdue').length;

              const isCurrent = currentOfficeFilter === office.code || currentOfficeFilter === office.shortLabel;

              return (
                <div
                  key={office.id}
                  className={`p-4 rounded-xl border transition flex flex-col justify-between ${
                    isCurrent
                      ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-500/30'
                      : 'bg-white hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-sm text-slate-900 leading-snug">
                        {office.shortLabel}
                      </span>
                      <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full shrink-0">
                        {officeTasks.length} {officeTasks.length === 1 ? 'task' : 'tasks'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                      {office.coverage}
                    </p>

                    <div className="mt-3 grid grid-cols-4 gap-1 text-center text-[10px] py-1.5 bg-slate-50 rounded-lg border border-slate-100">
                      <div>
                        <span className="block font-bold text-blue-700">{openCount}</span>
                        <span className="text-slate-400">Open</span>
                      </div>
                      <div>
                        <span className="block font-bold text-amber-600">{inProgressCount}</span>
                        <span className="text-slate-400">Prog</span>
                      </div>
                      <div>
                        <span className="block font-bold text-emerald-600">{completedCount}</span>
                        <span className="text-slate-400">Done</span>
                      </div>
                      <div>
                        <span className="block font-bold text-rose-600">{overdueCount}</span>
                        <span className="text-slate-400">Overdue</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400 truncate max-w-[140px]">
                      {office.defaultPersonnel[0] || office.code}
                    </span>
                    <button
                      onClick={() => {
                        onSelectOfficeFilter(office.code);
                        onClose();
                      }}
                      className="text-xs font-semibold text-[#056839] hover:text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Filter Tasks</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3.5 md:px-6 md:py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2 text-xs text-slate-500 shrink-0 pb-safe">
          <span className="truncate">
            Showing {dynamicOffices.length} authorized {dynamicOffices.length === 1 ? 'Regional Office' : 'Regional & FROO Offices'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-100 cursor-pointer shrink-0"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
