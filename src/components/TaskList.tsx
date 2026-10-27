import React from 'react';
import { Task, TaskStatus, TaskPriority } from '../types/task';
import { formatDate } from '../utils/storage';
import { ChevronRight, Clock, AlertTriangle, CheckCircle2, CircleDot, Inbox } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  selectedTaskId?: string;
  onQuickStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
  onReceiveTask?: (task: Task) => void;
  currentUserName?: string;
  activeView?: 'MY_TASKS' | 'TASKS_TO_RECEIVE' | 'ALL_TASKS';
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onSelectTask,
  selectedTaskId,
  onQuickStatusChange,
  onReceiveTask,
  currentUserName,
  activeView = 'ALL_TASKS',
}) => {
  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'In Progress':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100/90 text-amber-900 border border-amber-200/50">
            In Progress
          </span>
        );
      case 'Open':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100/90 text-blue-900 border border-blue-200/50">
            Open
          </span>
        );
      case 'Completed':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100/90 text-emerald-900 border border-emerald-200/50">
            Completed
          </span>
        );
      case 'Overdue':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-rose-100/90 text-rose-900 border border-rose-200/50">
            Overdue
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">
            {status}
          </span>
        );
    }
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'Urgent':
        return <span className="text-red-700 font-semibold text-xs">Urgent</span>;
      case 'High':
        return <span className="text-rose-600 font-medium text-xs">High</span>;
      case 'Medium':
        return <span className="text-slate-700 font-medium text-xs">Medium</span>;
      case 'Low':
        return <span className="text-slate-500 text-xs">Low</span>;
      default:
        return <span className="text-slate-600 text-xs">{priority}</span>;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Task List</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Showing {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200/80 bg-slate-50/50 text-[13px] font-semibold text-slate-700 tracking-wider">
              <th className="py-3 px-4 sm:px-6">Task</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Origin</th>
              <th className="py-3 px-4">Assigned To</th>
              <th className="py-3 px-4">Region</th>
              <th className="py-3 px-4">Due Date</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Priority</th>
              <th className="py-3 px-4 text-right sr-only">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  <div className="max-w-xs mx-auto text-center">
                    <p className="text-sm font-semibold text-slate-700">No tasks found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {activeView === 'MY_TASKS'
                        ? 'You currently have no tasks assigned or requiring your direct action in this filter.'
                        : activeView === 'TASKS_TO_RECEIVE'
                        ? 'No dispatched tasks currently awaiting receipt by authorized recipient.'
                        : 'No operational tasks in this scope or matching your filters.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              tasks.map((task) => {
                const isSelected = selectedTaskId === task.id;

                return (
                  <tr
                    key={task.id}
                    onClick={() => onSelectTask(task)}
                    className={`group transition hover:bg-slate-50/80 cursor-pointer ${
                      isSelected ? 'bg-emerald-50/60 ring-1 ring-emerald-200' : ''
                    }`}
                  >
                    {/* Task Title */}
                    <td className="py-3.5 px-4 sm:px-6 max-w-[280px] sm:max-w-[340px]">
                      <div className="flex flex-col">
                        <span className="font-semibold text-[#056839] group-hover:underline line-clamp-2">
                          {task.taskTitle}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 flex-wrap">
                          <span>ID: {task.id}</span>
                          {task.dtn && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/80 font-medium">
                                DTN: {task.dtn}
                              </span>
                            </>
                          )}
                          <span>•</span>
                          <span>{task.activityHistory?.length || 0} logs</span>
                          {task.dispatchSlips && task.dispatchSlips.length > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-700 font-medium">
                                {task.dispatchSlips.length} dispatch {task.dispatchSlips.length === 1 ? 'order' : 'orders'}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      {task.category}
                    </td>

                    {/* Origin */}
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      {task.origin}
                    </td>

                    {/* Assigned To */}
                    <td className="py-3.5 px-4 text-slate-800 font-medium whitespace-nowrap">
                      <div>{task.assignedTo}</div>
                      {task.status === 'Open' && !task.receivedAt ? (
                        <span className="text-[10px] text-amber-700 font-semibold block">
                          Awaiting Receipt
                        </span>
                      ) : task.receivedBy ? (
                        <span className="text-[10px] text-emerald-700 block truncate max-w-[140px]" title={`Received by ${task.receivedBy}`}>
                          Recv: {task.receivedBy}
                        </span>
                      ) : null}
                    </td>

                    {/* Region */}
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      {task.region}
                    </td>

                    {/* Due Date */}
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      {formatDate(task.dueDate)}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(task.status)}
                        {task.status === 'Open' && !task.receivedAt && onReceiveTask && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onReceiveTask(task);
                            }}
                            className="text-[11px] bg-[#056839] hover:bg-[#04522d] text-white px-2.5 py-0.5 rounded font-bold transition cursor-pointer shadow-2xs inline-flex items-center gap-1 active:scale-95"
                            title="Confirm receipt and accept this task"
                          >
                            Receive
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Priority */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getPriorityBadge(task.priority)}
                    </td>

                    {/* Chevron */}
                    <td className="py-3.5 px-4 text-right text-slate-400 group-hover:text-[#056839]">
                      <ChevronRight className="w-4 h-4 ml-auto" />
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
