import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Calendar,
  FileText,
  CheckSquare,
  ShieldCheck,
  Car,
  UserCheck,
  AlertCircle,
  RotateCcw,
  CheckCircle,
  HelpCircle,
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

export const CreateDispatchModal: React.FC<CreateDispatchModalProps> = ({
  isOpen,
  onClose,
  onSaveDispatch,
  task,
  existingSlip,
  allTasks = [],
  currentUser,
}) => {
  // Use tasks from props or fallback to localStorage
  const taskRegistry = allTasks && allTasks.length > 0 ? allTasks : getStoredTasks();

  const [dispatchDate, setDispatchDate] = useState(
    existingSlip?.dispatchDate || 'October 27, 2026'
  );

  // Compute auto-generated sequence control number based on region, year, and dispatches so far
  const initialAutoCtrl = generateDispatchControlNumber(task.region, dispatchDate, taskRegistry);
  const [ctrlNo, setCtrlNo] = useState(
    existingSlip?.ctrlNo || initialAutoCtrl.ctrlNo
  );
  const [ctrlMeta, setCtrlMeta] = useState(initialAutoCtrl);

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

  const [purposes, setPurposes] = useState(
    existingSlip?.purposes || {
      inspection: task.category.toLowerCase().includes('inspect'),
      postMarketSurveillance: task.category.toLowerCase().includes('surveillance') || task.category.toLowerCase().includes('post-market'),
      attendanceToMeeting: task.category.toLowerCase().includes('meeting'),
      investigation: task.category.toLowerCase().includes('investig'),
      witnessForDestruction: false,
    }
  );

  const [othersPurpose, setOthersPurpose] = useState(existingSlip?.othersPurpose || 'N/A');
  const [timeOfArrival, setTimeOfArrival] = useState(existingSlip?.timeOfArrival || '');
  const [teamLeader, setTeamLeader] = useState(existingSlip?.teamLeader || task.assignedTo.toUpperCase());
  const [teamMembers, setTeamMembers] = useState(existingSlip?.teamMembers || 'NONE');
  const [driver, setDriver] = useState(existingSlip?.driver || 'HANNIBAL C. ECOBEN');
  const [vehiclePlateNumber, setVehiclePlateNumber] = useState(existingSlip?.vehiclePlateNumber || 'AVANZA SAB 9141');

  // Officials recommendation & approval defaults based on roles
  const isStandardStaff = Boolean(
    currentUser && (currentUser.role === 'STANDARD' || (currentUser.role as string) === 'RANK_AND_FILE')
  );

  const defaultRecommendedName = isStandardStaff && currentUser
    ? `${currentUser.firstName.toUpperCase()} ${currentUser.middleInitial ? currentUser.middleInitial.toUpperCase() + ' ' : ''}${currentUser.lastName.toUpperCase()}`
    : 'GOMEL C. GABUNA, LLB, MDM, CESE';

  const defaultRecommendedTitle = isStandardStaff && currentUser
    ? `${currentUser.position}, ${currentUser.office}`
    : 'Executive Assistant Designate for FROO, Director II, NLC';

  const defaultApprovedName = isStandardStaff
    ? 'REGIONAL SUPERVISOR'
    : 'ATTY. FRANKLIN ANTHONY M. TABAQUIN, IV';

  const defaultApprovedTitle = isStandardStaff
    ? `Regional Regulatory Enforcement Supervisor - ${task.region}`
    : 'Deputy Director General - Field Regulatory Operations Office';

  const [recommendedByName, setRecommendedByName] = useState(
    existingSlip?.recommendedBy.name || defaultRecommendedName
  );
  const [recommendedByTitle, setRecommendedByTitle] = useState(
    existingSlip?.recommendedBy.title || defaultRecommendedTitle
  );
  const [approvedByName, setApprovedByName] = useState(
    existingSlip?.approvedBy.name || defaultApprovedName
  );
  const [approvedByTitle, setApprovedByTitle] = useState(
    existingSlip?.approvedBy.title || defaultApprovedTitle
  );

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

  const [status, setStatus] = useState<DispatchStatus>(determineInitialStatus);

  // Re-generate auto sequence when opening or when dispatch date year changes
  const handleRegenerateCtrlNo = () => {
    const fresh = generateDispatchControlNumber(task.region, dispatchDate, taskRegistry);
    setCtrlNo(fresh.ctrlNo);
    setCtrlMeta(fresh);
  };

  // Sync state if existingSlip changes
  useEffect(() => {
    if (existingSlip) {
      setCtrlNo(existingSlip.ctrlNo);
      setDispatchDate(existingSlip.dispatchDate);
      setEstablishments(existingSlip.establishments);
      setLocations(existingSlip.locations);
      setPurposes(existingSlip.purposes);
      setOthersPurpose(existingSlip.othersPurpose || 'N/A');
      setTimeOfArrival(existingSlip.timeOfArrival || '');
      setTeamLeader(existingSlip.teamLeader);
      setTeamMembers(existingSlip.teamMembers || 'NONE');
      setDriver(existingSlip.driver || '');
      setVehiclePlateNumber(existingSlip.vehiclePlateNumber || '');
      setRecommendedByName(existingSlip.recommendedBy.name);
      setRecommendedByTitle(existingSlip.recommendedBy.title);
      setApprovedByName(existingSlip.approvedBy.name);
      setApprovedByTitle(existingSlip.approvedBy.title);
      setStatus(
        existingSlip.status === 'Pending ODDG Approval'
          ? 'Pending ODDG Approval'
          : 'Pending Regional Supervisor Approval'
      );
    }
  }, [existingSlip]);

  if (!isOpen) return null;

  const handleAddEstablishment = () => {
    setEstablishments([...establishments, '']);
    setLocations([...locations, '']);
  };

  const handleRemoveEstablishment = (index: number) => {
    if (establishments.length <= 1) return;
    setEstablishments(establishments.filter((_, i) => i !== index));
    setLocations(locations.filter((_, i) => i !== index));
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanedEst = establishments.map((e) => e.trim()).filter(Boolean);
    const cleanedLoc = locations.map((l) => l.trim()).filter(Boolean);

    const slip: DispatchSlip = {
      id: existingSlip?.id || `disp-${Date.now()}`,
      taskId: task.id,
      ctrlNo: ctrlNo.trim(),
      dispatchDate: dispatchDate.trim(),
      establishments: cleanedEst.length > 0 ? cleanedEst : ['FOOD AND DRUG ESTABLISHMENT'],
      locations: cleanedLoc.length > 0 ? cleanedLoc : [task.region],
      purposes,
      othersPurpose: othersPurpose.trim() || 'N/A',
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

          {/* Row 1: Auto-Generated Control Number & Dispatch Date */}
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
                  className="w-full font-mono font-bold text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-[#056839] focus:outline-none focus:border-[#056839] focus:bg-white"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Sequence: Region prefix {ctrlMeta.prefix} • Year {ctrlMeta.year} • Mission #{ctrlMeta.sequenceNumber}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Dispatch Date (Date of Mission)
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={dispatchDate}
                  onChange={(e) => setDispatchDate(e.target.value)}
                  placeholder="e.g. October 27, 2026"
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-[#056839]"
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Format: Month DD, YYYY
              </span>
            </div>
          </div>

          {/* Establishments & Locations List */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-800">
                Target Establishments & Locations
              </label>
              <button
                type="button"
                onClick={handleAddEstablishment}
                className="text-xs text-[#056839] font-medium hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Another Target</span>
              </button>
            </div>

            <div className="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              {establishments.map((est, index) => (
                <div key={index} className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#056839]">
                      Target #{index + 1}
                    </span>
                    {establishments.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveEstablishment(index)}
                        className="text-slate-400 hover:text-rose-600 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div>
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
                    <input
                      type="text"
                      required
                      value={locations[index] || ''}
                      onChange={(e) => handleLocationChange(index, e.target.value)}
                      placeholder="Specific Complete Address / Location"
                      className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-[#056839]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Purposes */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Purpose of Dispatch (Check applicable)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
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
                  onChange={(e) => setStatus(e.target.value as DispatchStatus)}
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
                    className="w-full text-[11px] border border-slate-300 rounded px-2 py-1 mt-0.5"
                  />
                  <input
                    type="text"
                    value={recommendedByTitle}
                    onChange={(e) => setRecommendedByTitle(e.target.value)}
                    className="w-full text-[10px] text-slate-500 border border-slate-200 rounded px-2 py-1 mt-1"
                  />
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-600 block">Approved By:</span>
                  <input
                    type="text"
                    value={approvedByName}
                    onChange={(e) => setApprovedByName(e.target.value)}
                    className="w-full text-[11px] border border-slate-300 rounded px-2 py-1 mt-0.5"
                  />
                  <input
                    type="text"
                    value={approvedByTitle}
                    onChange={(e) => setApprovedByTitle(e.target.value)}
                    className="w-full text-[10px] text-slate-500 border border-slate-200 rounded px-2 py-1 mt-1"
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
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-[#056839] hover:bg-[#04522d] rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
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
