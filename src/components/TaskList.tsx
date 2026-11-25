import React from 'react';
import { Task, TaskStatus, TaskPriority } from '../types/task';
import { UserAccount } from '../types/auth';
import { formatDate } from '../utils/storage';
import {
  splitAssigneeNames,
  isNameSuffixToken,
  isUserAssignedToTask,
  isUserCreatedTask,
} from '../utils/taskAuthorization';
import {
  ChevronRight,
  Building2,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Inbox,
  Flame,
  ArrowUp,
  Minus,
  ArrowDown,
} from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  selectedTaskId?: string;
  onQuickStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
  onReceiveTask?: (task: Task) => void;
  currentUser?: UserAccount | null;
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

/**
 * Computes relative due date countdown metadata with tabular numerals.
 */
function getDueDateMeta(dueDateStr: string, status: TaskStatus): {
  label: string;
  className: string;
} {
  if (status === 'Completed') {
    return {
      label: 'Completed',
      className: 'text-emerald-700 font-medium',
    };
  }

  if (!dueDateStr) {
    return {
      label: '',
      className: 'text-slate-400',
    };
  }

  const parsed = new Date(`${dueDateStr}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return {
      label: '',
      className: 'text-slate-500',
    };
  }

  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = parsed.getTime() - todayMidnight.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      label: `${overdueDays}d overdue`,
      className: 'text-rose-700 font-semibold',
    };
  }
  if (diffDays === 0) {
    return {
      label: 'Due today',
      className: 'text-amber-700 font-semibold',
    };
  }
  if (diffDays === 1) {
    return {
      label: 'Due tomorrow',
      className: 'text-amber-700 font-medium',
    };
  }
  if (diffDays <= 3) {
    return {
      label: `${diffDays}d left`,
      className: 'text-amber-700 font-medium',
    };
  }
  return {
    label: `${diffDays}d left`,
    className: 'text-slate-500',
  };
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onSelectTask,
  selectedTaskId,
  onReceiveTask,
  currentUser = null,
  activeView = 'ALL_TASKS',
}) => {
  const getStatusIndicator = (status: TaskStatus) => {
    switch (status) {
      case 'In Progress':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 whitespace-nowrap">
            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>In Progress</span>
          </span>
        );
      case 'Open':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-800 whitespace-nowrap">
            <Inbox className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>Open</span>
          </span>
        );
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 whitespace-nowrap">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Completed</span>
          </span>
        );
      case 'Overdue':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-800 whitespace-nowrap">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>Overdue</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center text-xs font-semibold text-slate-700 whitespace-nowrap">
            {status}
          </span>
        );
    }
  };

  /**
   * Compact Priority Symbol / Icon with accessible title tooltip (replaces long text labels).
   */
  const getPrioritySymbol = (priority: TaskPriority) => {
    switch (priority) {
      case 'Urgent':
        return (
          <span
            title="Priority: Urgent"
            aria-label="Priority: Urgent"
            className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-rose-50 text-rose-600 border border-rose-200/80 shrink-0"
          >
            <Flame className="w-3.5 h-3.5 fill-rose-500/20" />
          </span>
        );
      case 'High':
        return (
          <span
            title="Priority: High"
            aria-label="Priority: High"
            className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-50 text-amber-600 border border-amber-200/80 shrink-0"
          >
            <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
          </span>
        );
      case 'Low':
        return (
          <span
            title="Priority: Low"
            aria-label="Priority: Low"
            className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-50 text-slate-400 border border-slate-200/60 shrink-0"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </span>
        );
      case 'Normal':
      case 'Medium':
      default:
        return (
          <span
            title={`Priority: ${priority}`}
            aria-label={`Priority: ${priority}`}
            className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100/80 text-slate-600 border border-slate-200/80 shrink-0"
          >
            <Minus className="w-3.5 h-3.5 stroke-[2.25]" />
          </span>
        );
    }
  };

  const getPersonalRelationshipText = (task: Task): string | null => {
    if (!currentUser) return null;
    const assigned = isUserAssignedToTask(task, currentUser);
    const created = isUserCreatedTask(task, currentUser);
    if (assigned && created) return 'Assigned & Created by you';
    if (assigned) return 'Assigned to you';
    if (created) return 'Created by you';
    return null;
  };

  const canShowInlineReceive = (task: Task): boolean => {
    if (task.status !== 'Open' || Boolean(task.receivedAt) || !onReceiveTask) return false;
    if (!currentUser) return true;
    return isUserAssignedToTask(task, currentUser);
  };

  const emptyMessage =
    activeView === 'MY_TASKS'
      ? 'You currently have no tasks directly assigned to you or created by you in this filter.'
      : activeView === 'TASKS_TO_RECEIVE'
      ? 'You have no unreceived tasks directly assigned to you.'
      : 'No operational tasks in this scope or matching your filters.';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header Bar with Task Count & Compact Priority Symbol Legend */}
      <div className="px-4 py-3.5 sm:px-5 sm:py-4 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm md:text-base font-bold text-slate-900">
              {activeView === 'MY_TASKS'
                ? 'My Tasks'
                : activeView === 'TASKS_TO_RECEIVE'
                ? 'Tasks to Receive'
                : 'Task List'}
            </h2>
            <span className="text-xs text-slate-300" aria-hidden="true">
              ·
            </span>
            <span className="text-xs font-semibold text-slate-600 tabular-nums">
              Showing {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeView === 'MY_TASKS'
              ? 'Directly assigned to you or created by you'
              : activeView === 'TASKS_TO_RECEIVE'
              ? 'Unreceived tasks assigned directly to you'
              : 'Click any task row to inspect activity logs, dispatch orders, or update status'}
          </p>
        </div>

        {/* Compact Priority Symbol Legend */}
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1" title="Urgent Priority">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-rose-50 text-rose-600 border border-rose-200/80">
              <Flame className="w-3 h-3 fill-rose-500/20" />
            </span>
            <span>Urgent</span>
          </span>
          <span className="inline-flex items-center gap-1" title="Normal Priority">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/80">
              <Minus className="w-3 h-3 stroke-[2.25]" />
            </span>
            <span>Normal</span>
          </span>
        </div>
      </div>

      {/* ================= MOBILE STREAMLINED TOUCH CARD FEED (< 768px) ================= */}
      <div className="md:hidden">
        {tasks.length === 0 ? (
          <div className="py-12 px-5 text-center text-slate-400">
            <p className="text-sm font-semibold text-slate-700">No tasks found</p>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{emptyMessage}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200/80">
            {tasks.map((task) => {
              const isSelected = selectedTaskId === task.id;
              const shortAssignees = formatShortAssigneeList(task.assignedTo);
              const shortReceiver = task.receivedBy ? formatShortPersonName(task.receivedBy) : '';
              const shortCreator = task.createdBy ? formatShortPersonName(task.createdBy) : 'ODDG-FROO';
              const dueMeta = getDueDateMeta(task.dueDate, task.status);
              const personalRelation = getPersonalRelationshipText(task);
              const showReceiveBtn = canShowInlineReceive(task);

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
                  className={`p-4 space-y-3 transition active:bg-slate-50 cursor-pointer ${
                    isSelected ? 'bg-emerald-50/60' : 'bg-white'
                  }`}
                >
                  {/* Row 1: Complete Task Title + Compact Priority Symbol */}
                  <div className="flex items-start justify-between gap-2.5">
                    <h3 className="text-[14px] font-bold text-[#056839] leading-snug break-words flex-1">
                      {task.taskTitle}
                    </h3>
                    {getPrioritySymbol(task.priority)}
                  </div>

                  {/* Row 2: Unboxed Metadata (DTN · Category · Origin · Personal attribution) */}
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
                    {personalRelation && (
                      <>
                        <span className="text-slate-300" aria-hidden="true">
                          ·
                        </span>
                        <span className="font-semibold text-[#056839]">{personalRelation}</span>
                      </>
                    )}
                  </div>

                  {/* Row 3: 2-Column Operational Details (Assigned/Created By vs Due Date & Region) */}
                  <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                    <div className="min-w-0 space-y-1">
                      <div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-400">
                          <User className="w-3 h-3 shrink-0" />
                          <span>Assigned To</span>
                        </div>
                        <div className="font-semibold text-slate-800 leading-snug break-words">
                          {shortAssignees}
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        By: <span className="font-medium text-slate-700">{shortCreator}</span>
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
                        <div className="font-medium text-slate-800 tabular-nums">
                          {formatDate(task.dueDate)}
                        </div>
                        {dueMeta.label && (
                          <div className={`text-[10.5px] tabular-nums ${dueMeta.className}`}>
                            {dueMeta.label}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 pt-0.5">
                        <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{task.region}</span>
                      </div>
                    </div>
                  </div>

                  {/* Row 4: Status, Logs/Dispatch counts, 44px Touch Receive CTA & Details Chevron */}
                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      {getStatusIndicator(task.status)}
                      <span className="text-slate-300" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-[11px] text-slate-500 tabular-nums">
                        {task.activityHistory?.length || 0} logs
                        {task.dispatchSlips && task.dispatchSlips.length > 0
                          ? ` · ${task.dispatchSlips.length} dispatch`
                          : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {showReceiveBtn && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onReceiveTask?.(task);
                          }}
                          className="min-h-[44px] px-4 text-xs bg-[#056839] hover:bg-[#04522d] text-white rounded-xl font-bold transition cursor-pointer shadow-2xs active:scale-95 whitespace-nowrap"
                          title="Confirm receipt and accept this task"
                        >
                          Receive
                        </button>
                      )}
                      <div className="min-w-[36px] min-h-[44px] flex items-center justify-center text-slate-400">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= DESKTOP MODERN DATA TABLE (>= 768px) ================= */}
      <div className="hidden md:block w-full overflow-x-auto">
        <table className="w-full text-left border-collapse lg:table-fixed">
          <thead>
            <tr className="border-b border-slate-200/80 bg-slate-50/80 text-xs font-semibold text-slate-700 tracking-wide">
              <th className="py-3 px-4 sm:px-5 lg:w-[35%]">Task Title</th>
              <th className="py-3 px-3 lg:w-[17%]">Category &amp; Office</th>
              <th className="py-3 px-3 lg:w-[17%]">Assigned To</th>
              <th className="py-3 px-3 lg:w-[11%]">Due Date</th>
              <th className="py-3 px-3 lg:w-[10%]">Status</th>
              <th className="py-3 pl-3 pr-5 sm:pr-6 lg:w-[10%] text-center">Priority</th>
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
                const shortReceiver = task.receivedBy
                  ? formatShortPersonName(task.receivedBy)
                  : '';
                const shortCreator = task.createdBy
                  ? formatShortPersonName(task.createdBy)
                  : 'ODDG-FROO';
                const dueMeta = getDueDateMeta(task.dueDate, task.status);
                const personalRelation = getPersonalRelationshipText(task);
                const showReceiveBtn = canShowInlineReceive(task);

                return (
                  <tr
                    key={task.id}
                    onClick={() => onSelectTask(task)}
                    className={`group transition hover:bg-slate-50/90 cursor-pointer align-top ${
                      isSelected ? 'bg-emerald-50/60 ring-1 ring-emerald-200' : ''
                    }`}
                  >
                    {/* Column 1: Complete Task Title + Unboxed Metadata */}
                    <td className="py-3.5 px-4 sm:px-5">
                      <div className="flex flex-col">
                        <span className="font-semibold text-[#056839] group-hover:underline leading-snug break-words text-[13px] sm:text-sm">
                          {task.taskTitle}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1 flex-wrap">
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
                          <span>Origin: {task.origin}</span>
                          <span className="text-slate-300" aria-hidden="true">
                            ·
                          </span>
                          <span className="tabular-nums">
                            {task.activityHistory?.length || 0} logs
                          </span>
                          {task.dispatchSlips && task.dispatchSlips.length > 0 && (
                            <>
                              <span className="text-slate-300" aria-hidden="true">
                                ·
                              </span>
                              <span className="text-emerald-700 font-semibold tabular-nums">
                                {task.dispatchSlips.length} dispatch{' '}
                                {task.dispatchSlips.length === 1 ? 'order' : 'orders'}
                              </span>
                            </>
                          )}
                          {personalRelation && (
                            <>
                              <span className="text-slate-300" aria-hidden="true">
                                ·
                              </span>
                              <span className="font-semibold text-[#056839]">
                                {personalRelation}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Column 2: Category & Region / Office */}
                    <td className="py-3.5 px-3">
                      <div className="font-medium text-slate-800 leading-snug break-words">
                        {task.category}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                        <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="break-words">{task.region}</span>
                      </div>
                    </td>

                    {/* Column 3: Assigned To & Creator Attribution */}
                    <td className="py-3.5 px-3 text-slate-800" title={task.assignedTo}>
                      <div className="font-semibold leading-snug break-words">
                        {shortAssignees}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                        By: <span className="font-medium text-slate-700">{shortCreator}</span>
                      </div>
                      {task.status === 'Open' && !task.receivedAt ? (
                        <span className="text-[10.5px] text-amber-700 font-semibold block mt-0.5">
                          Awaiting Receipt
                        </span>
                      ) : task.receivedBy ? (
                        <span
                          className="text-[10.5px] text-emerald-700 block mt-0.5 truncate"
                          title={`Received by ${task.receivedBy}`}
                        >
                          Recv: {shortReceiver}
                        </span>
                      ) : null}
                    </td>

                    {/* Column 4: Due Date */}
                    <td className="py-3.5 px-3 whitespace-nowrap tabular-nums">
                      <div className="text-slate-800 font-medium">
                        {formatDate(task.dueDate)}
                      </div>
                      {dueMeta.label && (
                        <div className={`text-[11px] mt-0.5 ${dueMeta.className}`}>
                          {dueMeta.label}
                        </div>
                      )}
                    </td>

                    {/* Column 5: Status & Authorized Inline Receive Action */}
                    <td className="py-3.5 px-3">
                      <div className="flex flex-col items-start gap-1.5">
                        {getStatusIndicator(task.status)}
                        {showReceiveBtn && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onReceiveTask?.(task);
                            }}
                            className="text-[11px] bg-[#056839] hover:bg-[#04522d] text-white px-2.5 py-1 rounded-md font-bold transition cursor-pointer shadow-2xs inline-flex items-center gap-1 active:scale-95 whitespace-nowrap"
                            title="Confirm receipt and accept this task"
                          >
                            Receive
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Column 6: Centered Compact Priority Symbol + Row Chevron */}
                    <td className="py-3.5 pl-3 pr-5 sm:pr-6 text-center whitespace-nowrap">
                      <div className="inline-flex items-center justify-center gap-2">
                        {getPrioritySymbol(task.priority)}
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
