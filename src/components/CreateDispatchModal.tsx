import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  Calendar,
  FileText,
  ShieldCheck,
  RotateCcw,
  CheckCircle,
} from 'lucide-react';
import { Task, DispatchSlip, DispatchStatus } from '../types/task';
import { UserAccount } from '../types/auth';
import { generateDispatchControlNumber } from '../utils/dispatchNumber';
import { getStoredTasks } from '../utils/storage';

interface CreateDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveDispatch: (slip: DispatchSlip) => void;
  task: Task;
  existingSlip?: DispatchSlip | null;
  allTasks?: Task[];
  currentUser?: UserAccount | null;
}

interface TargetDateRange {
  startDate: string;
  endDate: string;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function toIsoDateString(dateObj: Date): string {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseIsoParts(iso: string): { year: number; monthIdx: number; day: number } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d || m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { year: y, monthIdx: m - 1, day: d };
}

function parseTargetDateToRange(raw?: string, fallbackIso?: string): TargetDateRange {
  const defaultIso =
    fallbackIso && /^\d{4}-\d{2}-\d{2}$/.test(fallbackIso)
      ? fallbackIso
      : toIsoDateString(new Date());

  if (!raw || !raw.trim()) {
    return { startDate: defaultIso, endDate: '' };
  }

  const trimmed = raw.trim();

  // Direct ISO date YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return { startDate: trimmed, endDate: '' };
  }

  // Pattern like "10-13 March 2026" or "6 March 2026"
  const rangeSameMonthMatch = trimmed.match(/^(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?\s+([A-Za-z]+)\s+(\d{4})$/);
  if (rangeSameMonthMatch) {
    const day1 = Number(rangeSameMonthMatch[1]);
    const day2 = rangeSameMonthMatch[2] ? Number(rangeSameMonthMatch[2]) : null;
    const monthName = rangeSameMonthMatch[3].toLowerCase();
    const year = Number(rangeSameMonthMatch[4]);
    const mIdx = MONTH_NAMES.findIndex((m) => m.toLowerCase() === monthName);
    if (mIdx >= 0) {
      const mStr = String(mIdx + 1).padStart(2, '0');
      const startIso = `${year}-${mStr}-${String(day1).padStart(2, '0')}`;
      const endIso = day2 ? `${year}-${mStr}-${String(day2).padStart(2, '0')}` : '';
      return { startDate: startIso, endDate: endIso };
    }
  }

  // Fallback native Date parse (e.g. "October 27, 2026")
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return { startDate: toIsoDateString(parsed), endDate: '' };
  }

  return { startDate: defaultIso, endDate: '' };
}

export function formatSingleTargetDateRange(range: TargetDateRange): string {
  const start = parseIsoParts(range.startDate);
  if (!start) return '';

  const end = range.endDate ? parseIsoParts(range.endDate) : null;
  if (!end || range.endDate === range.startDate || range.endDate < range.startDate) {
    return `${start.day} ${MONTH_NAMES[start.monthIdx]} ${start.year}`;
  }

  if (start.year === end.year && start.monthIdx === end.monthIdx) {
    return `${start.day}-${end.day} ${MONTH_NAMES[start.monthIdx]} ${start.year}`;
  }

  if (start.year === end.year) {
    return `${start.day} ${MONTH_NAMES[start.monthIdx]} - ${end.day} ${MONTH_NAMES[end.monthIdx]} ${start.year}`;
  }

  return `${start.day} ${MONTH_NAMES[start.monthIdx]} ${start.year} - ${end.day} ${MONTH_NAMES[end.monthIdx]} ${end.year}`;
}

export function formatConsolidatedDispatchDates(ranges: TargetDateRange[]): string {
  const valid = ranges
    .filter((r) => Boolean(parseIsoParts(r.startDate)))
    .map((r) => ({
      startDate: r.startDate,
      endDate: r.endDate && r.endDate >= r.startDate ? r.endDate : r.startDate,
    }))
    .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.endDate.localeCompare(b.endDate));

  if (valid.length === 0) return '';

  // Deduplicate identical date ranges
  const unique: Array<{ startDate: string; endDate: string }> = [];
  for (const item of valid) {
    if (!unique.some((u) => u.startDate === item.startDate && u.endDate === item.endDate)) {
      unique.push(item);
    }
  }

  // Group by Month + Year when start and end fall in the same month & year
  const groups: Array<{ monthYear: string | null; tokens: string[] }> = [];

  for (const item of unique) {
    const s = parseIsoParts(item.startDate)!;
    const e = parseIsoParts(item.endDate)!;

    if (s.year === e.year && s.monthIdx === e.monthIdx) {
      const monthYear = `${MONTH_NAMES[s.monthIdx]} ${s.year}`;
      const token = s.day === e.day ? `${s.day}` : `${s.day}-${e.day}`;
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.monthYear === monthYear) {
        if (!lastGroup.tokens.includes(token)) {
          lastGroup.tokens.push(token);
        }
      } else {
        groups.push({ monthYear, tokens: [token] });
      }
    } else {
      groups.push({
        monthYear: null,
        tokens: [formatSingleTargetDateRange({ startDate: item.startDate, endDate: item.endDate })],
      });
    }
  }

  const formattedGroups = groups.map((g) => {
    if (!g.monthYear) {
      return g.tokens[0];
    }
    const t = g.tokens;
    let joinedDays = '';
    if (t.length === 1) {
      joinedDays = t[0];
    } else if (t.length === 2) {
      joinedDays = `${t[0]} & ${t[1]}`;
    } else {
      joinedDays = `${t.slice(0, -1).join(', ')}, & ${t[t.length - 1]}`;
    }
    return `${joinedDays} ${g.monthYear}`;
  });

  if (formattedGroups.length === 1) return formattedGroups[0];
  if (formattedGroups.length === 2) return `${formattedGroups[0]} & ${formattedGroups[1]}`;
  return `${formattedGroups.slice(0, -1).join('; ')}; & ${formattedGroups[formattedGroups.length - 1]}`;
}

export const CreateDispatchModal: React.FC<CreateDispatchModalProps> = ({
  isOpen,
  onClose,
  onSaveDispatch,
  task,
  existingSlip,
  allTasks = [],
  currentUser,
}) => {
  const taskRegistry = allTasks && allTasks.length > 0 ? allTasks : getStoredTasks();
  const defaultTaskIsoDate =
    task.scheduledDate && /^\d{4}-\d{2}-\d{2}$/.test(task.scheduledDate)
      ? task.scheduledDate
      : task.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(task.dueDate)
      ? task.dueDate
      : toIsoDateString(new Date());

  const [establishments, setEstablishments] = useState<string[]>(
    existingSlip?.establishments && existingSlip.establishments.length > 0
      ? existingSlip.establishments
      : [
          task.taskTitle.replace(/^(Conduct inspection of|Investigate|Monitor|Audit)\s*/i, '').toUpperCase(),
        ]
  );

  const [locations, setLocations] = useState<string[]>(
    existingSlip?.locations && existingSlip.locations.length > 0
      ? existingSlip.locations
      : [task.location || `${task.region} Regional Jurisdiction`]
  );

  const [targetDateRanges, setTargetDateRanges] = useState<TargetDateRange[]>(() => {
    const count =
      existingSlip?.establishments && existingSlip.establishments.length > 0
        ? existingSlip.establishments.length
        : 1;
    return Array.from({ length: count }, (_, idx) =>
      parseTargetDateToRange(
        existingSlip?.targetDates?.[idx] || existingSlip?.dispatchDate,
        defaultTaskIsoDate
      )
    );
  });

  const consolidatedDispatchDate = useMemo(() => {
    const formatted = formatConsolidatedDispatchDates(targetDateRanges);
    return formatted || existingSlip?.dispatchDate || formatSingleTargetDateRange({ startDate: defaultTaskIsoDate, endDate: '' });
  }, [targetDateRanges, existingSlip, defaultTaskIsoDate]);

  // Compute auto-generated sequence control number based on region, year, and dispatches so far
  const initialAutoCtrl = generateDispatchControlNumber(task.region, consolidatedDispatchDate, taskRegistry);
  const [ctrlNo, setCtrlNo] = useState(
    existingSlip?.ctrlNo || initialAutoCtrl.ctrlNo
  );
  const [ctrlMeta, setCtrlMeta] = useState(initialAutoCtrl);

  const [purposes, setPurposes] = useState(
    existingSlip?.purposes || {
      inspection: task.category.toLowerCase().includes('inspect'),
      postMarketSurveillance: task.category.toLowerCase().includes('surveillance') || task.category.toLowerCase().includes('post-market'),
      attendanceToMeeting: task.category.toLowerCase().includes('meeting'),
      investigation: task.category.toLowerCase().includes('investig'),
      witnessForDestruction: false,
    }
  );

  const hasInitialOthers = Boolean(
    existingSlip?.othersPurpose &&
      existingSlip.othersPurpose.trim() !== '' &&
      existingSlip.othersPurpose.trim().toUpperCase() !== 'N/A'
  );
  const [isOthersChecked, setIsOthersChecked] = useState<boolean>(hasInitialOthers);
  const [othersPurpose, setOthersPurpose] = useState(
    hasInitialOthers ? existingSlip!.othersPurpose : 'N/A'
  );
  const [timeOfArrival, setTimeOfArrival] = useState(existingSlip?.timeOfArrival || '');
  const [teamLeader, setTeamLeader] = useState(existingSlip?.teamLeader || task.assignedTo.toUpperCase());
  const [teamMembers, setTeamMembers] = useState(existingSlip?.teamMembers || 'NONE');
  const [driver, setDriver] = useState(existingSlip?.driver || 'HANNIBAL C. ECOBEN');
  const [vehiclePlateNumber, setVehiclePlateNumber] = useState(existingSlip?.vehiclePlateNumber || 'AVANZA SAB 9141');

  // Status computation based on user role and hierarchy
  const determineInitialStatus = (): DispatchStatus => {
    if (
      existingSlip?.status === 'Pending Regional Supervisor Approval' ||
      existingSlip?.status === 'Pending ODDG Approval'
    ) {
      return existingSlip.status;
    }
    if (!currentUser) return 'Pending Regional Supervisor Approval';
    if (
      currentUser.role === 'CLUSTER_DIRECTOR' ||
      currentUser.role === 'REGIONAL_SUPERVISOR' ||
      currentUser.role === 'ADMIN' ||
      currentUser.role === 'SUPERADMIN'
    ) {
      return 'Pending ODDG Approval';
    }
    return 'Pending Regional Supervisor Approval';
  };

  const getSignatoryDefaultsForStatus = (targetStatus: DispatchStatus) => {
    if (targetStatus === 'Pending ODDG Approval') {
      return {
        recommendedByName: 'JON JOSEPH H. MEDRANO',
        recommendedByTitle: 'Executive Assistant III, ODDG-FROO',
        approvedByName: 'ATTY. FRANKLIN ANTHONY M. TABAQUIN, IV',
        approvedByTitle: 'Deputy Director General - Field Regulatory Operations Office',
      };
    }
    return {
      recommendedByName: '',
      recommendedByTitle: '',
      approvedByName: '',
      approvedByTitle: '',
    };
  };

  const initialStatus = determineInitialStatus();
  const initialSignatories = getSignatoryDefaultsForStatus(initialStatus);

  const [status, setStatus] = useState<DispatchStatus>(initialStatus);
  const [recommendedByName, setRecommendedByName] = useState(
    existingSlip ? existingSlip.recommendedBy.name : initialSignatories.recommendedByName
  );
  const [recommendedByTitle, setRecommendedByTitle] = useState(
    existingSlip ? existingSlip.recommendedBy.title : initialSignatories.recommendedByTitle
  );
  const [approvedByName, setApprovedByName] = useState(
    existingSlip ? existingSlip.approvedBy.name : initialSignatories.approvedByName
  );
  const [approvedByTitle, setApprovedByTitle] = useState(
    existingSlip ? existingSlip.approvedBy.title : initialSignatories.approvedByTitle
  );

  const handleStatusChange = (nextStatus: DispatchStatus) => {
    setStatus(nextStatus);
    const defaults = getSignatoryDefaultsForStatus(nextStatus);
    setRecommendedByName(defaults.recommendedByName);
    setRecommendedByTitle(defaults.recommendedByTitle);
    setApprovedByName(defaults.approvedByName);
    setApprovedByTitle(defaults.approvedByTitle);
  };

  const handleRegenerateCtrlNo = () => {
    const fresh = generateDispatchControlNumber(task.region, consolidatedDispatchDate, taskRegistry);
    setCtrlNo(fresh.ctrlNo);
    setCtrlMeta(fresh);
  };

  useEffect(() => {
    if (existingSlip) {
      setCtrlNo(existingSlip.ctrlNo);
      setEstablishments(existingSlip.establishments);
      setLocations(existingSlip.locations);
      const count = Math.max(existingSlip.establishments?.length || 1, 1);
      setTargetDateRanges(
        Array.from({ length: count }, (_, idx) =>
          parseTargetDateToRange(
            existingSlip.targetDates?.[idx] || existingSlip.dispatchDate,
            defaultTaskIsoDate
          )
        )
      );
      setPurposes(existingSlip.purposes);
      const hasCustomOthers = Boolean(
        existingSlip.othersPurpose &&
          existingSlip.othersPurpose.trim() !== '' &&
          existingSlip.othersPurpose.trim().toUpperCase() !== 'N/A'
      );
      setIsOthersChecked(hasCustomOthers);
      setOthersPurpose(hasCustomOthers ? existingSlip.othersPurpose : 'N/A');
      setTimeOfArrival(existingSlip.timeOfArrival || '');
      setTeamLeader(existingSlip.teamLeader);
      setTeamMembers(existingSlip.teamMembers || 'NONE');
      setDriver(existingSlip.driver || '');
      setVehiclePlateNumber(existingSlip.vehiclePlateNumber || '');
      const resolvedStatus =
        existingSlip.status === 'Pending ODDG Approval'
          ? 'Pending ODDG Approval'
          : 'Pending Regional Supervisor Approval';
      setStatus(resolvedStatus);
      setRecommendedByName(existingSlip.recommendedBy.name);
      setRecommendedByTitle(existingSlip.recommendedBy.title);
      setApprovedByName(existingSlip.approvedBy.name);
      setApprovedByTitle(existingSlip.approvedBy.title);
    } else if (isOpen) {
      const defStatus = determineInitialStatus();
      const defSignatories = getSignatoryDefaultsForStatus(defStatus);
      setStatus(defStatus);
      setRecommendedByName(defSignatories.recommendedByName);
      setRecommendedByTitle(defSignatories.recommendedByTitle);
      setApprovedByName(defSignatories.approvedByName);
      setApprovedByTitle(defSignatories.approvedByTitle);
    }
  }, [existingSlip, isOpen]);

  if (!isOpen) return null;

  const handleAddEstablishment = () => {
    const lastRange = targetDateRanges[targetDateRanges.length - 1] || {
      startDate: defaultTaskIsoDate,
      endDate: '',
    };
    setEstablishments([...establishments, '']);
    setLocations([...locations, '']);
    setTargetDateRanges([...targetDateRanges, { startDate: lastRange.startDate, endDate: '' }]);
  };

  const handleRemoveEstablishment = (index: number) => {
    if (establishments.length <= 1) return;
    setEstablishments(establishments.filter((_, i) => i !== index));
    setLocations(locations.filter((_, i) => i !== index));
    setTargetDateRanges(targetDateRanges.filter((_, i) => i !== index));
  };

  const handleEstablishmentChange = (index: number, val: string) => {
    const updated = [...establishments];
    updated[index] = val;
    setEstablishments(updated);
  };

  const handleLocationChange = (index: number, val: string) => {
    const updated = [...locations];
    updated[index] = val;
    setLocations(updated);
  };

  const handleTargetStartDateChange = (index: number, startDate: string) => {
    const updated = [...targetDateRanges];
    const current = updated[index] || { startDate: defaultTaskIsoDate, endDate: '' };
    const nextEndDate = current.endDate && current.endDate < startDate ? '' : current.endDate;
    updated[index] = { startDate, endDate: nextEndDate };
    setTargetDateRanges(updated);
  };

  const handleTargetEndDateChange = (index: number, endDate: string) => {
    const updated = [...targetDateRanges];
    const current = updated[index] || { startDate: defaultTaskIsoDate, endDate: '' };
    updated[index] = { ...current, endDate };
    setTargetDateRanges(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanedEst = establishments.map((est) => est.trim()).filter(Boolean);
    const cleanedLoc = locations.map((loc) => loc.trim()).filter(Boolean);
    const formattedTargetDates = targetDateRanges.map((range) =>
      formatSingleTargetDateRange(range) || consolidatedDispatchDate
    );

    const resolvedOthersPurpose =
      isOthersChecked && othersPurpose.trim() && othersPurpose.trim().toUpperCase() !== 'N/A'
        ? othersPurpose.trim()
        : 'N/A';

    const slip: DispatchSlip = {
      id: existingSlip?.id || `disp-${Date.now()}`,
      taskId: task.id,
      ctrlNo: ctrlNo.trim(),
      dispatchDate: consolidatedDispatchDate,
      establishments: cleanedEst.length > 0 ? cleanedEst : ['FOOD AND DRUG ESTABLISHMENT'],
      locations: cleanedLoc.length > 0 ? cleanedLoc : [task.region],
      targetDates: formattedTargetDates,
      purposes,
      othersPurpose: resolvedOthersPurpose,
      timeOfArrival: timeOfArrival.trim(),
      teamLeader: teamLeader.trim(),
      teamMembers: teamMembers.trim(),
      driver: driver.trim(),
      vehiclePlateNumber: vehiclePlateNumber.trim(),
      recommendedBy: {
        name: recommendedByName.trim(),
        title: recommendedByTitle.trim(),
      },
      approvedBy: {
        name: approvedByName.trim(),
        title: approvedByTitle.trim(),
        signedBy: status === 'Approved' ? (currentUser ? currentUser.email : 'ODDG-FROO') : undefined,
      },
      status,
      createdAt: existingSlip?.createdAt || new Date().toISOString().split('T')[0],
      createdBy: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : undefined,
      createdByUserEmail: currentUser?.email,
      createdByUserRole: currentUser?.role,
    };

    onSaveDispatch(slip);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-[#056839] text-white flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-200 uppercase tracking-wider block">
              FDA Official Order
            </span>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-300" />
              <span>{existingSlip ? 'Edit Dispatch Slip' : 'Create Dispatch Slip'}</span>
            </h3>
            <p className="text-xs text-emerald-100 mt-0.5">
              Task: {task.taskTitle} ({task.region})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-100 hover:text-white p-1 rounded-md hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
          {/* Header Info Banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#056839] shrink-0 mt-0.5" />
            <div className="text-[11.5px] text-emerald-950 leading-snug">
              Official FROO Dispatch Slip format. Control numbers are auto-generated based on the dispatch region, calendar year, and sequential mission count.
              <span className="block mt-1 font-semibold text-emerald-800">
                • Standard staff slips require Regional Supervisor approval.
                <br />• Supervisor & Cluster Director slips require ODDG-FROO approval.
              </span>
            </div>
          </div>

          {/* Row 1: Auto-Generated Control Number & Combined Schedule Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  CTRL No. (Auto-Generated)
                </label>
                <button
                  type="button"
                  onClick={handleRegenerateCtrlNo}
                  className="text-[11px] text-[#056839] hover:underline flex items-center gap-1 font-medium"
                  title="Recalculate next sequential number"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Refresh No.</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={ctrlNo}
                  onChange={(e) => setCtrlNo(e.target.value.toUpperCase())}
                  className="w-full font-mono tabular-nums font-bold text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-[#056839] focus:outline-none focus:border-[#056839] focus:bg-white"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Sequence: Region prefix {ctrlMeta.prefix} · Year {ctrlMeta.year} · Mission #{ctrlMeta.sequenceNumber}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Combined Dispatch Schedule (Auto-Formatted)
              </label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={consolidatedDispatchDate}
                  className="w-full text-xs font-semibold tabular-nums bg-emerald-50/60 border border-emerald-200 rounded-lg px-3 py-2 text-emerald-950 focus:outline-none"
                />
                <Calendar className="w-4 h-4 text-[#056839] absolute right-3 top-2.5 pointer-events-none" />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Automatically combined from the Targeted Date(s) below
              </span>
            </div>
          </div>

          {/* Establishments, Locations & Per-Target Dates List */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-800">
                Target Establishments, Locations & Targeted Dates
              </label>
              <button
                type="button"
                onClick={handleAddEstablishment}
                className="text-xs text-[#056839] font-medium hover:underline flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Another Target</span>
              </button>
            </div>

            <div className="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              {establishments.map((est, index) => {
                const currentRange = targetDateRanges[index] || {
                  startDate: defaultTaskIsoDate,
                  endDate: '',
                };
                const formattedTargetPreview = formatSingleTargetDateRange(currentRange);

                return (
                  <div key={index} className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-2.5 relative">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-[#056839]">
                          Target #{index + 1}
                        </span>
                        {formattedTargetPreview && (
                          <span className="text-[11px] text-slate-500 tabular-nums">
                            · {formattedTargetPreview}
                          </span>
                        )}
                      </div>
                      {establishments.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveEstablishment(index)}
                          className="text-slate-400 hover:text-rose-600 transition"
                          title="Remove Target"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Establishment Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={est}
                        onChange={(e) => handleEstablishmentChange(index, e.target.value)}
                        placeholder="Establishment / Facility Name (e.g. CAREPHAR PHARMA)"
                        className="w-full text-xs font-semibold uppercase border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-[#056839]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Specific Complete Address / Location <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={locations[index] || ''}
                        onChange={(e) => handleLocationChange(index, e.target.value)}
                        placeholder="Specific Complete Address / Location"
                        className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-[#056839]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Targeted Date (Start Date) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="date"
                          required
                          value={currentRange.startDate}
                          onChange={(e) => handleTargetStartDateChange(index, e.target.value)}
                          className="w-full text-xs tabular-nums border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-[#056839]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          End Date <span className="text-slate-400 font-normal">(Optional if multi-day)</span>
                        </label>
                        <input
                          type="date"
                          min={currentRange.startDate}
                          value={currentRange.endDate}
                          onChange={(e) => handleTargetEndDateChange(index, e.target.value)}
                          className="w-full text-xs tabular-nums border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-[#056839]"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Purposes */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Purpose of Dispatch (Check applicable)
            </label>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={purposes.inspection}
                    onChange={(e) => setPurposes({ ...purposes, inspection: e.target.checked })}
                    className="rounded text-[#056839] focus:ring-[#056839]"
                  />
                  <span>Inspection</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={purposes.postMarketSurveillance}
                    onChange={(e) => setPurposes({ ...purposes, postMarketSurveillance: e.target.checked })}
                    className="rounded text-[#056839] focus:ring-[#056839]"
                  />
                  <span>Post Market Surveillance</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={purposes.investigation}
                    onChange={(e) => setPurposes({ ...purposes, investigation: e.target.checked })}
                    className="rounded text-[#056839] focus:ring-[#056839]"
                  />
                  <span>Investigation</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={purposes.witnessForDestruction}
                    onChange={(e) => setPurposes({ ...purposes, witnessForDestruction: e.target.checked })}
                    className="rounded text-[#056839] focus:ring-[#056839]"
                  />
                  <span>Witness for Destruction</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={purposes.attendanceToMeeting}
                    onChange={(e) => setPurposes({ ...purposes, attendanceToMeeting: e.target.checked })}
                    className="rounded text-[#056839] focus:ring-[#056839]"
                  />
                  <span>Attendance to Meeting</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={isOthersChecked}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsOthersChecked(checked);
                      if (!checked) {
                        setOthersPurpose('N/A');
                      } else if (othersPurpose === 'N/A') {
                        setOthersPurpose('');
                      }
                    }}
                    className="rounded text-[#056839] focus:ring-[#056839]"
                  />
                  <span>Others</span>
                </label>
              </div>

              {isOthersChecked && (
                <div className="pt-2 border-t border-slate-200/80 animate-in fade-in duration-150">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Specify Other Purpose of Dispatch <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required={isOthersChecked}
                    value={othersPurpose === 'N/A' ? '' : othersPurpose}
                    onChange={(e) => setOthersPurpose(e.target.value)}
                    placeholder="Type the specific purpose of dispatch..."
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-[#056839]"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Time & Team Personnel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Authorized Team Leader (FDRO)
              </label>
              <input
                type="text"
                required
                value={teamLeader}
                onChange={(e) => setTeamLeader(e.target.value.toUpperCase())}
                placeholder="e.g. ANTHONETTE J. MELGO"
                className="w-full text-xs font-semibold border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-[#056839]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Team Member/s
              </label>
              <input
                type="text"
                value={teamMembers}
                onChange={(e) => setTeamMembers(e.target.value)}
                placeholder="e.g. NONE or Staff names separated by comma"
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-[#056839]"
              />
            </div>
          </div>

          {/* Driver & Vehicle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Driver Name
              </label>
              <input
                type="text"
                value={driver}
                onChange={(e) => setDriver(e.target.value.toUpperCase())}
                placeholder="e.g. HANNIBAL C. ECOBEN"
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-[#056839]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Vehicle Plate Number
              </label>
              <input
                type="text"
                value={vehiclePlateNumber}
                onChange={(e) => setVehiclePlateNumber(e.target.value.toUpperCase())}
                placeholder="e.g. AVANZA SAB 9141"
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-[#056839]"
              />
            </div>
          </div>

          {/* Approval Routing Hierarchy */}
          <div className="border-t border-slate-200 pt-4">
            <label className="block text-xs font-semibold text-slate-800 mb-2">
              Dispatch Routing & Approval Status
            </label>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Current Status
                </label>
                <select
                  value={status}
                  onChange={(e) => handleStatusChange(e.target.value as DispatchStatus)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#056839] font-medium"
                >
                  <option value="Pending Regional Supervisor Approval">
                    Pending RS / CD Approval (Standard Dispatch)
                  </option>
                  <option value="Pending ODDG Approval">
                    Pending ODDG FROO Approval (RS and CD Dispatch)
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[11px] font-semibold text-slate-600 block">Recommended By:</span>
                  <input
                    type="text"
                    value={recommendedByName}
                    onChange={(e) => setRecommendedByName(e.target.value)}
                    placeholder={status === 'Pending Regional Supervisor Approval' ? 'Leave blank or enter signatory name' : 'JON JOSEPH H. MEDRANO'}
                    className="w-full text-[11px] border border-slate-300 rounded px-2 py-1 mt-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={recommendedByTitle}
                    onChange={(e) => setRecommendedByTitle(e.target.value)}
                    placeholder={status === 'Pending Regional Supervisor Approval' ? 'Leave blank or enter position/title' : 'Executive Assistant III, ODDG-FROO'}
                    className="w-full text-[10px] text-slate-500 border border-slate-200 rounded px-2 py-1 mt-1 bg-white"
                  />
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-600 block">Approved By:</span>
                  <input
                    type="text"
                    value={approvedByName}
                    onChange={(e) => setApprovedByName(e.target.value)}
                    placeholder={status === 'Pending Regional Supervisor Approval' ? 'Leave blank or enter approver name' : 'ATTY. FRANKLIN ANTHONY M. TABAQUIN, IV'}
                    className="w-full text-[11px] border border-slate-300 rounded px-2 py-1 mt-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={approvedByTitle}
                    onChange={(e) => setApprovedByTitle(e.target.value)}
                    placeholder={status === 'Pending Regional Supervisor Approval' ? 'Leave blank or enter position/title' : 'Deputy Director General - Field Regulatory Operations Office'}
                    className="w-full text-[10px] text-slate-500 border border-slate-200 rounded px-2 py-1 mt-1 bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-[#056839] hover:bg-[#04522d] rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{existingSlip ? 'Save Changes' : 'Generate Dispatch Slip'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
