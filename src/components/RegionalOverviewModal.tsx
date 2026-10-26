import React from 'react';
import { X, Building2, ExternalLink, ShieldCheck, MapPin, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { FROO_OFFICES } from '../data/offices';
import { Task, FrooOffice } from '../types/task';

interface RegionalOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  onSelectOfficeFilter: (officeCode: string) => void;
  currentOfficeFilter: string;
}

export const RegionalOverviewModal: React.FC<RegionalOverviewModalProps> = ({
  isOpen,
  onClose,
  tasks,
  onSelectOfficeFilter,
  currentOfficeFilter,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-gradient-to-r from-emerald-950 via-[#056839] to-emerald-950 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-400" />
              <h3 className="text-lg font-bold">FROO Regional Field Offices Directory & Caseload</h3>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Live operational workload across all 17 regulatory offices under the Deputy Director General.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Table / Cards */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {FROO_OFFICES.map((office) => {
              // Match tasks either by region or assignedOffice
              const officeTasks = tasks.filter(
                (t) =>
                  t.region === office.code ||
                  t.region === office.shortLabel ||
                  t.assignedOffice === office.shortLabel ||
                  t.assignedOffice === office.name
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
                      {office.defaultPersonnel[0]}
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
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>All 17 FROO Offices covered (ODDG Central & 16 Regional Field Units)</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-100 cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
