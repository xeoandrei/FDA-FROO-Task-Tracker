/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Task, TaskStatus, FrooUserPersona } from './types/task';
import {
  getStoredTasks,
  saveStoredTasks,
  resetStoredTasks,
  getStoredPersona,
  saveStoredPersona,
  exportTasksToCsv,
} from './utils/storage';
import { Header } from './components/Header';
import { StatsCards } from './components/StatsCards';
import { FiltersBar } from './components/FiltersBar';
import { TaskList } from './components/TaskList';
import { CreateTaskModal } from './components/CreateTaskModal';
import { TaskDetailsDrawer } from './components/TaskDetailsDrawer';
import { RegionalOverviewModal } from './components/RegionalOverviewModal';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(() => getStoredTasks());
  const [currentPersona, setCurrentPersona] = useState<FrooUserPersona>(() => getStoredPersona());

  // Filter states (matching Screenshot 1)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedOrigin, setSelectedOrigin] = useState('All');
  const [selectedRegion, setSelectedRegion] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedPriority, setSelectedPriority] = useState('All');

  // Modal / Drawer states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRegionalOverviewOpen, setIsRegionalOverviewOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Persist tasks whenever changed
  useEffect(() => {
    saveStoredTasks(tasks);
  }, [tasks]);

  // Persist persona whenever changed
  const handleSelectPersona = (persona: FrooUserPersona) => {
    setCurrentPersona(persona);
    saveStoredPersona(persona);
    showToast(`Switched active perspective to ${persona.name} (${persona.officeName})`);
  };

  const handleResetData = () => {
    if (confirm('Reset task tracker to standard FDA/FROO demo tasks?')) {
      const fresh = resetStoredTasks();
      setTasks(fresh);
      handleResetFilters();
      showToast('Task list reset to initial demo data.');
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedOrigin('All');
    setSelectedRegion('All');
    setSelectedStatus('All');
    setSelectedPriority('All');
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedCategory !== 'All' ||
    selectedOrigin !== 'All' ||
    selectedRegion !== 'All' ||
    selectedStatus !== 'All' ||
    selectedPriority !== 'All';

  // Filter tasks based on all criteria
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = task.taskTitle.toLowerCase().includes(query);
        const matchesId = task.id.toLowerCase().includes(query);
        const matchesAssignee = task.assignedTo.toLowerCase().includes(query);
        const matchesRegion = task.region.toLowerCase().includes(query);
        const matchesLocation = (task.location || '').toLowerCase().includes(query);
        const matchesDesc = (task.description || '').toLowerCase().includes(query);
        const matchesCategory = task.category.toLowerCase().includes(query);
        if (!matchesTitle && !matchesId && !matchesAssignee && !matchesRegion && !matchesLocation && !matchesDesc && !matchesCategory) {
          return false;
        }
      }

      // Category
      if (selectedCategory !== 'All' && task.category !== selectedCategory) {
        return false;
      }

      // Origin
      if (selectedOrigin !== 'All' && task.origin !== selectedOrigin) {
        return false;
      }

      // Region (match exact, code, or short label)
      if (selectedRegion !== 'All') {
        const matches =
          task.region === selectedRegion ||
          task.assignedOffice === selectedRegion ||
          (selectedRegion === 'NCR' && (task.region === 'NCR' || task.region === 'Region NCR')) ||
          (selectedRegion === 'Region NCR' && (task.region === 'NCR' || task.region === 'Region NCR')) ||
          (selectedRegion === 'Region 4A' && (task.region === 'Region 4A' || task.region === 'Region IV-A')) ||
          (selectedRegion === 'Region 3' && (task.region === 'Region 3' || task.region === 'Region III')) ||
          (selectedRegion === 'Region 7' && (task.region === 'Region 7' || task.region === 'Region VII'));
        if (!matches) return false;
      }

      // Status
      if (selectedStatus !== 'All' && task.status !== selectedStatus) {
        return false;
      }

      // Priority
      if (selectedPriority !== 'All' && task.priority !== selectedPriority) {
        return false;
      }

      return true;
    });
  }, [tasks, searchQuery, selectedCategory, selectedOrigin, selectedRegion, selectedStatus, selectedPriority]);

  // Handlers for task mutations
  const handleCreateTask = (newTask: Task) => {
    setTasks((prev) => [newTask, ...prev]);
    showToast(`Task "${newTask.taskTitle}" created and assigned.`);
  };

  const handleUpdateTask = (updatedTask: Task) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
    );
    // Keep drawer in sync
    setSelectedTask(updatedTask);
    showToast(`Task "${updatedTask.taskTitle}" updated.`);
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (selectedTask?.id === taskId) {
      setSelectedTask(null);
    }
    showToast('Task removed from registry.');
  };

  const handleQuickStatusChange = (taskId: string, newStatus: TaskStatus) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const updated = {
            ...t,
            status: newStatus,
            activityHistory: [
              {
                id: `act-${Date.now()}`,
                action: `Status marked as ${newStatus}.`,
                actor: currentPersona.name,
                actorOffice: currentPersona.officeName,
                date: new Date().toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                }),
                newStatus,
              },
              ...(t.activityHistory || []),
            ],
          };
          if (selectedTask?.id === taskId) {
            setSelectedTask(updated);
          }
          return updated;
        }
        return t;
      })
    );
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <Header
        onCreateTask={() => setIsCreateModalOpen(true)}
        currentPersona={currentPersona}
        onSelectPersona={handleSelectPersona}
        onOpenRegionalOverview={() => setIsRegionalOverviewOpen(true)}
        onExportCsv={() => exportTasksToCsv(filteredTasks)}
        onResetData={handleResetData}
        selectedRegionFilter={selectedRegion}
        onSelectRegionFilter={setSelectedRegion}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Metric Cards (matching screenshot 1) */}
        <StatsCards
          tasks={tasks}
          activeStatusFilter={selectedStatus}
          onSelectStatusFilter={setSelectedStatus}
        />

        {/* Filters Bar (matching screenshot 1) */}
        <FiltersBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          selectedOrigin={selectedOrigin}
          onOriginChange={setSelectedOrigin}
          selectedRegion={selectedRegion}
          onRegionChange={setSelectedRegion}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
          selectedPriority={selectedPriority}
          onPriorityChange={setSelectedPriority}
          onResetFilters={handleResetFilters}
          hasActiveFilters={hasActiveFilters}
        />

        {/* Task List (matching screenshot 1) */}
        <TaskList
          tasks={filteredTasks}
          onSelectTask={(task) => setSelectedTask(task)}
          selectedTaskId={selectedTask?.id}
          onQuickStatusChange={handleQuickStatusChange}
        />

        {/* Footer Note */}
        <div className="mt-8 pt-4 border-t border-slate-200 text-center text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#056839]" />
            <span>Field Regulatory Operations Office (FROO) Task Tracking Portal</span>
          </div>
          <div>Food and Drug Administration Philippines • Department of Health</div>
        </div>
      </main>

      {/* Create Task Modal (matching screenshot 2) */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateTask}
        currentPersona={currentPersona}
      />

      {/* Task Details Drawer (matching screenshots 3 & 4) */}
      <TaskDetailsDrawer
        task={selectedTask}
        isOpen={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        onUpdateTask={handleUpdateTask}
        onDeleteTask={handleDeleteTask}
        currentPersona={currentPersona}
        allTasks={tasks}
      />

      {/* Regional Workload & Directory Modal */}
      <RegionalOverviewModal
        isOpen={isRegionalOverviewOpen}
        onClose={() => setIsRegionalOverviewOpen(false)}
        tasks={tasks}
        onSelectOfficeFilter={(code) => setSelectedRegion(code)}
        currentOfficeFilter={selectedRegion}
      />
    </div>
  );
}
