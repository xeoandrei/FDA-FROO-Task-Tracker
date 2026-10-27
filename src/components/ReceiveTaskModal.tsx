import React from 'react';
import { X, CheckCircle2, AlertTriangle, ShieldCheck, UserCheck, Calendar, MapPin, Hash } from 'lucide-react';
import { Task } from '../types/task';
import { UserAccount } from '../types/auth';
import { validateCanReceiveTask } from '../utils/taskAuthorization';
import { formatDate } from '../utils/storage';

interface ReceiveTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  currentUser: UserAccount | null;
  onConfirmAccept: (task: Task) => void;
}

export const ReceiveTaskModal: React.FC<ReceiveTaskModalProps> = ({
  isOpen,
  onClose,
  task,
  currentUser,
  onConfirmAccept,
}) => {
  if (!isOpen || !task) return null;

  const validation = validateCanReceiveTask(task, currentUser);
  const nowFormatted = new Date().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleConfirm = () => {
    if (!validation.allowed) return;
    onConfirmAccept(task);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-950 via-[#056839] to-emerald-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
              <CheckCircle2 className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-white">
                Confirm Task Acceptance
              </h3>
              <p className="text-[11px] text-emerald-200/90">
                FDA Field Regulatory Operations Office • Official Receipt
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded-md hover:bg-white/10 transition cursor-pointer"
            title="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 text-xs">
          {/* Validation Error / Warning if not allowed */}
          {!validation.allowed && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Action Restricted</strong>
                <span className="text-[11.5px] leading-relaxed mt-0.5 block">
                  {validation.reason || 'You are not authorized to receive this task.'}
                </span>
              </div>
            </div>
          )}

          {/* Prompt message */}
          <div>
            <p className="text-slate-700 text-sm leading-relaxed">
              Are you sure you want to officially <strong className="text-emerald-900">receive and accept</strong> this task into <span className="font-semibold text-amber-700">In-Progress</span> operational status?
            </p>
          </div>

          {/* Task Snapshot Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <span className="font-mono text-xs font-bold text-slate-700">
                {task.id}
              </span>
              {task.dtn && (
                <span className="font-mono text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  DTN: {task.dtn}
                </span>
              )}
            </div>

            <h4 className="text-slate-900 font-bold text-sm leading-snug">
              {task.taskTitle}
            </h4>

            <div className="grid grid-cols-2 gap-2 pt-1 text-[11.5px]">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Category</span>
                <span className="text-slate-700 font-medium">{task.category}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Region</span>
                <span className="text-slate-700 font-medium">{task.region}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Assigned To</span>
                <span className="text-slate-700 font-semibold">{task.assignedTo}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Due Date</span>
                <span className="text-slate-700 font-medium">{formatDate(task.dueDate)}</span>
              </div>
            </div>
          </div>

          {/* Recipient Audit Preview */}
          {currentUser && (
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-xs">
                <ShieldCheck className="w-4 h-4 text-[#056839]" />
                <span>Audit Trail Record to be Recorded</span>
              </div>
              <div className="text-[11.5px] text-emerald-900 space-y-0.5 pt-0.5">
                <div>
                  Recipient: <strong>{currentUser.firstName} {currentUser.lastName}</strong> ({currentUser.position})
                </div>
                <div>
                  Office: <strong>{currentUser.office}</strong> • Role: <strong>{currentUser.role}</strong>
                </div>
                <div>
                  Timestamp: <strong className="font-mono">{nowFormatted}</strong>
                </div>
              </div>
            </div>
          )}

          <p className="text-[11px] text-slate-500 italic">
            Once received, the task will advance to In Progress. Ordinary users will not be permitted to revert this task back to Open status.
          </p>
        </div>

        {/* Modal Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition cursor-pointer"
          >
            No, Cancel
          </button>
          <button
            type="button"
            disabled={!validation.allowed}
            onClick={handleConfirm}
            className={`px-5 py-2 text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer ${
              validation.allowed
                ? 'bg-[#056839] hover:bg-[#04522d] text-white cursor-pointer active:scale-98'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Yes, Accept Task</span>
          </button>
        </div>
      </div>
    </div>
  );
};
