import React, { useState } from 'react';
import { X, AlertCircle, Hash, Check, Users, Building2, Search } from 'lucide-react';
import { Task, TaskPriority, FrooUserPersona } from '../types/task';
import { UserAccount } from '../types/auth';
import { CATEGORIES, ORIGINS, PRIORITIES, FROO_OFFICES } from '../data/offices';
import { formatDateTime } from '../utils/storage';
import { getStoredUsers } from '../utils/authStorage';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (newTask: Task) => void;
  currentPersona?: FrooUserPersona;
  currentUser?: UserAccount | null;
  allowedRegions?: string[];
  allStaffUsers?: UserAccount[];
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  currentPersona,
  currentUser,
  allowedRegions,
  allStaffUsers = [],
}) => {
  const creatorName = currentUser
    ? `${currentUser.firstName} ${currentUser.lastName}`
    : currentPersona?.name || 'Authorized Officer';
  const creatorOffice = currentUser?.office || currentPersona?.officeName || 'ODDG-FROO';

  // Available Regions / Offices based on jurisdiction
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

  // Staff users list for Assigned To multi-select
  const staffList = allStaffUsers && allStaffUsers.length > 0 ? allStaffUsers : getStoredUsers();
  const activeStaff = staffList.filter((u) => u.status === 'active' || (!u.status && u.status !== 'deactivated'));

  const [dtn, setDtn] = useState('');
  const [isDtnNa, setIsDtnNa] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [origin, setOrigin] = useState('FROO');
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState('');
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [priority, setPriority] = useState<TaskPriority>('Normal');
  const [dueDate, setDueDate] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  // Filtered staff based on search bar in Assigned To
  const filteredStaff = activeStaff.filter((u) => {
    if (!assigneeSearchQuery.trim()) return true;
    const q = assigneeSearchQuery.toLowerCase().trim();
    const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
    const pos = (u.position || '').toLowerCase();
    const off = (u.office || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    const uname = (u.username || '').toLowerCase();
    return (
      fullName.includes(q) ||
      pos.includes(q) ||
      off.includes(q) ||
      email.includes(q) ||
      uname.includes(q)
    );
  });

  // Handle DTN changes locked to 14 numeric digits
  const handleDtnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isDtnNa) return;
    const numericOnly = e.target.value.replace(/\D/g, '').slice(0, 14);
    setDtn(numericOnly);
  };

  // Toggle N/A checkbox for DTN
  const handleToggleDtnNa = (checked: boolean) => {
    setIsDtnNa(checked);
    if (checked) {
      setDtn('N/A');
    } else {
      setDtn('');
    }
  };

  // Toggle staff member in multi-select Assigned To
  const handleToggleAssignee = (fullName: string) => {
    setSelectedAssignees((prev) =>
      prev.includes(fullName) ? prev.filter((name) => name !== fullName) : [...prev, fullName]
    );
  };

  // Toggle Region / Office in multi-select Region / Office
  const handleToggleRegion = (regionCode: string) => {
    setSelectedRegions((prev) =>
      prev.includes(regionCode) ? prev.filter((r) => r !== regionCode) : [...prev, regionCode]
    );
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalDtn = isDtnNa ? 'N/A' : dtn.trim();

    if (!isDtnNa) {
      if (!finalDtn) {
        setError('Please enter the 14-digit DTN or check N/A if there is no DTN');
        return;
      }
      if (finalDtn.length !== 14) {
        setError(`DTN must be locked to 14 digits (currently ${finalDtn.length} digits), or check N/A`);
        return;
      }
    }

    if (!taskTitle.trim()) {
      setError('Please enter a task title');
      return;
    }
    if (selectedAssignees.length === 0) {
      setError('Please select at least one assignee');
      return;
    }
    if (selectedRegions.length === 0) {
      setError('Please select at least one Region / Office');
      return;
    }
    if (!dueDate) {
      setError('Please select a due date');
      return;
    }

    // Derive primary assignee details and office/region
    const matchedStaffList = selectedAssignees
      .map((name) => activeStaff.find((u) => `${u.firstName} ${u.lastName}` === name))
      .filter((u): u is UserAccount => Boolean(u));

    const primaryStaff = matchedStaffList[0];
    const assignedUserEmail = primaryStaff?.email;

    const combinedRegion = selectedRegions.join(', ');
    const derivedOffice = selectedRegions[0] || primaryStaff?.office || creatorOffice;
    const assignedToCombined = selectedAssignees.join(', ');
    const newId = `FROO-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    const todayFormatted = formatDateTime(new Date());

    const newTask: Task = {
      id: newId,
      dtn: finalDtn,
      taskTitle: taskTitle.trim(),
      category,
      origin,
      assignedTo: assignedToCombined,
      assignedOffice: derivedOffice,
      assignedUserEmail: assignedUserEmail || undefined,
      region: combinedRegion,
      dueDate,
      scheduledDate: scheduledDate || undefined,
      location: location.trim() || 'In-Office / N/A',
      description: description.trim() || 'No additional instructions provided.',
      outcome: 'Scheduled',
      remarks: `Task created by ${creatorName} (${creatorOffice})`,
      status: 'Open', // Starts as Open, awaiting Assignee Receipt
      priority,
      createdAt: new Date().toISOString().split('T')[0],
      createdBy: `${creatorName} (${creatorOffice})`,
      activityHistory: [
        {
          id: `act-${Date.now()}`,
          action: `Task created and assigned to ${assignedToCombined} (${combinedRegion}). DTN: ${finalDtn}.`,
          actor: creatorName,
          actorOffice: creatorOffice,
          date: todayFormatted,
          notes: description.trim() ? `Direct task assignment: ${description.trim().slice(0, 100)}` : undefined,
        },
      ],
    };

    onCreate(newTask);
    onClose();

    // Reset state
    setDtn('');
    setIsDtnNa(false);
    setTaskTitle('');
    setSelectedAssignees([]);
    setAssigneeSearchQuery('');
    setSelectedRegions([]);
    setPriority('Normal');
    setDueDate('');
    setScheduledDate('');
    setDescription('');
    setLocation('');
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Create New Task</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Create and assign a new operational task.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs max-h-[82vh] overflow-y-auto">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* DTN (Document Tracking Number) with N/A checkbox */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-700 font-semibold flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-[#056839]" />
                <span>DTN (Document Tracking Number)</span>
                <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-3">
                {!isDtnNa && (
                  <span
                    className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border ${
                      dtn.length === 14
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : dtn.length > 0
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    {dtn.length}/14 digits
                  </span>
                )}
                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-slate-700 font-semibold bg-slate-100 hover:bg-slate-200/70 px-2 py-0.5 rounded border border-slate-200 transition">
                  <input
                    type="checkbox"
                    checked={isDtnNa}
                    onChange={(e) => handleToggleDtnNa(e.target.checked)}
                    className="rounded border-slate-300 text-[#056839] focus:ring-[#056839] w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="text-[11px]">N/A</span>
                </label>
              </div>
            </div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={14}
              disabled={isDtnNa}
              value={isDtnNa ? 'N/A' : dtn}
              onChange={handleDtnChange}
              placeholder="Enter 14-digit DTN (e.g., 20261026001234)"
              className={`w-full text-xs font-mono tracking-wider border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#056839] ${
                isDtnNa
                  ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
                  : 'border-slate-300 bg-white text-slate-900'
              }`}
            />
            <p className="text-[10.5px] text-slate-400 mt-1">
              {isDtnNa
                ? 'DTN marked as N/A (Not Applicable) for this task.'
                : 'Locked to 14 numeric digits per official FDA Philippines document tracking system, or check N/A if none.'}
            </p>
          </div>

          {/* Task Title */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="Enter task title"
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#056839]"
            />
          </div>

          {/* Category & Origin */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#056839]"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Origin
              </label>
              <select
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#056839]"
              >
                {ORIGINS.map((orig) => (
                  <option key={orig} value={orig}>
                    {orig}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Assigned To (Multiple Selection) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-700 font-semibold flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#056839]" />
                <span>Assigned To (Multiple Selection)</span>
                <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[10.5px] text-slate-500 font-medium">
                  {selectedAssignees.length} selected
                </span>
                {selectedAssignees.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedAssignees([])}
                    className="text-[10.5px] text-rose-600 hover:underline font-medium cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Selected Assignee Tags */}
            {selectedAssignees.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2 p-2 bg-emerald-50/60 border border-emerald-200 rounded-lg">
                {selectedAssignees.map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1 bg-white text-[#056839] border border-emerald-300 px-2 py-0.5 rounded-md text-[11px] font-semibold shadow-2xs"
                  >
                    <span>{name}</span>
                    <button
                      type="button"
                      onClick={() => handleToggleAssignee(name)}
                      className="text-slate-400 hover:text-rose-600 ml-0.5 cursor-pointer"
                      title={`Remove ${name}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Search bar for Assigned To */}
            <div className="relative mb-1.5">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={assigneeSearchQuery}
                onChange={(e) => setAssigneeSearchQuery(e.target.value)}
                placeholder="Search personnel by name, position, or office..."
                className="w-full text-xs border border-slate-300 rounded-lg pl-8 pr-7 py-1.5 bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#056839]"
              />
              {assigneeSearchQuery && (
                <button
                  type="button"
                  onClick={() => setAssigneeSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Multi-select Staff Checklist */}
            <div className="border border-slate-300 rounded-lg max-h-36 overflow-y-auto divide-y divide-slate-100 bg-white">
              {filteredStaff.length === 0 ? (
                <div className="px-3 py-2.5 text-slate-400 text-center">
                  {assigneeSearchQuery.trim()
                    ? `No personnel matching "${assigneeSearchQuery}"`
                    : 'No active staff available'}
                </div>
              ) : (
                filteredStaff.map((u) => {
                  const fullName = `${u.firstName} ${u.lastName}`;
                  const isChecked = selectedAssignees.includes(fullName);
                  return (
                    <label
                      key={u.id}
                      className={`flex items-center justify-between px-3 py-2 cursor-pointer transition select-none ${
                        isChecked ? 'bg-emerald-50/70 text-slate-900 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleAssignee(fullName)}
                          className="rounded border-slate-300 text-[#056839] focus:ring-[#056839] w-3.5 h-3.5 cursor-pointer shrink-0"
                        />
                        <div className="truncate">
                          <span className="text-xs">{fullName}</span>
                          <span className="text-[10.5px] text-slate-500 ml-1.5">
                            — {u.position} ({u.office})
                          </span>
                        </div>
                      </div>
                      {isChecked && <Check className="w-3.5 h-3.5 text-[#056839] shrink-0" />}
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* Region / Office (Multiple Selection) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-700 font-semibold flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#056839]" />
                <span>Region / Office (Multiple Selection)</span>
                <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[10.5px] text-slate-500 font-medium">
                  {selectedRegions.length} selected
                </span>
                {selectedRegions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedRegions([])}
                    className="text-[10.5px] text-rose-600 hover:underline font-medium cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Selected Region / Office Tags */}
            {selectedRegions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2 p-2 bg-emerald-50/60 border border-emerald-200 rounded-lg">
                {selectedRegions.map((regCode) => (
                  <span
                    key={regCode}
                    className="inline-flex items-center gap-1 bg-white text-[#056839] border border-emerald-300 px-2 py-0.5 rounded-md text-[11px] font-semibold shadow-2xs"
                  >
                    <span>{regCode}</span>
                    <button
                      type="button"
                      onClick={() => handleToggleRegion(regCode)}
                      className="text-slate-400 hover:text-rose-600 ml-0.5 cursor-pointer"
                      title={`Remove ${regCode}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Multi-select Region / Office Checklist */}
            <div className="border border-slate-300 rounded-lg max-h-36 overflow-y-auto divide-y divide-slate-100 bg-white">
              {availableOffices.map((o) => {
                const isChecked = selectedRegions.includes(o.code);
                return (
                  <label
                    key={o.id}
                    className={`flex items-center justify-between px-3 py-2 cursor-pointer transition select-none ${
                      isChecked ? 'bg-emerald-50/70 text-slate-900 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleRegion(o.code)}
                        className="rounded border-slate-300 text-[#056839] focus:ring-[#056839] w-3.5 h-3.5 cursor-pointer shrink-0"
                      />
                      <div className="truncate">
                        <span className="text-xs">{o.shortLabel}</span>
                        {o.coverage && (
                          <span className="text-[10.5px] text-slate-500 ml-1.5">
                            — {o.coverage}
                          </span>
                        )}
                      </div>
                    </div>
                    {isChecked && <Check className="w-3.5 h-3.5 text-[#056839] shrink-0" />}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Priority & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#056839]"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Due Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#056839]"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the task..."
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#056839]"
            />
          </div>

          {/* Separation Line & Note before Scheduled Date & Location */}
          <div className="pt-2">
            <div className="border-t border-slate-200 pt-3">
              <p className="text-[11px] text-slate-500 italic">
                Input here if the task requires personnel to go outside the office to perform their assigned duties.
              </p>
            </div>
          </div>

          {/* Scheduled Date & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Scheduled Date
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#056839]"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter location (if outside office)"
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#056839]"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-[#056839] hover:bg-[#04522d] rounded-lg shadow-sm transition cursor-pointer"
            >
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
