import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Calendar, FileText, CheckSquare, ShieldCheck, Car, UserCheck, AlertCircle, RotateCcw, CheckCircle } from 'lucide-react';
import { Task, DispatchSlip } from '../types/task';
import { generateDispatchControlNumber } from '../utils/dispatchNumber';
import { getStoredTasks } from '../utils/storage';

interface CreateDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveDispatch: (slip: DispatchSlip) => void;
  task: Task;
  existingSlip?: DispatchSlip | null;
  allTasks?: Task[];
}

export const CreateDispatchModal: React.FC<CreateDispatchModalProps> = ({
  isOpen,
  onClose,
  onSaveDispatch,
  task,
  existingSlip,
  allTasks = [],
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

  // Retain requested officials by default as instructed
  const [recommendedByName, setRecommendedByName] = useState(
    existingSlip?.recommendedBy.name || 'GOMEL C. GABUNA, LLB, MDM, CESE'
  );
  const [recommendedByTitle, setRecommendedByTitle] = useState(
    existingSlip?.recommendedBy.title || 'Executive Assistant Designate for FROO, Director II, NLC'
  );

  const [approvedByName, setApprovedByName] = useState(
    existingSlip?.approvedBy.name || 'ATTY. FRANKLIN ANTHONY M. TABAQUIN, IV'
  );
  const [approvedByTitle, setApprovedByTitle] = useState(
    existingSlip?.approvedBy.title || 'Deputy Director General - Field Regulatory Operations Office'
  );

  const [status, setStatus] = useState<'Draft' | 'Approved' | 'Dispatched'>(
    existingSlip?.status || 'Approved'
  );

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
      setStatus(existingSlip.status);
    } else {
      // Auto-generate for new slip
      const fresh = generateDispatchControlNumber(task.region, dispatchDate, taskRegistry);
      setCtrlNo(fresh.ctrlNo);
      setCtrlMeta(fresh);
    }
  }, [existingSlip, task.region]);

  if (!isOpen) return null;

  // Handlers for dynamic establishment rows
  const handleAddEstablishment = () => {
    setEstablishments([...establishments, '']);
    setLocations([...locations, '']);
  };

  const handleRemoveEstablishment = (index: number) => {
    if (establishments.length <= 1) return;
    setEstablishments(establishments.filter((_, i) => i !== index));
    setLocations(locations.filter((_, i) => i !== index));
  };

  const handleUpdateEstablishment = (index: number, val: string) => {
    const updated = [...establishments];
    updated[index] = val;
    setEstablishments(updated);
  };

  const handleUpdateLocation = (index: number, val: string) => {
    const updated = [...locations];
    updated[index] = val;
    setLocations(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const filteredEstablishments = establishments.filter((e) => e.trim().length > 0);
    const filteredLocations = locations.filter((l) => l.trim().length > 0);

    const slip: DispatchSlip = {
      id: existingSlip?.id || `DSP-${Date.now()}`,
      taskId: task.id,
      ctrlNo: ctrlNo.trim() || ctrlMeta.ctrlNo,
      dispatchDate: dispatchDate.trim() || 'October 27, 2026',
      establishments: filteredEstablishments.length > 0 ? filteredEstablishments : ['CAREPHAR PHARMA AND MEDICAL SUPPLIES TRADING'],
      locations: filteredLocations.length > 0 ? filteredLocations : [task.location || 'Regional Office'],
      purposes,
      othersPurpose: othersPurpose.trim() || 'N/A',
      timeOfArrival: timeOfArrival.trim(),
      teamLeader: teamLeader.trim() || task.assignedTo.toUpperCase(),
      teamMembers: teamMembers.trim() || 'NONE',
      driver: driver.trim() || 'N/A',
      vehiclePlateNumber: vehiclePlateNumber.trim() || 'N/A',
      recommendedBy: {
        name: recommendedByName.trim(),
        title: recommendedByTitle.trim(),
      },
      approvedBy: {
        name: approvedByName.trim(),
        title: approvedByTitle.trim(),
      },
      status,
      createdAt: existingSlip?.createdAt || new Date().toISOString().split('T')[0],
    };

    onSaveDispatch(slip);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-900 to-indigo-950 text-white flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block">
              FDA Official Order
            </span>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              <span>{existingSlip ? 'Edit Dispatch Slip' : 'Create Dispatch Slip'}</span>
            </h3>
            <p className="text-xs text-blue-100 mt-0.5">
              Task: {task.taskTitle} ({task.region})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded-md hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
          
          {/* Header Info Banner */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <div className="text-[11.5px] text-blue-900 leading-snug">
              Follows official FDA FROO Dispatch Slip standards. Control numbers are auto-generated based on the dispatch region, calendar year, and sequential mission count. Cluster Director recommendations and DDG approval lines are preserved.
            </div>
          </div>

          {/* Row 1: Auto-Generated Control Number & Dispatch Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-800">
                  CTRL No. <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleRegenerateCtrlNo}
                  className="text-blue-600 hover:text-blue-800 text-[10.5px] font-semibold flex items-center gap-1 cursor-pointer hover:underline"
                  title="Recalculate sequential number"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Auto-calculate</span>
                </button>
              </div>
              <input
                type="text"
                required
                value={ctrlNo}
                onChange={(e) => setCtrlNo(e.target.value)}
                placeholder="e.g. RFOX-2026-510"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
              />
              <div className="flex items-center gap-1 mt-1 text-[10.5px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                <CheckCircle className="w-3 h-3 shrink-0" />
                <span>
                  Region: {ctrlMeta.prefix} • Year: {ctrlMeta.year} • Dispatch #{ctrlMeta.sequenceNumber} so far
                </span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Dispatched on Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={dispatchDate}
                onChange={(e) => {
                  setDispatchDate(e.target.value);
                  // Update year in auto-calc if year changed
                  const fresh = generateDispatchControlNumber(task.region, e.target.value, taskRegistry);
                  setCtrlMeta(fresh);
                }}
                placeholder="e.g. October 27, 2026"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Formal date format e.g. "October 27, 2026"
              </span>
            </div>
          </div>

          {/* Row 2: Establishments & Locations List */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-semibold text-slate-900 block text-xs">
                  Target Establishments & Locations
                </label>
                <span className="text-[11px] text-slate-500">
                  Add one or more establishments to be inspected/visited during this dispatch.
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddEstablishment}
                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium text-xs flex items-center gap-1 border border-blue-200 cursor-pointer transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Establishment</span>
              </button>
            </div>

            <div className="space-y-3">
              {establishments.map((est, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50/80 p-3 rounded-xl border border-slate-200 space-y-2 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-900 text-xs">
                      #{idx + 1} Target Establishment
                    </span>
                    {establishments.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveEstablishment(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 cursor-pointer"
                        title="Remove establishment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div>
                    <input
                      type="text"
                      value={est}
                      onChange={(e) => handleUpdateEstablishment(idx, e.target.value)}
                      placeholder="e.g. CAREPHAR PHARMA AND MEDICAL SUPPLIES TRADING"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-900 uppercase focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">Location / Address</label>
                    <textarea
                      rows={2}
                      value={locations[idx] || ''}
                      onChange={(e) => handleUpdateLocation(idx, e.target.value)}
                      placeholder="e.g. Tan Bldg, Gaabucayan Street, Puntod, Cagayan de Oro City"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 resize-none focus:border-blue-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Row 3: For the purpose of (Checkboxes) */}
          <div className="pt-2 border-t border-slate-100">
            <label className="font-semibold text-slate-900 block mb-2">
              For the purpose of: (Check appropriate box/es)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                <input
                  type="checkbox"
                  checked={purposes.inspection}
                  onChange={(e) => setPurposes({ ...purposes, inspection: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span>Inspection</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                <input
                  type="checkbox"
                  checked={purposes.postMarketSurveillance}
                  onChange={(e) => setPurposes({ ...purposes, postMarketSurveillance: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span>Post Market Surveillance</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                <input
                  type="checkbox"
                  checked={purposes.attendanceToMeeting}
                  onChange={(e) => setPurposes({ ...purposes, attendanceToMeeting: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span>Attendance to Meeting</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                <input
                  type="checkbox"
                  checked={purposes.investigation}
                  onChange={(e) => setPurposes({ ...purposes, investigation: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span>Investigation</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                <input
                  type="checkbox"
                  checked={purposes.witnessForDestruction}
                  onChange={(e) => setPurposes({ ...purposes, witnessForDestruction: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span>Witness for Destruction</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Others</label>
                <input
                  type="text"
                  value={othersPurpose}
                  onChange={(e) => setOthersPurpose(e.target.value)}
                  placeholder="e.g. N/A or Special Case Verification"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Time of Arrival</label>
                <input
                  type="text"
                  value={timeOfArrival}
                  onChange={(e) => setTimeOfArrival(e.target.value)}
                  placeholder="e.g. 09:00 AM or Leave blank"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                />
              </div>
            </div>
          </div>

          {/* Row 4: Team & Vehicle Details */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <span className="font-semibold text-slate-900 block">
              Personnel & Transportation
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Team Leader <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={teamLeader}
                  onChange={(e) => setTeamLeader(e.target.value)}
                  placeholder="e.g. ANTHONETTE J. MELGO"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-semibold uppercase"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Team Member/s
                </label>
                <input
                  type="text"
                  value={teamMembers}
                  onChange={(e) => setTeamMembers(e.target.value)}
                  placeholder="e.g. NONE or comma-separated names"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Driver
                </label>
                <input
                  type="text"
                  value={driver}
                  onChange={(e) => setDriver(e.target.value)}
                  placeholder="e.g. HANNIBAL C. ECOBEN"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs uppercase"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Vehicle Plate Number
                </label>
                <input
                  type="text"
                  value={vehiclePlateNumber}
                  onChange={(e) => setVehiclePlateNumber(e.target.value)}
                  placeholder="e.g. AVANZA SAB 9141"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono uppercase"
                />
              </div>
            </div>
          </div>

          {/* Row 5: Retained Signatories */}
          <div className="pt-2 border-t border-slate-100 bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-3">
            <span className="font-semibold text-slate-900 block text-xs">
              Official Endorsement & Approval (Retained Signatories)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
              <div className="p-2.5 bg-white rounded border border-slate-200">
                <span className="text-slate-400 block mb-1">Recommended/ Requested by:</span>
                <input
                  type="text"
                  value={recommendedByName}
                  onChange={(e) => setRecommendedByName(e.target.value)}
                  className="w-full font-bold text-slate-900 bg-transparent border-b border-slate-200 pb-0.5 mb-1"
                />
                <input
                  type="text"
                  value={recommendedByTitle}
                  onChange={(e) => setRecommendedByTitle(e.target.value)}
                  className="w-full text-slate-600 bg-transparent"
                />
              </div>

              <div className="p-2.5 bg-white rounded border border-slate-200">
                <span className="text-slate-400 block mb-1">Approved by:</span>
                <input
                  type="text"
                  value={approvedByName}
                  onChange={(e) => setApprovedByName(e.target.value)}
                  className="w-full font-bold text-slate-900 bg-transparent border-b border-slate-200 pb-0.5 mb-1"
                />
                <input
                  type="text"
                  value={approvedByTitle}
                  onChange={(e) => setApprovedByTitle(e.target.value)}
                  className="w-full text-slate-600 bg-transparent"
                />
              </div>
            </div>
          </div>

          {/* Status selector */}
          <div className="flex items-center justify-between pt-1">
            <span className="font-semibold text-slate-800">Dispatch Status:</span>
            <div className="flex items-center gap-2">
              {(['Draft', 'Approved', 'Dispatched'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatus(st)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition ${
                    status === st
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Footer actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#2563eb] text-white rounded-lg font-medium hover:bg-blue-700 shadow-sm transition hover:shadow cursor-pointer flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4" />
              <span>{existingSlip ? 'Save Changes' : 'Generate Dispatch Slip'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
