import React, { useState } from 'react';
import { Search, RotateCcw, SlidersHorizontal, Building2, X, ChevronUp } from 'lucide-react';
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
  scopeLabel,
}) => {
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Filter offices based on allowed jurisdictions
  const availableOffices =
    allowedRegions && allowedRegions.length > 0
      ? FROO_OFFICES.filter((o) =>
          allowedRegions.some(
            (ar) =>
              ar.toLowerCase() === o.code.toLowerCase() ||
              ar.toLowerCase() === o.name.toLowerCase() ||
              o.code.toLowerCase().includes(ar.toLowerCase())
          )
        )
      : FROO_OFFICES;

  const activeDropdownCount = [
    selectedCategory !== 'All',
    selectedOrigin !== 'All',
    selectedRegion !== 'All',
    selectedStatus !== 'All',
    selectedPriority !== 'All',
  ].filter(Boolean).length;

  return (
    <>
      {/* ================= MOBILE SEARCH + COLLAPSIBLE FILTERS (< 768px) ================= */}
      <div className="md:hidden bg-white rounded-xl border border-slate-200 p-3 mb-4 shadow-xs space-y-2.5">
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search title, DTN, assignee..."
              className="w-full min-h-[44px] pl-9 pr-8 py-2 text-sm bg-slate-50/70 focus:bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#056839] transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Collapsible Filters Toggle Button */}
          <button
            type="button"
            onClick={() => setIsMobileFiltersOpen((prev) => !prev)}
            className={`min-h-[44px] px-3.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition shrink-0 cursor-pointer whitespace-nowrap ${
              isMobileFiltersOpen || activeDropdownCount > 0
                ? 'bg-emerald-50 border-[#056839]/40 text-[#056839]'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {isMobileFiltersOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <SlidersHorizontal className="w-4 h-4" />
            )}
            <span>Filters</span>
            {activeDropdownCount > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#056839] text-white text-[10px] font-bold tabular-nums flex items-center justify-center">
                {activeDropdownCount}
              </span>
            )}
          </button>
        </div>

        {/* Collapsible 2-Column Mobile Filter Controls */}
        {isMobileFiltersOpen && (
          <div className="pt-2.5 border-t border-slate-100 space-y-2.5 animate-in fade-in duration-150">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10.5px] font-semibold text-slate-500 mb-1">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => onCategoryChange(e.target.value)}
                  className="w-full min-h-[42px] text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-none focus:border-[#056839]"
                >
                  <option value="All">All Categories</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10.5px] font-semibold text-slate-500 mb-1">
                  Origin
                </label>
                <select
                  value={selectedOrigin}
                  onChange={(e) => onOriginChange(e.target.value)}
                  className="w-full min-h-[42px] text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-none focus:border-[#056839]"
                >
                  <option value="All">All Origins</option>
                  {ORIGINS.map((orig) => (
                    <option key={orig} value={orig}>
                      {orig}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10.5px] font-semibold text-slate-500 mb-1">
                  Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => onStatusChange(e.target.value)}
                  className="w-full min-h-[42px] text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-none focus:border-[#056839]"
                >
                  <option value="All">All Statuses</option>
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10.5px] font-semibold text-slate-500 mb-1">
                  Priority
                </label>
                <select
                  value={selectedPriority}
                  onChange={(e) => onPriorityChange(e.target.value)}
                  className="w-full min-h-[42px] text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-none focus:border-[#056839]"
                >
                  <option value="All">All Priorities</option>
                  {PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-[10.5px] font-semibold text-slate-500 mb-1">
                  Region / Office
                </label>
                <select
                  value={selectedRegion}
                  onChange={(e) => onRegionChange(e.target.value)}
                  className="w-full min-h-[42px] text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 font-medium focus:outline-none focus:border-[#056839]"
                >
                  <option value="All">All Regions / Offices</option>
                  {availableOffices.map((office) => (
                    <option key={office.id} value={office.code}>
                      {office.shortLabel}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={onResetFilters}
                disabled={!hasActiveFilters}
                className="min-h-[40px] px-3.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 disabled:opacity-45 flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Reset Filters</span>
              </button>
              <button
                type="button"
                onClick={() => setIsMobileFiltersOpen(false)}
                className="min-h-[40px] px-4 rounded-lg bg-[#056839] text-white text-xs font-bold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {scopeLabel && (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-1.5 border-t border-slate-100">
            <Building2 className="w-3.5 h-3.5 text-[#056839] shrink-0" />
            <span className="truncate">
              Scope: <strong className="text-slate-700">{scopeLabel}</strong>
            </span>
          </div>
        )}
      </div>

      {/* ================= DESKTOP FILTERS BAR (>= 768px — UNCHANGED) ================= */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 mb-6 shadow-xs space-y-2">
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

          {/* Region / Office Dropdown - strictly scoped to user's authorized jurisdiction */}
          <div className="w-full sm:w-auto min-w-[150px]">
            <select
              value={selectedRegion}
              onChange={(e) => onRegionChange(e.target.value)}
              className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 cursor-pointer font-medium"
            >
              <option value="All">Regions/Office</option>

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
            <span>
              Jurisdiction Visibility: <strong className="text-slate-700">{scopeLabel}</strong>
            </span>
          </div>
        )}
      </div>
    </>
  );
};
