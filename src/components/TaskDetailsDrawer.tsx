import React, { useState } from 'react';
import {
  X,
  Calendar,
  MapPin,
  User,
  Building,
  CheckCircle,
  AlertTriangle,
  Clock,
  Send,
  Edit2,
  Trash2,
  Check,
  ChevronDown,
  History,
  FileText,
  BadgeAlert,
  ArrowRight,
  Truck,
  FileCheck,
  FileDown,
  Eye,
  Plus,
} from 'lucide-react';
import { Task, TaskStatus, TaskPriority, ActivityItem, FrooUserPersona, DispatchSlip } from '../types/task';
import { formatDate, formatDateTime } from '../utils/storage';
import { OUTCOMES, STATUSES, FROO_OFFICES, CATEGORIES } from '../data/offices';
import { CreateDispatchModal } from './CreateDispatchModal';
import { DispatchSlipPreviewModal } from './DispatchSlipPreviewModal';

interface TaskDetailsDrawerProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateTask: (updatedTask: Task) => void;
  onDeleteTask: (taskId: string) => void;
  currentPersona: FrooUserPersona;
  allTasks?: Task[];
}

export const TaskDetailsDrawer: React.FC<TaskDetailsDrawerProps> = ({
  task,
  isOpen,
  onClose,
  onUpdateTask,
  onDeleteTask,
  currentPersona,
  allTasks = [],
}) => {
  if (!isOpen || !task) return null;

  // Dispatch state
  const [isCreateDispatchOpen, setIsCreateDispatchOpen] = useState(false);
  const [previewDispatchSlip, setPreviewDispatchSlip] = useState<DispatchSlip | null>(null);
  const [dispatchToEdit, setDispatchToEdit] = useState<DispatchSlip | null>(null);

  // Activity update form state
  const [actionTitle, setActionTitle] = useState('');
  const [actorName, setActorName] = useState(currentPersona.name);
  const [actorOffice, setActorOffice] = useState(currentPersona.officeName);
  const [notes, setNotes] = useState('');
  const [newStatusSelection, setNewStatusSelection] = useState<TaskStatus | ''>('');
  const [newOutcomeSelection, setNewOutcomeSelection] = useState<string>('');
  const [isAddingActivity, setIsAddingActivity] = useState(false);

  // Edit operational details state
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editScheduledDate, setEditScheduledDate] = useState(task.scheduledDate || '');
  const [editDueDate, setEditDueDate] = useState(task.dueDate || '');
  const [editLocation, setEditLocation] = useState(task.location || '');
  const [editOutcome, setEditOutcome] = useState(task.outcome || 'Scheduled');
  const [editRemarks, setEditRemarks] = useState(task.remarks || '');
  const [editAssignedTo, setEditAssignedTo] = useState(task.assignedTo || '');
  const [editRegion, setEditRegion] = useState(task.region || '');

  // Quick activity presets
  const quickActions = [
    'Task acknowledged.',
    'Inspection scheduled.',
    'On-site field inspection conducted.',
    'Preliminary inspection findings documented.',
    'Notice of Violation drafted & endorsed.',
    'Establishment verified compliant with standards.',
    'Q2/Q3 operational report submitted.',
    'Task completed & archived.',
  ];

  const handleStatusChange = (newStatus: TaskStatus) => {
    if (newStatus === task.status) return;
    const now = formatDateTime(new Date());
    const newActivity: ActivityItem = {
      id: `act-${Date.now()}`,
      action: `Status changed to ${newStatus}.`,
      actor: currentPersona.name,
      actorOffice: currentPersona.officeName,
      date: now,
      newStatus,
      notes: `Updated status from ${task.status} to ${newStatus}`,
    };

    const updated: Task = {
      ...task,
      status: newStatus,
      activityHistory: [newActivity, ...(task.activityHistory || [])],
    };
    onUpdateTask(updated);
  };

  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionTitle.trim()) return;

    const now = formatDateTime(new Date());
    const newActivity: ActivityItem = {
      id: `act-${Date.now()}`,
      action: actionTitle.trim(),
      actor: actorName.trim() || currentPersona.name,
      actorOffice: actorOffice.trim() || currentPersona.officeName,
      date: now,
      notes: notes.trim() || undefined,
      newStatus: newStatusSelection ? (newStatusSelection as TaskStatus) : undefined,
    };

    const updatedTask: Task = {
      ...task,
      status: newStatusSelection ? (newStatusSelection as TaskStatus) : task.status,
      outcome: newOutcomeSelection ? newOutcomeSelection : task.outcome,
      remarks: notes.trim() ? notes.trim() : task.remarks,
      activityHistory: [newActivity, ...(task.activityHistory || [])],
    };

    onUpdateTask(updatedTask);

    // Reset activity form
    setActionTitle('');
    setNotes('');
    setNewStatusSelection('');
    setNewOutcomeSelection('');
    setIsAddingActivity(false);
  };

  const handleSaveOperationalDetails = () => {
    const updated: Task = {
      ...task,
      scheduledDate: editScheduledDate,
      dueDate: editDueDate,
      location: editLocation,
      outcome: editOutcome,
      remarks: editRemarks,
      assignedTo: editAssignedTo,
      region: editRegion,
      activityHistory: [
        {
          id: `act-${Date.now()}`,
          action: 'Operational details updated.',
          actor: currentPersona.name,
          actorOffice: currentPersona.officeName,
          date: formatDateTime(new Date()),
          notes: `Updated outcome to "${editOutcome}" & location to "${editLocation}"`,
        },
        ...(task.activityHistory || []),
      ],
    };
    onUpdateTask(updated);
    setIsEditingDetails(false);
  };

  const handleSaveDispatch = (slip: DispatchSlip) => {
    const existingIndex = (task.dispatchSlips || []).findIndex((s) => s.id === slip.id);
    let updatedSlips: DispatchSlip[];
    let actionText = '';

    if (existingIndex >= 0) {
      updatedSlips = [...(task.dispatchSlips || [])];
      updatedSlips[existingIndex] = slip;
      actionText = `Dispatch slip ${slip.ctrlNo} updated.`;
    } else {
      updatedSlips = [slip, ...(task.dispatchSlips || [])];
      actionText = `Dispatch slip ${slip.ctrlNo} generated for ${slip.teamLeader}.`;
    }

    const newActivity: ActivityItem = {
      id: `act-${Date.now()}`,
      action: actionText,
      actor: currentPersona.name,
      actorOffice: currentPersona.officeName,
      date: formatDateTime(new Date()),
      notes: `Target: ${slip.establishments.join(', ')} • Date: ${slip.dispatchDate}`,
    };

    const updatedTask: Task = {
      ...task,
      dispatchSlips: updatedSlips,
      activityHistory: [newActivity, ...(task.activityHistory || [])],
    };

    onUpdateTask(updatedTask);
    setDispatchToEdit(null);
  };

  const handleDeleteDispatch = (dispatchId: string) => {
    if (!confirm('Are you sure you want to delete this dispatch slip?')) return;
    const filtered = (task.dispatchSlips || []).filter((s) => s.id !== dispatchId);
    const updatedTask: Task = {
      ...task,
      dispatchSlips: filtered,
    };
    onUpdateTask(updatedTask);
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'In Progress':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'Open':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'Completed':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'Overdue':
        return 'bg-rose-100 text-rose-900 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in"
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md sm:max-w-lg bg-white shadow-2xl border-l border-slate-200 flex flex-col h-full animate-in slide-in-from-right duration-200">
          
          {/* Drawer Top Header (matching Screenshot 3 & 4) */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-emerald-50/40">
            <div>
              <span className="text-xs font-bold tracking-wider text-[#056839] uppercase">
                Field Regulatory Operations
              </span>
              <h2 className="text-base font-bold text-slate-900">Task Details</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete this task?')) {
                    onDeleteTask(task.id);
                    onClose();
                  }
                }}
                className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition"
                title="Delete Task"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Drawer Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            
            {/* Task Title */}
            <div>
              <span className="text-[11px] font-mono text-slate-400">Task ID: {task.id}</span>
              <h3 className="text-lg font-bold text-slate-900 mt-1 leading-snug">
                {task.taskTitle}
              </h3>
            </div>

            {/* Quick Metadata Block (matches Screenshot 3) */}
            <div className="grid grid-cols-2 gap-y-3.5 gap-x-4 text-xs bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
              <div>
                <span className="text-slate-400 block text-[11px] mb-0.5">Category</span>
                <span className="font-semibold text-slate-800">{task.category}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] mb-0.5">Origin</span>
                <span className="font-semibold text-slate-800">{task.origin}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] mb-0.5">Assigned To</span>
                <span className="font-semibold text-slate-800">{task.assignedTo}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] mb-0.5">Region</span>
                <span className="font-semibold text-slate-800">{task.region}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] mb-0.5">Due Date</span>
                <span className="font-semibold text-slate-800">{formatDate(task.dueDate)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] mb-0.5">Priority</span>
                <span className="font-semibold text-slate-800">{task.priority}</span>
              </div>
            </div>

            {/* Interactive Status Bar */}
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-700">Current Status:</span>
                <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${getStatusColor(task.status)}`}>
                  {task.status}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
                {STATUSES.map((st) => (
                  <button
                    key={st}
                    onClick={() => handleStatusChange(st)}
                    className={`py-1.5 px-1 rounded-md text-xs font-medium transition cursor-pointer ${
                      task.status === st
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Operational Details Section (matching Screenshot 3 & 4) */}
            <div className="pt-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                  Operational Details
                </h4>
                <button
                  onClick={() => setIsEditingDetails(!isEditingDetails)}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>{isEditingDetails ? 'Cancel Edit' : 'Edit Details'}</span>
                </button>
              </div>

              {!isEditingDetails ? (
                <div className="space-y-3.5 text-xs text-slate-700">
                  <div>
                    <span className="text-slate-400 block text-[11px] mb-0.5">Description</span>
                    <p className="text-slate-800 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                      {task.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">Scheduled Date</span>
                      <p className="font-medium text-slate-800">{formatDate(task.scheduledDate)}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">Location</span>
                      <p className="font-medium text-slate-800">{task.location || '—'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">Outcome</span>
                      <p className="font-medium text-[#056839] bg-emerald-50/80 px-2 py-1 rounded inline-block border border-emerald-200">
                        {task.outcome || 'Scheduled'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">Originating Office</span>
                      <p className="font-medium text-slate-800">{task.createdBy}</p>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px] mb-0.5">Remarks</span>
                    <p className="text-slate-700 italic bg-amber-50/50 p-2.5 rounded-lg border border-amber-100">
                      {task.remarks || 'No remarks noted.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Scheduled Date</label>
                    <input
                      type="date"
                      value={editScheduledDate}
                      onChange={(e) => setEditScheduledDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Due Date</label>
                    <input
                      type="date"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Location</label>
                    <input
                      type="text"
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Outcome</label>
                    <select
                      value={editOutcome}
                      onChange={(e) => setEditOutcome(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                    >
                      {OUTCOMES.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Assigned To</label>
                    <input
                      type="text"
                      value={editAssignedTo}
                      onChange={(e) => setEditAssignedTo(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Remarks</label>
                    <textarea
                      rows={2}
                      value={editRemarks}
                      onChange={(e) => setEditRemarks(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingDetails(false)}
                      className="px-3 py-1 bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveOperationalDetails}
                      className="px-3 py-1 bg-[#056839] text-white rounded hover:bg-[#04522d] font-medium cursor-pointer"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Activity History Section (matching Screenshot 3 & 4) */}
            <div className="pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <History className="w-4 h-4 text-[#056839]" />
                  <h4 className="text-sm font-bold text-slate-900">Activity History</h4>
                </div>
                <button
                  onClick={() => setIsAddingActivity(!isAddingActivity)}
                  className="text-xs bg-emerald-50 hover:bg-emerald-100 text-[#056839] border border-emerald-200 font-semibold px-2.5 py-1 rounded-md transition cursor-pointer"
                >
                  {isAddingActivity ? 'Cancel' : '+ Add Activity'}
                </button>
              </div>

              {/* Add Activity Form for Cross-Office Collaboration */}
              {isAddingActivity && (
                <form
                  onSubmit={handleAddActivity}
                  className="bg-emerald-50/50 border border-emerald-200/80 rounded-xl p-4 mb-4 text-xs space-y-3 animate-in fade-in"
                >
                  <div className="flex items-center justify-between pb-1 border-b border-emerald-200/60">
                    <span className="font-bold text-emerald-950">Post Task Progress Update</span>
                    <span className="text-[11px] text-[#056839] font-medium">Cross-Office Log</span>
                  </div>

                  {/* Actor details (prefilled with current office / persona) */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        Updating Staff
                      </label>
                      <input
                        type="text"
                        value={actorName}
                        onChange={(e) => setActorName(e.target.value)}
                        placeholder="Staff Name"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        Office / Region
                      </label>
                      <input
                        type="text"
                        value={actorOffice}
                        onChange={(e) => setActorOffice(e.target.value)}
                        placeholder="Office / Unit"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                      />
                    </div>
                  </div>

                  {/* Action Title / Quick presets */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Action / Update Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={actionTitle}
                      onChange={(e) => setActionTitle(e.target.value)}
                      placeholder="e.g. Task acknowledged, Inspection scheduled, Findings drafted"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                    />

                    {/* Quick Preset Buttons */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {quickActions.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setActionTitle(preset)}
                          className="text-[10px] bg-white hover:bg-blue-100/70 border border-slate-200 text-slate-700 px-2 py-0.5 rounded cursor-pointer transition"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes / Findings */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Detailed Remarks / Findings (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Enter specific notes, findings, or coordination details..."
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs resize-none"
                    />
                  </div>

                  {/* Optional Status / Outcome Synchronizer */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-blue-200/50">
                    <div>
                      <label className="text-[11px] text-slate-600 block mb-0.5">
                        Set New Status (Optional)
                      </label>
                      <select
                        value={newStatusSelection}
                        onChange={(e) => setNewStatusSelection(e.target.value as TaskStatus)}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                      >
                        <option value="">Keep current ({task.status})</option>
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            Change to {s}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-600 block mb-0.5">
                        Set Outcome (Optional)
                      </label>
                      <select
                        value={newOutcomeSelection}
                        onChange={(e) => setNewOutcomeSelection(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                      >
                        <option value="">Keep current ({task.outcome || 'None'})</option>
                        {OUTCOMES.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Submit */}
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingActivity(false)}
                      className="px-3 py-1 bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-[#056839] text-white rounded font-medium hover:bg-[#04522d] flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Send className="w-3 h-3" />
                      <span>Post Update</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Vertical Timeline matching Screenshot 3 & 4 */}
              <div className="relative pl-6 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {task.activityHistory && task.activityHistory.length > 0 ? (
                  task.activityHistory.map((item) => (
                    <div key={item.id} className="relative group text-xs">
                      {/* FDA Green Dot Bullet */}
                      <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[#056839] ring-4 ring-white" />

                      <div className="space-y-0.5">
                        <p className="font-semibold text-slate-900 leading-snug">
                          {item.action}
                        </p>
                        <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                          <span className="font-medium text-slate-700">{item.actor}</span>
                          {item.actorOffice && (
                            <span className="text-slate-400">({item.actorOffice})</span>
                          )}
                          <span>•</span>
                          <span>{item.date}</span>
                        </div>
                        {item.notes && (
                          <p className="text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 text-[11px] mt-1.5">
                            {item.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">No activity recorded yet.</p>
                )}
              </div>
            </div>

            {/* Dispatch Section (matching user request) */}
            <div className="pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-[#056839]" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Dispatch</h4>
                    <span className="text-[11px] text-slate-400 block -mt-0.5">
                      FROO Official Dispatch Orders & Slips
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setDispatchToEdit(null);
                    setIsCreateDispatchOpen(true);
                  }}
                  className="text-xs bg-[#056839] hover:bg-[#04522d] text-white font-medium px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>+ Create Dispatch</span>
                </button>
              </div>

              {/* Slips List */}
              <div className="space-y-3">
                {task.dispatchSlips && task.dispatchSlips.length > 0 ? (
                  task.dispatchSlips.map((slip) => (
                    <div
                      key={slip.id}
                      className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs hover:border-emerald-300 transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs bg-emerald-50 text-emerald-900 border border-emerald-200 px-2 py-0.5 rounded">
                              CTRL: {slip.ctrlNo}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                slip.status === 'Approved'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : slip.status === 'Dispatched'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {slip.status}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 block mt-1">
                            Dispatch Date: <strong className="text-slate-800">{slip.dispatchDate}</strong>
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setPreviewDispatchSlip(slip)}
                            className="p-1.5 text-slate-500 hover:text-[#056839] hover:bg-emerald-50 rounded-md transition cursor-pointer"
                            title="Preview Dispatch Slip"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setDispatchToEdit(slip);
                              setIsCreateDispatchOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition cursor-pointer"
                            title="Edit Dispatch Slip"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteDispatch(slip.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
                            title="Delete Dispatch Slip"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Establishments preview */}
                      <div className="mt-2.5 text-xs">
                        <span className="text-[11px] text-slate-400 font-medium block">
                          Establishments ({slip.establishments.length}):
                        </span>
                        <div className="space-y-0.5 mt-0.5">
                          {slip.establishments.map((est, idx) => (
                            <div key={idx} className="font-semibold text-slate-800 text-[11px] truncate">
                              {idx + 1}. {est}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Team Leader & Vehicle */}
                      <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Team Leader:</span>
                          <span className="font-medium text-slate-800 truncate block">
                            {slip.teamLeader}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Vehicle / Plate:</span>
                          <span className="font-medium text-slate-800 truncate block">
                            {slip.vehiclePlateNumber || 'N/A'}
                          </span>
                        </div>
                      </div>

                      {/* Bottom Quick Button: Extract to PDF */}
                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">
                          Template: FDA Philippines Order
                        </span>
                        <button
                          onClick={() => setPreviewDispatchSlip(slip)}
                          className="bg-emerald-50 hover:bg-emerald-100 text-[#056839] font-semibold text-xs px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer border border-emerald-200"
                        >
                          <FileDown className="w-3.5 h-3.5 text-[#056839]" />
                          <span>Extract to PDF</span>
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <Truck className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                    <p className="text-xs font-semibold text-slate-600">No dispatch slips created yet</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs mx-auto">
                      Generate official dispatch slips for field inspections, PMS surveillance, or regulatory monitoring.
                    </p>
                    <button
                      onClick={() => {
                        setDispatchToEdit(null);
                        setIsCreateDispatchOpen(true);
                      }}
                      className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#056839] hover:text-emerald-800 hover:underline cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Create first dispatch slip</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between text-xs text-slate-500">
            <span>FROO Regulatory Tracking System</span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-100 cursor-pointer"
            >
              Close
            </button>
          </div>

        </div>
      </div>

      {/* Create / Edit Dispatch Slip Modal */}
      {isCreateDispatchOpen && (
        <CreateDispatchModal
          isOpen={isCreateDispatchOpen}
          onClose={() => {
            setIsCreateDispatchOpen(false);
            setDispatchToEdit(null);
          }}
          onSaveDispatch={handleSaveDispatch}
          task={task}
          existingSlip={dispatchToEdit}
          allTasks={allTasks}
        />
      )}

      {/* Dispatch Slip Full Letterhead Preview & PDF Extraction Modal */}
      {previewDispatchSlip && (
        <DispatchSlipPreviewModal
          slip={previewDispatchSlip}
          isOpen={Boolean(previewDispatchSlip)}
          onClose={() => setPreviewDispatchSlip(null)}
          onEdit={(slip) => {
            setDispatchToEdit(slip);
            setIsCreateDispatchOpen(true);
          }}
        />
      )}
    </div>
  );
};
