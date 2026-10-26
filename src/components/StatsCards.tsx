import React from 'react';
import { Task, TaskStatus } from '../types/task';

interface StatsCardsProps {
  tasks: Task[];
  activeStatusFilter: string;
  onSelectStatusFilter: (status: string) => void;
}

export const StatsCards: React.FC<StatsCardsProps> = ({
  tasks,
  activeStatusFilter,
  onSelectStatusFilter,
}) => {
  const counts = {
    open: tasks.filter((t) => t.status === 'Open').length,
    inProgress: tasks.filter((t) => t.status === 'In Progress').length,
    completed: tasks.filter((t) => t.status === 'Completed').length,
    overdue: tasks.filter((t) => t.status === 'Overdue').length,
  };

  const cards = [
    {
      title: 'Open Tasks',
      count: counts.open,
      subtitle: 'Awaiting action',
      topBorder: 'border-t-blue-500',
      activeRing: 'ring-2 ring-blue-500',
      statusValue: 'Open',
    },
    {
      title: 'In Progress',
      count: counts.inProgress,
      subtitle: 'Currently ongoing',
      topBorder: 'border-t-amber-500',
      activeRing: 'ring-2 ring-amber-500',
      statusValue: 'In Progress',
    },
    {
      title: 'Completed',
      count: counts.completed,
      subtitle: 'Successfully finished',
      topBorder: 'border-t-emerald-500',
      activeRing: 'ring-2 ring-emerald-500',
      statusValue: 'Completed',
    },
    {
      title: 'Overdue',
      count: counts.overdue,
      subtitle: 'Requires attention',
      topBorder: 'border-t-rose-500',
      activeRing: 'ring-2 ring-rose-500',
      statusValue: 'Overdue',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => {
        const isSelected = activeStatusFilter === card.statusValue;
        return (
          <button
            key={card.title}
            onClick={() => onSelectStatusFilter(isSelected ? 'All' : card.statusValue)}
            className={`bg-white rounded-xl p-5 border border-slate-200 border-t-4 ${card.topBorder} text-left transition hover:shadow-md cursor-pointer ${
              isSelected ? `${card.activeRing} shadow-md` : ''
            }`}
          >
            <div className="text-xs text-slate-500 font-medium tracking-wide">
              {card.title}
            </div>
            <div className="text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
              {card.count}
            </div>
            <div className="text-xs text-slate-400 mt-2 font-normal">
              {card.subtitle}
            </div>
          </button>
        );
      })}
    </div>
  );
};
