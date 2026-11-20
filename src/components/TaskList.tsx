import React from 'react';
import { Task, TaskStatus, TaskPriority } from '../types/task';
import { formatDate } from '../utils/storage';
import { splitAssigneeNames, isNameSuffixToken } from '../utils/taskAuthorization';
import { ChevronRight, Building2, Calendar, User } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  selectedTaskId?: string;
  onQuickStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
  onReceiveTask?: (task: Task) => void;
  currentUserName?: string;
  activeView?: 'MY_TASKS' | 'TASKS_TO_RECEIVE' | 'ALL_TASKS';
}

const COMPOUND_SURNAME_PREFIXES = new Set([
  'de',
  'del',
  'dela',
  'de la',
  'delos',
  'de los',
  'delas',
  'de las',
  'san',
  'santa',
  'sta',
  'sta.',
  'sto',
  'sto.',
]);

/**
 * Formats a full person name into "First Initial + Last Name (+ Suffix)"
 * e.g. "Maria P. Santos" -> "M. Santos"
 * e.g. "Franklin Anthony Tabaquin, IV" -> "F. Tabaquin, IV"
 * while keeping office/team labels intact.
 */
export function formatShortPersonName(rawName: string): string {
  if (!rawName) return 'Unassigned';

  // Strip parenthetical position/office suffix e.g. "Maria Santos (FDRO, Region NCR)"
  const base = rawName.replace(/\s*\([^)]*\)\s*/g, '').trim();
  if (!base) return 'Unassigned';

  // Keep office, cluster, or generic labels intact
  if (
    /^(region|oddg|froo|cluster|nlc|slc|vc|mec|mwc|all|unassigned|fdro|team|office|authorized)/i.test(
      base
    )
  ) {
    return base;
  }

  // Extract any comma-attached suffix first, e.g. "Franklin Anthony Tabaquin, IV" -> core="Franklin Anthony Tabaquin", suffix=", IV"
  let coreName = base;
  let attachedSuffix = '';
  const commaIdx = base.lastIndexOf(',');
  if (commaIdx !== -1) {
    const potentialSuffix = base.slice(commaIdx + 1).trim();
    if (isNameSuffixToken(potentialSuffix)) {
      coreName = base.slice(0, commaIdx).trim();
      attachedSuffix = `, ${potentialSuffix}`;
    }
  }

  const tokens = coreName.split(/\s+/).filter(Boolean);
  if (tokens.length <= 1) return `${coreName}${attachedSuffix}`;

  // Also handle space-separated suffix when no comma was used (e.g. "Franklin Anthony Tabaquin IV")
  if (!attachedSuffix && tokens.length >= 3 && isNameSuffixToken(tokens[tokens.length - 1])) {
    const suffixToken = tokens.pop()!;
    attachedSuffix = ` ${suffixToken}`;
  }

  const firstInitial = `${tokens[0].charAt(0).toUpperCase()}.`;

  // Check if the surname has a compound prefix like "Dela Cruz" or "De Leon"
  if (tokens.length >= 3) {
    const secondLast = tokens[tokens.length - 2].toLowerCase();
    const thirdLast =
      tokens.length >= 4 ? `${tokens[tokens.length - 3].toLowerCase()} ${secondLast}` : '';
    if (COMPOUND_SURNAME_PREFIXES.has(thirdLast)) {
      const surname = tokens.slice(tokens.length - 3).join(' ');
      return `${firstInitial} ${surname}${attachedSuffix}`;
    }
    if (COMPOUND_SURNAME_PREFIXES.has(secondLast)) {
      const surname = tokens.slice(tokens.length - 2).join(' ');
      return `${firstInitial} ${surname}${attachedSuffix}`;
    }
  }

  const lastName = tokens[tokens.length - 1];
  return `${firstInitial} ${lastName}${attachedSuffix}`;
}

export function formatShortAssigneeList(assignedToRaw: string): string {
  if (!assignedToRaw || !assignedToRaw.trim()) return 'Unassigned';
  const parts = splitAssigneeNames(assignedToRaw);
  if (parts.length === 0) return 'Unassigned';
  return parts.map(formatShortPersonName).join(', ');
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onSelectTask,
  selectedTaskId,
  onReceiveTask,
  activeView = 'ALL_TASKS',
}) => {
  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'In Progress':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100/90 text-amber-900 border border-amber-200/60 whitespace-nowrap">
            In Progress
          </span>
        );
      case 'Open':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100/90 text-blue-900 border border-blue-200/60 whitespace-nowrap">
            Open
          </span>
        );
      case 'Completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100/90 text-emerald-900 border border-emerald-200/60 whitespace-nowrap">
            Completed
          </span>
        );
      case 'Overdue':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100/90 text-rose-900 border border-rose-200/60 whitespace-nowrap">
            Overdue
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-800 whitespace-nowrap">
            {status}
          </span>
        );
    }
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'Urgent':
        return <span className="text-red-700 font-bold text-xs">Urgent</span>;
      case 'Normal':
        return <span className="text-slate-700 font-medium text-xs">Normal</span>;
      case 'High':
        return <span className="text-rose-600 font-semibold text-xs">High</span>;
      case 'Medium':
        return <span className="text-slate-700 font-medium text-xs">Medium</span>;
      case 'Low':
        return <span className="text-slate-500 text-xs">Low</span>;
      default:
        return <span className="text-slate-600 text-xs">{priority}</span>;
    }
  };

  const emptyMessage =
    activeView === 'MY_TASKS'
      ? 'You currently have no tasks assigned or requiring your direct action in this filter.'
      : activeView === 'TASKS_TO_RECEIVE'
      ? 'No dispatched tasks currently awaiting receipt by authorized recipient.'
      : 'No operational tasks in this scope or matching your filters.';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="px-4 py-3.5 sm:px-5 sm:py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm md:text-base font-bold text-slate-900">Task List</h2>
          <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
            Showing {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
          </p>
        </div>
      </div>

      {/* ================= MOBILE TOUCH-FRIENDLY TASK CARDS (< 768px) ================= */}
      <div className="md:hidden">
        {tasks.length === 0 ? (
          <div className="py-12 px-5 text-center text-slate-400">
            <p className="text-sm font-semibold text-slate-700">No tasks found</p>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{emptyMessage}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {tasks.map((task) => {
              const isSelected = selectedTaskId === task.id;
              const shortAssignees = formatShortAssigneeList(task.assignedTo);
              const shortReceiver = task.receivedBy ? formatShortPersonName(task.receivedBy) : '';

              return (
                <div
                  key={task.id}
                  onClick={() => onSelectTask(task)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectTask(task);
                    }
                  }}
                  className={`p-4 space-y-2.5 transition active:bg-slate-50 cursor-pointer ${
                    isSelected ? 'bg-emerald-50/60' : 'bg-white'
                  }`}
                >
                  {/* Row 1: Complete Task Title + Priority */}
                  <div className="flex items-start justify-between gap-2.5">
                    <h3 className="text-[14px] font-bold text-[#056839] leading-snug break-words flex-1">
                      {task.taskTitle}
                    </h3>
                    <div className="shrink-0 pt-0.5">{getPriorityBadge(task.priority)}</div>
                  </div>

                  {/* Row 2: Clean Metadata (DTN · Category · Origin · Office) */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-slate-500">
                    {task.dtn && (
                      <>
                        <span className="font-mono text-emerald-800 font-semibold tabular-nums">
                          DTN {task.dtn}
                        </span>
                        <span className="text-slate-300" aria-hidden="true">
                          ·
                        </span>
                      </>
                    )}
                    <span className="font-medium text-slate-700">{task.category}</span>
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <span>{task.origin}</span>
                  </div>

                  {/* Row 3: Office, Assigned To, Due Date */}
                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1 text-[11px] text-slate-400">
                        <User className="w-3 h-3 shrink-0" />
                        <span>Assigned To</span>
                      </div>
                      <div className="font-semibold text-slate-800 leading-snug break-words">
                        {shortAssignees}
                      </div>
                      {task.status === 'Open' && !task.receivedAt ? (
                        <div className="text-[10.5px] text-amber-700 font-semibold">
                          Awaiting Receipt
                        </div>
                      ) : task.receivedBy ? (
                        <div className="text-[10.5px] text-emerald-700 truncate">
                          Recv: {shortReceiver}
                        </div>
                      ) : null}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-400">
                          <Calendar className="w-3 h-3 shrink-0" />
                          <span>Due Date</span>
                        </div>
                        <div className="font-medium text-slate-700 tabular-nums">
                          {formatDate(task.dueDate)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{task.region}</span>
                      </div>
                    </div>
                  </div>

                  {/* Row 4: Status, Logs/Dispatch counts, Receive CTA & Details Chevron */}
                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      {getStatusBadge(task.status)}
                      <span className="text-[11px] text-slate-400 tabular-nums">
                        {task.activityHistory?.length || 0} logs
                        {task.dispatchSlips && task.dispatchSlips.length > 0
                          ? ` · ${task.dispatchSlips.length} dispatch`
                          : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {task.status === 'Open' && !task.receivedAt && onReceiveTask && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onReceiveTask(task);
                          }}
                          className="min-h-[36px] px-3.5 text-xs bg-[#056839] hover:bg-[#04522d] text-white rounded-lg font-bold transition cursor-pointer shadow-2xs active:scale-95 whitespace-nowrap"
                          title="Confirm receipt and accept this task"
                        >
                          Receive
                        </button>
                      )}
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= DESKTOP 6-COLUMN TABLE (>= 768px — UNCHANGED) ================= */}
      <div className="hidden md:block w-full overflow-x-auto">
        <table className="w-full text-left border-collapse lg:table-fixed">
          <thead>
            <tr className="border-b border-slate-200/80 bg-slate-50/70 text-xs font-semibold text-slate-700 tracking-wide">
              <th className="py-3 px-4 sm:px-5 lg:w-[37%]">Task Title</th>
              <th className="py-3 px-3 lg:w-[17%]">Category & Office</th>
              <th className="py-3 px-3 lg:w-[16%]">Assigned To</th>
              <th className="py-3 px-3 lg:w-[10%]">Due Date</th>
              <th className="py-3 px-3 lg:w-[12%]">Status</th>
              <th className="py-3 px-3 lg:w-[8%] text-right">Priority</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs sm:text-[13px]">
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  <div className="max-w-xs mx-auto text-center">
                    <p className="text-sm font-semibold text-slate-700">No tasks found</p>
                    <p className="text-xs text-slate-400 mt-1">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              tasks.map((task) => {
                const isSelected = selectedTaskId === task.id;
                const shortAssignees = formatShortAssigneeList(task.assignedTo);
                const shortReceiver = task.receivedBy ? formatShortPersonName(task.receivedBy) : '';

                return (
                  <tr
                    key={task.id}
                    onClick={() => onSelectTask(task)}
                    className={`group transition hover:bg-slate-50/90 cursor-pointer align-top ${
                      isSelected ? 'bg-emerald-50/60 ring-1 ring-emerald-200' : ''
                    }`}
                  >
                    {/* Complete Task Title (No internal Task ID) */}
                    <td className="py-3.5 px-4 sm:px-5">
                      <div className="flex flex-col">
                        <span className="font-semibold text-[#056839] group-hover:underline leading-snug break-words text-[13px] sm:text-sm">
                          {task.taskTitle}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1 flex-wrap">
                          {task.dtn && (
                            <>
                              <span className="font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/80 font-medium">
                                DTN: {task.dtn}
                              </span>
                              <span>•</span>
                            </>
                          )}
                          <span className="text-slate-500 font-medium">Origin: {task.origin}</span>
                          <span>•</span>
                          <span>{task.activityHistory?.length || 0} logs</span>
                          {task.dispatchSlips && task.dispatchSlips.length > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-700 font-semibold">
                                {task.dispatchSlips.length} dispatch{' '}
                                {task.dispatchSlips.length === 1 ? 'order' : 'orders'}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Category & Region / Office */}
                    <td className="py-3.5 px-3">
                      <div className="font-medium text-slate-800 leading-snug break-words">
                        {task.category}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                        <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="break-words">{task.region}</span>
                      </div>
                    </td>

                    {/* Assigned To (First Initial + Last Name) */}
                    <td className="py-3.5 px-3 text-slate-800 font-medium" title={task.assignedTo}>
                      <div className="leading-snug break-words">{shortAssignees}</div>
                      {task.status === 'Open' && !task.receivedAt ? (
                        <span className="text-[10px] text-amber-700 font-semibold block mt-0.5">
                          Awaiting Receipt
                        </span>
                      ) : task.receivedBy ? (
                        <span
                          className="text-[10px] text-emerald-700 block mt-0.5 truncate"
                          title={`Received by ${task.receivedBy}`}
                        >
                          Recv: {shortReceiver}
                        </span>
                      ) : null}
                    </td>

                    {/* Due Date */}
                    <td className="py-3.5 px-3 text-slate-600 whitespace-nowrap tabular-nums">
                      {formatDate(task.dueDate)}
                    </td>

                    {/* Status & Inline Receive Action */}
                    <td className="py-3.5 px-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {getStatusBadge(task.status)}
                        {task.status === 'Open' && !task.receivedAt && onReceiveTask && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onReceiveTask(task);
                            }}
                            className="text-[11px] bg-[#056839] hover:bg-[#04522d] text-white px-2 py-0.5 rounded font-bold transition cursor-pointer shadow-2xs inline-flex items-center gap-1 active:scale-95"
                            title="Confirm receipt and accept this task"
                          >
                            Receive
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Priority + Row Chevron */}
                    <td className="py-3.5 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {getPriorityBadge(task.priority)}
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#056839] shrink-0" />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
