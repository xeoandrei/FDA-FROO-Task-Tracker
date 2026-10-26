import React from 'react';
import { Task, TaskStatus, TaskPriority } from '../types/task';
import { formatDate } from '../utils/storage';
import { ChevronRight, Clock, AlertTriangle, CheckCircle2, CircleDot } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  selectedTaskId?: string;
  onQuickStatusChange: (taskId: string, newStatus: TaskStatus) => void;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onSelectTask,
  selectedTaskId,
  onQuickStatusChange,
}) => {
  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'In Progress':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100/90 text-amber-900 border border-amber-200/50">
            In Progress
          </span>
        );
      case 'Open':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100/90 text-blue-900 border border-blue-200/50">
            Open
          </span>
        );
      case 'Completed':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100/90 text-emerald-900 border border-emerald-200/50">
            Completed
          </span>
        );
      case 'Overdue':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-rose-100/90 text-rose-900 border border-rose-200/50">
            Overdue
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
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
                    <p className="text-sm font-medium text-slate-600">No tasks found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Try adjusting your filters or search query, or create a new task.
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
                        <span className="text-[11px] text-slate-400 mt-0.5">
                          ID: {task.id} • {task.activityHistory?.length || 0} activity logs
                        </span>
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
                      {task.assignedTo}
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
                      {getStatusBadge(task.status)}
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
