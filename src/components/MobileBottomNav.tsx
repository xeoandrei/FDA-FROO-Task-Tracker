import React from 'react';
import { UserCheck, Inbox, Layers, Plus } from 'lucide-react';
import { TaskViewType } from './TaskViewTabs';

interface MobileBottomNavProps {
  activeView: TaskViewType;
  onSelectView: (view: TaskViewType) => void;
  onCreateTask: () => void;
  myTasksCount: number;
  tasksToReceiveCount: number;
  allTasksCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeView,
  onSelectView,
  onCreateTask,
  myTasksCount,
  tasksToReceiveCount,
  allTasksCount,
}) => {
  const navItems: Array<{
    id: TaskViewType;
    label: string;
    count: number;
    icon: React.ReactNode;
    highlight?: boolean;
  }> = [
    {
      id: 'MY_TASKS',
      label: 'My Tasks',
      count: myTasksCount,
      icon: <UserCheck className="w-5 h-5" />,
    },
    {
      id: 'TASKS_TO_RECEIVE',
      label: 'To Receive',
      count: tasksToReceiveCount,
      icon: <Inbox className="w-5 h-5" />,
      highlight: tasksToReceiveCount > 0,
    },
    {
      id: 'ALL_TASKS',
      label: 'All Tasks',
      count: allTasksCount,
      icon: <Layers className="w-5 h-5" />,
    },
  ];

  return (
    <nav
      aria-label="Mobile workspace navigation"
      className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-white/95 backdrop-blur-md border-t border-slate-200 pb-safe shadow-[0_-4px_18px_rgba(15,23,42,0.06)]"
    >
      <div className="grid grid-cols-4 items-center h-[60px] px-1">
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectView(item.id)}
              className={`relative flex flex-col items-center justify-center h-full min-h-[44px] rounded-lg transition-colors cursor-pointer active:scale-95 ${
                isActive ? 'text-[#056839]' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[#056839]" />
              )}
              <div className="relative">
                {item.icon}
                <span
                  className={`absolute -top-1.5 -right-3.5 min-w-[18px] h-[16px] px-1 rounded-full text-[10px] font-bold tabular-nums flex items-center justify-center leading-none border ${
                    isActive
                      ? 'bg-[#056839] text-white border-white'
                      : item.highlight
                      ? 'bg-amber-500 text-white border-white'
                      : 'bg-slate-200 text-slate-700 border-white'
                  }`}
                >
                  {item.count > 99 ? '99+' : item.count}
                </span>
              </div>
              <span
                className={`text-[10.5px] mt-1 tracking-tight whitespace-nowrap ${
                  isActive ? 'font-bold text-[#056839]' : 'font-medium text-slate-600'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Primary Quick Create Action */}
        <button
          type="button"
          onClick={onCreateTask}
          className="flex flex-col items-center justify-center h-full min-h-[44px] cursor-pointer active:scale-95"
        >
          <span className="w-9 h-9 rounded-xl bg-[#056839] hover:bg-[#04522d] text-white flex items-center justify-center shadow-sm">
            <Plus className="w-5 h-5" />
          </span>
          <span className="text-[10.5px] mt-0.5 font-bold text-[#056839] tracking-tight whitespace-nowrap">
            New Task
          </span>
        </button>
      </div>
    </nav>
  );
};
