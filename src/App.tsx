/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Task, TaskStatus } from './types/task';
import { UserAccount, UserRole, ClusterCode } from './types/auth';
import {
  getStoredTasks,
  saveStoredTasks,
  resetStoredTasks,
  exportTasksToCsv,
  formatDateTime,
} from './utils/storage';
import {
  getCurrentUser,
  setCurrentUser,
  getStoredUsers,
  logSystemAction,
} from './utils/authStorage';
import { FROO_CLUSTERS, getRegionsForCluster } from './data/clusters';
import { FROO_OFFICES } from './data/offices';

import { LandingPage } from './components/LandingPage';
import { Header } from './components/Header';
import { StatsCards } from './components/StatsCards';
import { FiltersBar } from './components/FiltersBar';
import { TaskList } from './components/TaskList';
import { CreateTaskModal } from './components/CreateTaskModal';
import { TaskDetailsDrawer } from './components/TaskDetailsDrawer';
import { RegionalOverviewModal } from './components/RegionalOverviewModal';
import { UserManagementModal } from './components/UserManagementModal';
import { SystemLogsModal } from './components/SystemLogsModal';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function App() {
  // Current authenticated user session
  const [currentUser, setCurrentUserState] = useState<UserAccount | null>(() => getCurrentUser());
  const [allStaffUsers, setAllStaffUsers] = useState<UserAccount[]>(() => getStoredUsers());

  // Task data
  const [tasks, setTasks] = useState<Task[]>(() => getStoredTasks());

  // Modals & Panels
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRegionalOverviewOpen, setIsRegionalOverviewOpen] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [isSystemLogsOpen, setIsSystemLogsOpen] = useState(false);
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

  // Compute allowed regional jurisdiction based on user role & cluster
  const { allowedRegions, defaultRegionFilter, scopeLabel } = useMemo(() => {
    if (!currentUser) {
      return {
        allowedRegions: FROO_OFFICES.map((o) => o.code),
        defaultRegionFilter: 'All',
        scopeLabel: 'Public Overview',
      };
    }

    if (currentUser.role === 'SUPERADMIN' || currentUser.role === 'ADMIN') {
      return {
        allowedRegions: FROO_OFFICES.map((o) => o.code),
        defaultRegionFilter: 'All',
        scopeLabel: 'National Scope (ODDG-FROO & All 17 Regional Offices)',
      };
    }

    if (currentUser.role === 'CLUSTER_DIRECTOR') {
      const clusterKey = currentUser.cluster || (Object.keys(FROO_CLUSTERS) as ClusterCode[]).find((code) =>
        currentUser.office.includes(code)
      ) || 'NLC';

      const clusterInfo = FROO_CLUSTERS[clusterKey];
      const regions = clusterInfo ? clusterInfo.regions : [];

      return {
        allowedRegions: regions,
        defaultRegionFilter: 'All',
        scopeLabel: `${clusterInfo?.name || 'Cluster'} Jurisdiction (${regions.join(', ')})`,
      };
    }

    // Regional Supervisor or Rank & File (FDRO, Licensing Officer, Information Officer)
    const userRegion = currentUser.office;
    return {
      allowedRegions: [userRegion],
      defaultRegionFilter: userRegion,
      scopeLabel: `${userRegion} Field Jurisdiction Only`,
    };
  }, [currentUser]);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedOrigin, setSelectedOrigin] = useState('All');
  const [selectedRegion, setSelectedRegion] = useState(defaultRegionFilter);
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedPriority, setSelectedPriority] = useState('All');

  // Sync region filter when user switches perspective
  useEffect(() => {
    setSelectedRegion(defaultRegionFilter);
  }, [defaultRegionFilter]);

  // Login handler
  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUserState(user);
    showToast(`Welcome back, ${user.firstName} ${user.lastName}! Access granted.`);
  };

  // Logout handler
  const handleLogout = () => {
    if (currentUser) {
      logSystemAction(
        'USER_LOGOUT',
        currentUser,
        `User ${currentUser.firstName} ${currentUser.lastName} signed out of the system.`
      );
    }
    setCurrentUser(null);
    setCurrentUserState(null);
    showToast('You have been safely signed out.');
  };

  // Quick switch between demo personas
  const handleSwitchUser = (target: UserAccount) => {
    const updated: UserAccount = {
      ...target,
      status: 'active',
      lastLogin: new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      lastActivity: 'Active in session',
    };
    setCurrentUser(updated);
    setCurrentUserState(updated);
    showToast(`Switched perspective to ${updated.firstName} ${updated.lastName} (${updated.role})`);
  };

  const handleRefreshUserList = () => {
    const list = getStoredUsers();
    setAllStaffUsers(list);
    // If current user was updated or deleted
    if (currentUser) {
      const match = list.find((u) => u.id === currentUser.id);
      if (match) {
        if (match.status === 'deactivated') {
          handleLogout();
        } else {
          setCurrentUserState(match);
        }
      }
    }
  };

  // Filtered Tasks logic (Strictly enforces Table Scoped Visibility by default)
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // 1. Strict Jurisdiction Filter
      // If user is not superadmin/admin, enforce their allowed regional scope
      if (currentUser && currentUser.role !== 'SUPERADMIN' && currentUser.role !== 'ADMIN') {
        const isAllowed = allowedRegions.some(
          (ar) =>
            task.region.toLowerCase().includes(ar.toLowerCase()) ||
            ar.toLowerCase().includes(task.region.toLowerCase())
        );
        if (!isAllowed) return false;
      }

      // 2. Region Dropdown Filter
      if (selectedRegion !== 'All') {
        const match =
          task.region.toLowerCase().includes(selectedRegion.toLowerCase()) ||
          selectedRegion.toLowerCase().includes(task.region.toLowerCase());
        if (!match) return false;
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = task.taskTitle.toLowerCase().includes(query);
        const matchesAssigned = task.assignedTo.toLowerCase().includes(query);
        const matchesLocation = (task.location || '').toLowerCase().includes(query);
        const matchesDesc = (task.description || '').toLowerCase().includes(query);
        const matchesId = task.id.toLowerCase().includes(query);
        if (!matchesTitle && !matchesAssigned && !matchesLocation && !matchesDesc && !matchesId) {
          return false;
        }
      }

      // 4. Category
      if (selectedCategory !== 'All' && task.category !== selectedCategory) {
        return false;
      }

      // 5. Origin
      if (selectedOrigin !== 'All' && task.origin !== selectedOrigin) {
        return false;
      }

      // 6. Status
      if (selectedStatus !== 'All' && task.status !== selectedStatus) {
        return false;
      }

      // 7. Priority
      if (selectedPriority !== 'All' && task.priority !== selectedPriority) {
        return false;
      }

      return true;
    });
  }, [
    tasks,
    currentUser,
    allowedRegions,
    selectedRegion,
    searchQuery,
    selectedCategory,
    selectedOrigin,
    selectedStatus,
    selectedPriority,
  ]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedCategory !== 'All' ||
    selectedOrigin !== 'All' ||
    selectedRegion !== defaultRegionFilter ||
    selectedStatus !== 'All' ||
    selectedPriority !== 'All';

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedOrigin('All');
    setSelectedRegion(defaultRegionFilter);
    setSelectedStatus('All');
    setSelectedPriority('All');
  };

  // Task creation
  const handleCreateTask = (newTask: Task) => {
    setTasks((prev) => [newTask, ...prev]);
    showToast(`Task "${newTask.taskTitle}" created and assigned to ${newTask.assignedTo}.`);

    if (currentUser) {
      logSystemAction(
        'TASK_CREATED',
        currentUser,
        `Created operational task: "${newTask.taskTitle}" in ${newTask.region}. Assigned to ${newTask.assignedTo}.`,
        { targetEntityId: newTask.id, targetEntityName: newTask.taskTitle }
      );
    }
  };

  // Update existing task
  const handleUpdateTask = (updatedTask: Task) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
    );
    if (selectedTask?.id === updatedTask.id) {
      setSelectedTask(updatedTask);
    }
    showToast(`Task details and dispatch slips updated.`);
  };

  // Delete task
  const handleDeleteTask = (taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      const target = tasks.find((t) => t.id === taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      if (selectedTask?.id === taskId) {
        setSelectedTask(null);
      }
      showToast('Task deleted successfully.');

      if (currentUser && target) {
        logSystemAction(
          'TASK_DELETED',
          currentUser,
          `Deleted operational task: "${target.taskTitle}" (${target.region}).`,
          { targetEntityId: taskId, targetEntityName: target.taskTitle }
        );
      }
    }
  };

  // Quick "Receive Task" handler (Open -> In Progress)
  const handleReceiveTask = (taskToReceive: Task) => {
    const actorName = currentUser
      ? `${currentUser.firstName} ${currentUser.lastName}`
      : taskToReceive.assignedTo;
    const actorOffice = currentUser?.office || taskToReceive.region;

    const formattedNow = formatDateTime(new Date());
    const newActivity = {
      id: `act-${Date.now()}`,
      action: `Task received and accepted into In-Progress execution.`,
      actor: actorName,
      actorOffice: actorOffice,
      date: formattedNow,
      notes: `Official receipt recorded by ${actorName}. Field regulatory operation initiated.`,
      newStatus: 'In Progress' as TaskStatus,
    };

    const updated: Task = {
      ...taskToReceive,
      status: 'In Progress',
      receivedAt: new Date().toISOString(),
      receivedBy: actorName,
      activityHistory: [newActivity, ...(taskToReceive.activityHistory || [])],
    };

    setTasks((prev) => prev.map((t) => (t.id === taskToReceive.id ? updated : t)));
    if (selectedTask?.id === taskToReceive.id) {
      setSelectedTask(updated);
    }

    if (currentUser) {
      logSystemAction(
        'TASK_RECEIVED',
        currentUser,
        `Task "${taskToReceive.taskTitle}" received and accepted by ${actorName}. Status updated to In Progress.`,
        { targetEntityId: taskToReceive.id, targetEntityName: taskToReceive.taskTitle }
      );
    }

    showToast(`Task received! Status advanced to "In Progress".`);
  };

  // Reset to default sample dataset
  const handleResetData = () => {
    if (
      confirm(
        'Are you sure you want to reset all tasks and dispatch slips to the original FDA FROO demo data?'
      )
    ) {
      const fresh = resetStoredTasks();
      setTasks(fresh);
      setSelectedTask(null);
      showToast('Task tracker data has been reset to defaults.');
    }
  };

  // If not logged in, render the official FDA FROO Landing Page
  if (!currentUser) {
    return <LandingPage onLoginSuccess={handleLoginSuccess} />;
  }

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
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenUserManagement={() => setIsUserManagementOpen(true)}
        onOpenSystemLogs={() => setIsSystemLogsOpen(true)}
        onOpenRegionalOverview={() => setIsRegionalOverviewOpen(true)}
        onExportCsv={() => exportTasksToCsv(filteredTasks)}
        onResetData={handleResetData}
        selectedRegionFilter={selectedRegion}
        onSelectRegionFilter={setSelectedRegion}
        allowedRegions={allowedRegions}
        scopeLabel={scopeLabel}
        allStaffUsers={allStaffUsers}
        onSwitchUser={handleSwitchUser}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Metric Cards (matching screenshot 1) */}
        <StatsCards
          tasks={filteredTasks}
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
          allowedRegions={allowedRegions}
          userRole={currentUser.role}
          scopeLabel={scopeLabel}
        />

        {/* Task List (matching screenshot 1 with Receive button and details drawer trigger) */}
        <TaskList
          tasks={filteredTasks}
          onSelectTask={(task) => setSelectedTask(task)}
          selectedTaskId={selectedTask?.id}
          onReceiveTask={handleReceiveTask}
          currentUserName={`${currentUser.firstName} ${currentUser.lastName}`}
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
        currentUser={currentUser}
        allowedRegions={allowedRegions}
      />

      {/* Task Details Drawer (matching screenshots 3 & 4 + Dispatch & Approvals) */}
      <TaskDetailsDrawer
        task={selectedTask}
        isOpen={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        onUpdateTask={handleUpdateTask}
        onDeleteTask={handleDeleteTask}
        currentUser={currentUser}
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

      {/* User Management Modal (Admin & Superadmin only) */}
      <UserManagementModal
        isOpen={isUserManagementOpen}
        onClose={() => setIsUserManagementOpen(false)}
        currentUser={currentUser}
        onUserListChanged={handleRefreshUserList}
      />

      {/* Global System Logs Modal (Admin & Superadmin only) */}
      <SystemLogsModal
        isOpen={isSystemLogsOpen}
        onClose={() => setIsSystemLogsOpen(false)}
        currentUser={currentUser}
      />
    </div>
  );
}
