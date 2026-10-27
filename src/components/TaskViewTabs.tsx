import React from 'react';
import { UserCheck, Inbox, Layers } from 'lucide-react';

export type TaskViewType = 'MY_TASKS' | 'TASKS_TO_RECEIVE' | 'ALL_TASKS';

interface TaskViewTabsProps {
  activeView: TaskViewType;
  onSelectView: (view: TaskViewType) => void;
  myTasksCount: number;
  tasksToReceiveCount: number;
  allTasksCount: number;
}

export const TaskViewTabs: React.FC<TaskViewTabsProps> = ({
  activeView,
  onSelectView,
  myTasksCount,
  tasksToReceiveCount,
  allTasksCount,
}) => {
  const tabs: {
    id: TaskViewType;
    label: string;
    description: string;
    count: number;
    icon: React.ReactNode;
    highlightCount?: boolean;
  }[] = [
    {
      id: 'MY_TASKS',
      label: 'My Tasks',
      description: 'Assigned to you or requiring your direct action',
      count: myTasksCount,
      icon: <UserCheck className="w-4 h-4" />,
    },
    {
      id: 'TASKS_TO_RECEIVE',
      label: 'Tasks to Receive',
      description: 'Dispatched tasks awaiting recipient acknowledgment',
      count: tasksToReceiveCount,
      icon: <Inbox className="w-4 h-4" />,
      highlightCount: tasksToReceiveCount > 0,
    },
    {
      id: 'ALL_TASKS',
      label: 'All Tasks',
      description: 'All tasks within your authorized jurisdiction',
      count: allTasksCount,
      icon: <Layers className="w-4 h-4" />,
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-1.5 sm:p-2 mb-6 shadow-xs">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2">
        {tabs.map((tab) => {
          const isActive = activeView === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectView(tab.id)}
              className={`flex items-center justify-between p-3 rounded-lg text-left transition cursor-pointer border ${
                isActive
                  ? 'bg-emerald-50/90 border-[#056839]/30 text-emerald-950 shadow-2xs ring-1 ring-[#056839]/20'
                  : 'bg-white hover:bg-slate-50 border-transparent text-slate-700 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition ${
                    isActive
                      ? 'bg-[#056839] text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                  }`}
                >
                  {tab.icon}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs sm:text-[13px] tracking-tight truncate">
                      {tab.label}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-500 truncate hidden md:block">
                    {tab.description}
                  </p>
                </div>
              </div>

              <span
                className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold shrink-0 border ${
                  isActive
                    ? 'bg-[#056839] text-white border-[#056839]'
                    : tab.highlightCount
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
