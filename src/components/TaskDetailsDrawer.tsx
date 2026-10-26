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
  CheckCircle2,
  Inbox,
  ThumbsUp,
  ThumbsDown,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { Task, TaskStatus, TaskPriority, ActivityItem, FrooUserPersona, DispatchSlip, DispatchStatus } from '../types/task';
import { UserAccount } from '../types/auth';
import { formatDate, formatDateTime } from '../utils/storage';
import { OUTCOMES, STATUSES, FROO_OFFICES, CATEGORIES } from '../data/offices';
import { logSystemAction } from '../utils/authStorage';
import { CreateDispatchModal } from './CreateDispatchModal';
import { DispatchSlipPreviewModal } from './DispatchSlipPreviewModal';

interface TaskDetailsDrawerProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateTask: (updatedTask: Task) => void;
  onDeleteTask: (taskId: string) => void;
  currentPersona?: FrooUserPersona;
  currentUser?: UserAccount | null;
  allTasks?: Task[];
}

export const TaskDetailsDrawer: React.FC<TaskDetailsDrawerProps> = ({
  task,
  isOpen,
  onClose,
  onUpdateTask,
  onDeleteTask,
  currentPersona,
  currentUser,
  allTasks = [],
}) => {
  if (!isOpen || !task) return null;

  // Active user name and office fallback
  const actorName = currentUser
    ? `${currentUser.firstName} ${currentUser.lastName}`
    : currentPersona?.name || 'Authorized Officer';
  const actorOffice = currentUser?.office || currentPersona?.officeName || task.region;

  // Dispatch state
  const [isCreateDispatchOpen, setIsCreateDispatchOpen] = useState(false);
  const [previewDispatchSlip, setPreviewDispatchSlip] = useState<DispatchSlip | null>(null);
  const [dispatchToEdit, setDispatchToEdit] = useState<DispatchSlip | null>(null);

  // Complete Task Modal state
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [completionOutcome, setCompletionOutcome] = useState('Compliant - Passed');
  const [completionRemarks, setCompletionRemarks] = useState('');

  // Activity update form state
  const [actionTitle, setActionTitle] = useState('');
  const [activityNotes, setActivityNotes] = useState('');
  const [activityStatusChange, setActivityStatusChange] = useState<string>('no-change');

  // Edit fields mode
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editScheduledDate, setEditScheduledDate] = useState(task.scheduledDate || '');
  const [editLocation, setEditLocation] = useState(task.location || '');
  const [editOutcome, setEditOutcome] = useState(task.outcome || 'Scheduled');
  const [editRemarks, setEditRemarks] = useState(task.remarks || '');
  const [editAssignedTo, setEditAssignedTo] = useState(task.assignedTo);
  const [editRegion, setEditRegion] = useState(task.region);

  // Receive Task handler
  const handleReceiveTask = () => {
    const formattedNow = formatDateTime(new Date());
    const newActivity: ActivityItem = {
      id: `act-${Date.now()}`,
      action: `Task received and accepted into In-Progress execution.`,
      actor: actorName,
      actorOffice: actorOffice,
      date: formattedNow,
      notes: `Official receipt recorded by ${actorName}. Field regulatory operation initiated.`,
      newStatus: 'In Progress',
    };

    const updatedTask: Task = {
      ...task,
      status: 'In Progress',
      receivedAt: new Date().toISOString(),
      receivedBy: actorName,
      activityHistory: [newActivity, ...(task.activityHistory || [])],
    };

    onUpdateTask(updatedTask);

    if (currentUser) {
      logSystemAction(
        'TASK_RECEIVED',
        currentUser,
        `Task "${task.taskTitle}" received and accepted by ${actorName}. Status updated to In Progress.`,
        { targetEntityId: task.id, targetEntityName: task.taskTitle }
      );
    }
  };

  // Complete Task handler
  const handleConfirmCompletion = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedNow = formatDateTime(new Date());

    const newActivity: ActivityItem = {
      id: `act-${Date.now()}`,
      action: `Task marked as Completed. Final Outcome: ${completionOutcome}.`,
      actor: actorName,
      actorOffice: actorOffice,
      date: formattedNow,
      notes: completionRemarks || 'Regulatory mission concluded with documented findings.',
      newStatus: 'Completed',
    };

    const updatedTask: Task = {
      ...task,
      status: 'Completed',
      outcome: completionOutcome,
      remarks: completionRemarks ? `${task.remarks ? task.remarks + ' | ' : ''}${completionRemarks}` : task.remarks,
      completedAt: new Date().toISOString(),
      completedBy: actorName,
      activityHistory: [newActivity, ...(task.activityHistory || [])],
    };

    onUpdateTask(updatedTask);
    setIsCompleteModalOpen(false);

    if (currentUser) {
      logSystemAction(
        'TASK_COMPLETED',
        currentUser,
        `Task "${task.taskTitle}" marked as Completed. Outcome: ${completionOutcome}.`,
        { targetEntityId: task.id, targetEntityName: task.taskTitle }
      );
    }
  };

  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionTitle.trim()) return;

    const newStatus =
      activityStatusChange !== 'no-change'
        ? (activityStatusChange as TaskStatus)
        : undefined;

    const newActivity: ActivityItem = {
      id: `act-${Date.now()}`,
      action: actionTitle.trim(),
      actor: actorName,
      actorOffice: actorOffice,
      date: formatDateTime(new Date()),
      notes: activityNotes.trim() || undefined,
      newStatus: newStatus,
    };

    const updatedTask: Task = {
      ...task,
      status: newStatus || task.status,
      activityHistory: [newActivity, ...(task.activityHistory || [])],
    };

    onUpdateTask(updatedTask);

    if (currentUser) {
      logSystemAction(
        'TASK_STATUS_CHANGED',
        currentUser,
        `Updated activity on "${task.taskTitle}": ${actionTitle.trim()}`,
        { targetEntityId: task.id, targetEntityName: task.taskTitle }
      );
    }

    // Reset inputs
    setActionTitle('');
    setActivityNotes('');
    setActivityStatusChange('no-change');
  };

  const handleSaveOperationalDetails = () => {
    const updated: Task = {
      ...task,
      scheduledDate: editScheduledDate,
      location: editLocation,
      outcome: editOutcome,
      remarks: editRemarks,
      assignedTo: editAssignedTo,
      region: editRegion,
      activityHistory: [
        {
          id: `act-${Date.now()}`,
          action: 'Operational details updated.',
          actor: actorName,
          actorOffice: actorOffice,
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
      actionText = `Dispatch slip ${slip.ctrlNo} updated. Status: ${slip.status}.`;
    } else {
      updatedSlips = [slip, ...(task.dispatchSlips || [])];
      actionText = `Dispatch slip ${slip.ctrlNo} generated for ${slip.teamLeader}. Status: ${slip.status}.`;
    }

    const newActivity: ActivityItem = {
      id: `act-${Date.now()}`,
      action: actionText,
      actor: actorName,
      actorOffice: actorOffice,
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

    if (currentUser) {
      logSystemAction(
        'DISPATCH_CREATED',
        currentUser,
        `Generated dispatch slip ${slip.ctrlNo} for task "${task.taskTitle}". Status: ${slip.status}.`,
        { targetEntityId: slip.ctrlNo, targetEntityName: slip.establishments[0] }
      );
    }
  };

  // Dispatch Approval / Rejection logic based on specified hierarchy:
  // if rank and file -> regional supervisors can approve
  // if regional supervisors & cluster directors -> oddg froo only can approve
  const canApproveSlip = (slip: DispatchSlip): { canApprove: boolean; reason?: string } => {
    if (!currentUser) return { canApprove: true };
    if (currentUser.role === 'SUPERADMIN') return { canApprove: true };

    if (slip.status === 'Pending Regional Supervisor Approval') {
      // Allowed: Regional Supervisor of that region, Admin (ODDG-FROO), or Superadmin
      if (currentUser.role === 'ADMIN') return { canApprove: true };
      if (currentUser.role === 'REGIONAL_SUPERVISOR') {
        if (currentUser.office.toLowerCase().includes(task.region.toLowerCase()) || task.region.toLowerCase().includes(currentUser.office.toLowerCase())) {
          return { canApprove: true };
        }
        return { canApprove: false, reason: `Requires Supervisor of ${task.region}` };
      }
      return { canApprove: false, reason: 'Requires Regional Supervisor or ODDG-FROO approval' };
    }

    if (slip.status === 'Pending ODDG Approval') {
      // Allowed: strictly ODDG-FROO Admin or Superadmin
      if (currentUser.role === 'ADMIN' || currentUser.office === 'ODDG-FROO') {
        return { canApprove: true };
      }
      return { canApprove: false, reason: 'Requires approval by Deputy Director General (ODDG-FROO)' };
    }

    return { canApprove: false };
  };

  const handleApproveDispatchSlip = (slip: DispatchSlip) => {
    const approverTitle = currentUser ? currentUser.position : 'Deputy Director General, FROO';
    const approverName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'ATTY. FRANKLIN ANTHONY M. TABAQUIN, IV';

    const updatedSlip: DispatchSlip = {
      ...slip,
      status: 'Approved',
      approvedBy: {
        name: approverName.toUpperCase(),
        title: approverTitle,
        signatureDate: new Date().toLocaleDateString('en-US'),
        signedBy: currentUser?.email || 'ODDG-FROO',
      },
    };

    const updatedSlips = (task.dispatchSlips || []).map((s) => (s.id === slip.id ? updatedSlip : s));

    const newActivity: ActivityItem = {
      id: `act-${Date.now()}`,
      action: `Official Dispatch Slip ${slip.ctrlNo} APPROVED by ${approverName} (${approverTitle}).`,
      actor: approverName,
      actorOffice: actorOffice,
      date: formatDateTime(new Date()),
      notes: `Authorization granted for field deployment on ${slip.dispatchDate}.`,
    };

    const updatedTask: Task = {
      ...task,
      dispatchSlips: updatedSlips,
      activityHistory: [newActivity, ...(task.activityHistory || [])],
    };

    onUpdateTask(updatedTask);

    if (currentUser) {
      logSystemAction(
        'DISPATCH_APPROVED',
        currentUser,
        `Approved dispatch slip ${slip.ctrlNo} for task "${task.taskTitle}". Authorized field execution.`,
        { targetEntityId: slip.ctrlNo, targetEntityName: slip.establishments[0] }
      );
    }
  };

  const handleRejectDispatchSlip = (slip: DispatchSlip) => {
    const reason = prompt('Please enter the reason for rejecting this dispatch request:');
    if (!reason) return;

    const updatedSlip: DispatchSlip = {
      ...slip,
      status: 'Rejected',
      rejectionReason: reason,
    };

    const updatedSlips = (task.dispatchSlips || []).map((s) => (s.id === slip.id ? updatedSlip : s));

    const newActivity: ActivityItem = {
      id: `act-${Date.now()}`,
      action: `Dispatch Slip ${slip.ctrlNo} REJECTED.`,
      actor: actorName,
      actorOffice: actorOffice,
      date: formatDateTime(new Date()),
      notes: `Reason: ${reason}`,
    };

    const updatedTask: Task = {
      ...task,
      dispatchSlips: updatedSlips,
      activityHistory: [newActivity, ...(task.activityHistory || [])],
    };

    onUpdateTask(updatedTask);

    if (currentUser) {
      logSystemAction(
        'DISPATCH_REJECTED',
        currentUser,
        `Rejected dispatch slip ${slip.ctrlNo}. Reason: ${reason}`,
        { targetEntityId: slip.ctrlNo }
      );
    }
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
    <div className="fixed inset-0 z-40 overflow-hidden bg-slate-900/40 backdrop-blur-2xs flex justify-end">
      {/* Sliding Drawer */}
      <div className="w-full max-w-xl sm:max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200 font-sans">
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase block">
              FROO Task File • {task.id}
            </span>
            <h2 className="text-base font-bold text-slate-900 line-clamp-1">
              Task Details
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onDeleteTask(task.id)}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
              title="Delete Task"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-600">
          {/* Main Task Title & Badges */}
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-900 leading-snug">
              {task.taskTitle}
            </h3>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                  task.status
                )}`}
              >
                {task.status}
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                Priority: <strong>{task.priority}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                Category: <strong>{task.category}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200">
                Region: <strong>{task.region}</strong>
              </span>
            </div>
          </div>

          {/* TASK LIFECYCLE ACTION BANNER (Open -> Receive -> In Progress -> Complete) */}
          {task.status === 'Open' && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Inbox className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wide">
                    Task Awaiting Assignee Acceptance
                  </h4>
                  <p className="text-[11.5px] text-blue-800 mt-0.5 leading-snug">
                    Assigned to <strong>{task.assignedTo}</strong> ({task.region}). Click Receive Task to accept responsibility and advance status to <em>In Progress</em>.
                  </p>
                  <div className="mt-3">
                    <button
                      onClick={handleReceiveTask}
                      className="px-4 py-2 text-xs font-bold text-white bg-[#056839] hover:bg-[#04522d] rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Receive & Accept Task</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {task.status === 'In Progress' && (
            <div className="bg-gradient-to-r from-amber-50 to-emerald-50 border border-amber-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                      Field Operation In Progress
                    </h4>
                    <p className="text-[11.5px] text-amber-900 mt-0.5 leading-snug">
                      Active execution underway. Once regulatory field inspection or PMS has concluded, mark as completed.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCompleteModalOpen(true)}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer self-center"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mark as Completed</span>
                </button>
              </div>
            </div>
          )}

          {task.status === 'Completed' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <span className="text-xs font-bold text-emerald-900 block">
                  Task Successfully Completed
                </span>
                <span className="text-[11px] text-emerald-800">
                  Concluded by <strong>{task.completedBy || task.assignedTo}</strong>. Outcome: {task.outcome || 'Passed'}.
                </span>
              </div>
            </div>
          )}

          {/* Quick Info Grid (Matching Screenshot 3) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Category</span>
              <span className="font-semibold text-slate-800 text-xs">{task.category}</span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Origin</span>
              <span className="font-semibold text-slate-800 text-xs">{task.origin}</span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Assigned To</span>
              <div className="flex items-center gap-1 text-slate-800 font-semibold text-xs">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>{task.assignedTo}</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Region</span>
              <span className="font-semibold text-slate-800 text-xs">{task.region}</span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Due Date</span>
              <div className="flex items-center gap-1 text-slate-800 font-semibold text-xs">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{formatDate(task.dueDate)}</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Priority</span>
              <span className="font-semibold text-slate-800 text-xs">{task.priority}</span>
            </div>
          </div>

          {/* Operational Details (Matching Screenshot 3) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Operational Details
              </h4>
              <button
                type="button"
                onClick={() => setIsEditingDetails(!isEditingDetails)}
                className="text-xs text-[#056839] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>{isEditingDetails ? 'Cancel' : 'Edit Details'}</span>
              </button>
            </div>

            {isEditingDetails ? (
              <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Assigned Personnel</label>
                  <input
                    type="text"
                    value={editAssignedTo}
                    onChange={(e) => setEditAssignedTo(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 focus:border-[#056839]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Scheduled Date</label>
                    <input
                      type="date"
                      value={editScheduledDate}
                      onChange={(e) => setEditScheduledDate(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 focus:border-[#056839]"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Outcome</label>
                    <select
                      value={editOutcome}
                      onChange={(e) => setEditOutcome(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 focus:border-[#056839]"
                    >
                      {OUTCOMES.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Location / Establishment</label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 focus:border-[#056839]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Remarks & Field Findings</label>
                  <textarea
                    rows={2}
                    value={editRemarks}
                    onChange={(e) => setEditRemarks(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 focus:border-[#056839]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsEditingDetails(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveOperationalDetails}
                    className="px-3 py-1.5 text-xs bg-[#056839] text-white rounded font-semibold hover:bg-[#04522d]"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block">Description</span>
                  <p className="text-slate-800 font-normal leading-relaxed text-xs mt-0.5">
                    {task.description || 'No operational description provided.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 block">Scheduled Date</span>
                    <span className="text-slate-800 font-medium text-xs">
                      {task.scheduledDate ? formatDate(task.scheduledDate) : 'Not scheduled'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 block">Location</span>
                    <span className="text-slate-800 font-medium text-xs">
                      {task.location || 'Not specified'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block">Outcome</span>
                  <span className="font-semibold text-slate-900 text-xs">
                    {task.outcome || 'Scheduled'}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block">Remarks</span>
                  <p className="text-slate-700 italic text-xs mt-0.5">
                    {task.remarks || 'No operational remarks yet.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Activity History Section (Matching Screenshot 4) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-slate-500" />
                <span>Activity History</span>
              </h4>
              <span className="text-[11px] text-slate-400">
                {(task.activityHistory || []).length} logs
              </span>
            </div>

            {/* Timeline */}
            <div className="relative pl-4 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {task.activityHistory && task.activityHistory.length > 0 ? (
                task.activityHistory.map((item) => (
                  <div key={item.id} className="relative group">
                    <div className="absolute -left-4 top-1.5 w-3 h-3 rounded-full bg-blue-600 ring-4 ring-white" />
                    <div>
                      <div className="font-medium text-slate-900 text-xs">
                        {item.action}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <span>{item.actor}</span>
                        {item.actorOffice && (
                          <>
                            <span>•</span>
                            <span className="font-medium text-slate-600">{item.actorOffice}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>{item.date}</span>
                      </div>
                      {item.notes && (
                        <p className="mt-1 text-[11.5px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200">
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

            {/* Quick Log Form */}
            <form onSubmit={handleAddActivity} className="mt-4 pt-4 border-t border-slate-200 space-y-2.5">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
                + Add Activity Log
              </span>
              <input
                type="text"
                required
                value={actionTitle}
                onChange={(e) => setActionTitle(e.target.value)}
                placeholder="Action taken (e.g., Sample collected, Site visit concluded)..."
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-[#056839]"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={activityStatusChange}
                  onChange={(e) => setActivityStatusChange(e.target.value)}
                  className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 focus:border-[#056839]"
                >
                  <option value="no-change">Leave Status: {task.status}</option>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>Change Status to: {s}</option>
                  ))}
                </select>

                <input
                  type="text"
                  value={activityNotes}
                  onChange={(e) => setActivityNotes(e.target.value)}
                  placeholder="Additional notes / reference..."
                  className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 focus:border-[#056839]"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Log Activity</span>
                </button>
              </div>
            </form>
          </div>

          {/* DISPATCH SECTION (Following User Request) */}
          <div className="space-y-3 pt-4 border-t-2 border-dashed border-slate-200">
            <div className="flex items-center justify-between pb-1">
              <div>
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#056839]" />
                  <span>Field Dispatch Slips</span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  Official mission orders, FDRO authorizations, and supervisor approvals
                </p>
              </div>

              <button
                type="button"
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
                task.dispatchSlips.map((slip) => {
                  const { canApprove, reason } = canApproveSlip(slip);

                  return (
                    <div
                      key={slip.id}
                      className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs hover:border-emerald-300 transition space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-xs bg-emerald-50 text-emerald-900 border border-emerald-200 px-2 py-0.5 rounded">
                              CTRL: {slip.ctrlNo}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                slip.status === 'Approved'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : slip.status === 'Pending Regional Supervisor Approval'
                                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                                  : slip.status === 'Pending ODDG Approval'
                                  ? 'bg-indigo-100 text-indigo-900 border-indigo-300'
                                  : slip.status === 'Rejected'
                                  ? 'bg-rose-100 text-rose-900 border-rose-300'
                                  : 'bg-slate-100 text-slate-800 border-slate-300'
                              }`}
                            >
                              {slip.status}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 block mt-1">
                            Dispatch Date: <strong className="text-slate-800">{slip.dispatchDate}</strong>
                          </span>
                        </div>

                        {/* Top Actions */}
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
                      <div className="text-xs">
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
                      <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
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

                      {/* APPROVAL ACTION BAR (Supervisor / ODDG) */}
                      {slip.status.includes('Pending') && (
                        <div className="mt-2 pt-2 border-t border-slate-100 bg-slate-50 p-2.5 rounded-lg flex items-center justify-between gap-2 flex-wrap">
                          <div className="text-[11px] text-slate-600">
                            <span className="font-semibold text-slate-800 block">Approval Routing:</span>
                            {slip.status === 'Pending Regional Supervisor Approval' ? (
                              <span>Awaiting Regional Supervisor of {task.region}</span>
                            ) : (
                              <span>Awaiting Deputy Director General (ODDG-FROO)</span>
                            )}
                          </div>

                          {canApprove ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleApproveDispatchSlip(slip)}
                                className="px-2.5 py-1 text-[11px] font-bold text-white bg-[#056839] hover:bg-[#04522d] rounded transition flex items-center gap-1 cursor-pointer shadow-xs"
                              >
                                <ThumbsUp className="w-3 h-3" />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => handleRejectDispatchSlip(slip)}
                                className="px-2.5 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition flex items-center gap-1 cursor-pointer"
                              >
                                <ThumbsDown className="w-3 h-3" />
                                <span>Reject</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">
                              {reason || 'Approval rights reserved to authorized supervisor'}
                            </span>
                          )}
                        </div>
                      )}

                      {slip.status === 'Approved' && slip.approvedBy && (
                        <div className="mt-1 text-[10.5px] text-emerald-800 bg-emerald-50/70 p-2 rounded border border-emerald-100 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>
                            Approved by: <strong>{slip.approvedBy.name}</strong> ({slip.approvedBy.title})
                          </span>
                        </div>
                      )}

                      {/* Bottom Quick Button: Extract to PDF */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10.5px] text-slate-400">
                          Template: FROO Dispatch Order (Standard Form)
                        </span>
                        <button
                          onClick={() => setPreviewDispatchSlip(slip)}
                          className="text-xs text-[#056839] hover:text-[#04522d] font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                          <span>Extract to PDF</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl p-4">
                  <Truck className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                  <p className="text-xs font-semibold text-slate-600">No dispatch slips created yet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Generate official dispatch slips for field inspections, PMS surveillance, or regulatory monitoring.
                  </p>
                  <button
                    onClick={() => {
                      setDispatchToEdit(null);
                      setIsCreateDispatchOpen(true);
                    }}
                    className="mt-3 text-xs text-[#056839] font-bold hover:underline inline-flex items-center gap-1"
                  >
                    <span>Create first dispatch slip</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-slate-400 text-[11px]">
            Created by <strong className="text-slate-700">{task.createdBy}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-md transition shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>

      {/* COMPLETE TASK MODAL */}
      {isCompleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 border border-slate-200 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Mark Task as Completed</span>
              </h3>
              <button
                onClick={() => setIsCompleteModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmCompletion} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Regulatory Outcome *
                </label>
                <select
                  value={completionOutcome}
                  onChange={(e) => setCompletionOutcome(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 focus:border-[#056839]"
                >
                  {OUTCOMES.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Final Findings & Field Remarks
                </label>
                <textarea
                  rows={3}
                  value={completionRemarks}
                  onChange={(e) => setCompletionRemarks(e.target.value)}
                  placeholder="Summarize the inspection findings, samples collected, violations noted, or resolution..."
                  className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 focus:border-[#056839]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCompleteModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#056839] hover:bg-[#04522d] rounded shadow-xs"
                >
                  Complete Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create or Edit Dispatch Slip */}
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
        currentUser={currentUser}
      />

      {/* Modal: Preview Dispatch Slip and Export to PDF */}
      <DispatchSlipPreviewModal
        isOpen={Boolean(previewDispatchSlip)}
        onClose={() => setPreviewDispatchSlip(null)}
        slip={previewDispatchSlip}
        />
    </div>
  );
};
