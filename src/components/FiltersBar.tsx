import React from 'react';
import { Search, RotateCcw, Filter, Building2 } from 'lucide-react';
import { CATEGORIES, ORIGINS, PRIORITIES, STATUSES, FROO_OFFICES } from '../data/offices';
import { UserRole } from '../types/auth';

interface FiltersBarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  selectedCategory: string;
  onCategoryChange: (val: string) => void;
  selectedOrigin: string;
  onOriginChange: (val: string) => void;
  selectedRegion: string;
  onRegionChange: (val: string) => void;
  selectedStatus: string;
  onStatusChange: (val: string) => void;
  selectedPriority: string;
  onPriorityChange: (val: string) => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
  allowedRegions?: string[];
  userRole?: UserRole;
  scopeLabel?: string;
}

export const FiltersBar: React.FC<FiltersBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedOrigin,
  onOriginChange,
  selectedRegion,
  onRegionChange,
  selectedStatus,
  onStatusChange,
  selectedPriority,
  onPriorityChange,
  onResetFilters,
  hasActiveFilters,
  allowedRegions,
  userRole,
  scopeLabel,
}) => {
  // Filter offices based on allowed jurisdictions
  const availableOffices = allowedRegions && allowedRegions.length > 0
    ? FROO_OFFICES.filter((o) =>
        allowedRegions.some(
          (ar) =>
            ar.toLowerCase() === o.code.toLowerCase() ||
            ar.toLowerCase() === o.name.toLowerCase() ||
            o.code.toLowerCase().includes(ar.toLowerCase())
        )
      )
    : FROO_OFFICES;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 mb-6 shadow-xs space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px] sm:min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search task..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
          />
        </div>

        {/* Category Dropdown */}
        <div className="w-full sm:w-auto min-w-[130px]">
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 cursor-pointer"
          >
            <option value="All">Category</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Origin Dropdown */}
        <div className="w-full sm:w-auto min-w-[120px]">
          <select
            value={selectedOrigin}
            onChange={(e) => onOriginChange(e.target.value)}
            className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 cursor-pointer"
          >
            <option value="All">Origin</option>
            {ORIGINS.map((orig) => (
              <option key={orig} value={orig}>
                {orig}
              </option>
            ))}
          </select>
        </div>

        {/* Region Dropdown - strictly scoped to user's authorized jurisdiction */}
        <div className="w-full sm:w-auto min-w-[150px]">
          <select
            value={selectedRegion}
            onChange={(e) => onRegionChange(e.target.value)}
            className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 cursor-pointer font-medium"
          >
            {userRole === 'SUPERADMIN' || userRole === 'ADMIN' ? (
              <option value="All">All Regions (17)</option>
            ) : userRole === 'CLUSTER_DIRECTOR' ? (
              <option value="All">All Cluster Regions ({availableOffices.length})</option>
            ) : null}

            {availableOffices.map((office) => (
              <option key={office.id} value={office.code}>
                {office.shortLabel}
              </option>
            ))}
          </select>
        </div>

        {/* Status Dropdown */}
        <div className="w-full sm:w-auto min-w-[120px]">
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 cursor-pointer"
          >
            <option value="All">Status</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        {/* Priority Dropdown */}
        <div className="w-full sm:w-auto min-w-[120px]">
          <select
            value={selectedPriority}
            onChange={(e) => onPriorityChange(e.target.value)}
            className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 cursor-pointer"
          >
            <option value="All">Priority</option>
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </div>

        {/* Reset Button */}
        <button
          onClick={onResetFilters}
          className={`px-4 py-2 text-sm rounded-lg border border-slate-200 font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
            hasActiveFilters
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-800'
              : 'bg-white hover:bg-slate-50 text-slate-600'
          }`}
          title="Reset all filters"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          <span>Reset</span>
        </button>
      </div>

      {scopeLabel && (
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
          <Building2 className="w-3.5 h-3.5 text-[#056839]" />
          <span>Jurisdiction Visibility: <strong className="text-slate-700">{scopeLabel}</strong></span>
        </div>
      )}
    </div>
  );
};
