import React from 'react';
import { Plus, Building2, UserCheck, BarChart3, Download, RotateCcw, ShieldCheck } from 'lucide-react';
import { FrooOffice, FrooUserPersona } from '../types/task';
import { FROO_OFFICES, DEFAULT_PERSONAS } from '../data/offices';

interface HeaderProps {
  onCreateTask: () => void;
  currentPersona: FrooUserPersona;
  onSelectPersona: (persona: FrooUserPersona) => void;
  onOpenRegionalOverview: () => void;
  onExportCsv: () => void;
  onResetData: () => void;
  selectedRegionFilter: string;
  onSelectRegionFilter: (region: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onCreateTask,
  currentPersona,
  onSelectPersona,
  onOpenRegionalOverview,
  onExportCsv,
  onResetData,
  selectedRegionFilter,
  onSelectRegionFilter,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      {/* Top FDA Official Green Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-[#056839] to-emerald-950 text-white text-xs px-4 sm:px-8 py-2 flex flex-wrap items-center justify-between gap-3 border-b border-emerald-800/40">
        <div className="flex items-center gap-2.5 font-medium tracking-wide">
          {/* Official FDA Logo inside the circle */}
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

        {/* User Persona / Office Switcher */}
        <div className="flex items-center gap-2">
          <label className="text-emerald-200 text-xs hidden md:inline">Logged in as:</label>
          <div className="relative">
            <select
              value={currentPersona.email}
              onChange={(e) => {
                const found = DEFAULT_PERSONAS.find((p) => p.email === e.target.value);
                if (found) onSelectPersona(found);
              }}
              className="bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-700/80 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer pr-7"
            >
              {DEFAULT_PERSONAS.map((persona) => (
                <option key={persona.email} value={persona.email} className="bg-slate-900 text-white">
                  {persona.name} — {persona.officeName}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={onOpenRegionalOverview}
            className="flex items-center gap-1.5 bg-emerald-900/80 hover:bg-emerald-800 text-white px-2.5 py-1 rounded text-xs transition border border-emerald-700/60 cursor-pointer"
            title="View tasks distribution across all 17 FROO regional field offices"
          >
            <BarChart3 className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden lg:inline">Regional Workload</span>
          </button>

          <button
            onClick={onExportCsv}
            className="flex items-center gap-1 bg-emerald-900/80 hover:bg-emerald-800 text-white px-2 py-1 rounded text-xs transition border border-emerald-700/60 cursor-pointer"
            title="Export tasks to CSV"
          >
            <Download className="w-3.5 h-3.5 text-emerald-300" />
            <span className="hidden lg:inline">Export</span>
          </button>

          <button
            onClick={onResetData}
            className="flex items-center gap-1 text-emerald-200 hover:text-white px-2 py-1 text-xs hover:bg-white/10 rounded transition cursor-pointer"
            title="Reset to default demo tasks"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden xl:inline">Reset Data</span>
          </button>
        </div>
      </div>

      {/* Main App Title & Create Button */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                FROO Task Tracking
              </h1>
              <span className="bg-emerald-100 text-[#056839] text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                Official Portal
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">
              Create, assign, monitor and manage operational tasks across the Food and Drug Regulatory Operations Office and Regional Field Offices.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onCreateTask}
              className="inline-flex items-center justify-center gap-2 bg-[#056839] hover:bg-[#04522d] text-white font-medium px-5 py-2.5 rounded-lg shadow-sm transition hover:shadow focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 active:scale-[0.99] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Task</span>
            </button>
          </div>
        </div>

        {/* Office Quick-Filter Strip */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <span className="font-semibold text-slate-700">Quick Office View:</span>
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
            <button
              onClick={() => onSelectRegionFilter(currentPersona.officeName)}
              className={`px-2.5 py-1 rounded-md font-medium transition flex items-center gap-1 cursor-pointer ${
                selectedRegionFilter === currentPersona.officeName
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-200 font-semibold'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              <Building2 className="w-3 h-3 text-[#056839]" />
              My Office: {currentPersona.officeName}
            </button>
          </div>

          <div className="text-slate-400 text-xs hidden sm:block">
            Connected as <strong className="text-slate-700">{currentPersona.name}</strong> ({currentPersona.role})
          </div>
        </div>
      </div>
    </header>
  );
};
