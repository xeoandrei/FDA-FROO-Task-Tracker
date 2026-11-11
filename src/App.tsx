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
  saveStoredUsers,
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
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { TaskViewTabs, TaskViewType } from './components/TaskViewTabs';
import { ReceiveTaskModal } from './components/ReceiveTaskModal';
import {
  isUserAssignedToTask,
  isUserCreatedTask,
  isTaskRequiringUserAction,
  validateCanReceiveTask,
  doesRegionMatch,
} from './utils/taskAuthorization';
import { ActivityItem } from './types/task';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';
import { api, setAuthToken, getAuthToken } from './api/client';

export default function App() {
  // Current authenticated user session
  const [currentUser, setCurrentUserState] = useState<UserAccount | null>(() => getCurrentUser());
  const [allStaffUsers, setAllStaffUsers] = useState<UserAccount[]>(() => getStoredUsers());

  // Task data
  const [tasks, setTasks] = useState<Task[]>(() => getStoredTasks());

  // Database / API connectivity state
  const [dbStatus, setDbStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');

  // Modals & Panels
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRegionalOverviewOpen, setIsRegionalOverviewOpen] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [isSystemLogsOpen, setIsSystemLogsOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Task views state (Defaults to 'MY_TASKS' per user specification)
  const [activeView, setActiveView] = useState<TaskViewType>('MY_TASKS');
  const [taskToConfirmReceive, setTaskToConfirmReceive] = useState<Task | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Authoritative deduplicated task list from backend database (never resurrect deleted tasks from localStorage)
  const syncTasksFromBackend = async (remoteTasks: Task[]): Promise<Task[]> => {
    const seenIds = new Set<string>();
    const deduplicated: Task[] = [];
    for (const item of remoteTasks) {
      if (item && item.id && !seenIds.has(item.id)) {
        seenIds.add(item.id);
        deduplicated.push(item);
      }
    }
    return deduplicated;
  };

  // Sync with Express backend & MySQL database when available
  useEffect(() => {
    let isMounted = true;
    async function checkAndSync() {
      try {
        const health = await api.checkHealth();
        if (health && health.status === 'ok') {
          if (isMounted) setDbStatus('online');

          const [usersRes, tasksRes] = await Promise.allSettled([
            api.getUsers(),
            api.getTasks(),
          ]);

          if (isMounted && usersRes.status === 'fulfilled' && Array.isArray(usersRes.value)) {
            saveStoredUsers(usersRes.value);
            setAllStaffUsers(getStoredUsers());
          }

          if (isMounted && tasksRes.status === 'fulfilled' && Array.isArray(tasksRes.value)) {
            const merged = await syncTasksFromBackend(tasksRes.value);
            if (isMounted) {
              setTasks(merged);
              saveStoredTasks(merged);
            }
          }
        } else {
          if (isMounted) setDbStatus('offline');
        }
      } catch {
        if (isMounted) setDbStatus('offline');
      }
    }

    checkAndSync();
    return () => {
      isMounted = false;
    };
  }, []);

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
        scopeLabel: 'National Scope (ODDG-FROO & All 16 Regional Offices)',
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

    // Regional Supervisor or Standard Staff (FDRO, Licensing Officer, Information Officer)
    const userRegion = currentUser.office;
    return {
      allowedRegions: [userRegion],
      defaultRegionFilter: 'All',
      scopeLabel: `${userRegion} Field Jurisdiction`,
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
  const handleLoginSuccess = async (user: UserAccount) => {
    setCurrentUserState(user);
    setActiveView('MY_TASKS');
    showToast(`Welcome back, ${user.firstName} ${user.lastName}! Access granted.`);

    // Fetch fresh task and user list with the authenticated token
    try {
      const [usersRes, tasksRes] = await Promise.allSettled([
        api.getUsers(),
        api.getTasks(),
      ]);
      if (usersRes.status === 'fulfilled' && Array.isArray(usersRes.value)) {
        saveStoredUsers(usersRes.value);
        setAllStaffUsers(getStoredUsers());
      }
      if (tasksRes.status === 'fulfilled' && Array.isArray(tasksRes.value)) {
        setDbStatus('online');
        const merged = await syncTasksFromBackend(tasksRes.value);
        setTasks(merged);
        saveStoredTasks(merged);
      }
    } catch {
      // Keep existing tasks and users
    }
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
    setAuthToken(null);
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
    setActiveView('MY_TASKS');
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

  // 1. Jurisdiction base tasks (filtered by user's authorized role, direct assignment, creation, or regions)
  const jurisdictionTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (!currentUser) return true;
      if (currentUser.role === 'SUPERADMIN' || currentUser.role === 'ADMIN') return true;
      if (isUserAssignedToTask(task, currentUser) || isUserCreatedTask(task, currentUser)) return true;
      return allowedRegions.some((ar) => doesRegionMatch(task.region, ar));
    });
  }, [tasks, currentUser, allowedRegions]);

  // View 1: My Tasks (Tasks assigned to, created by, or requiring action from the current user)
  const myTasks = useMemo(() => {
    if (!currentUser) return jurisdictionTasks;
    return jurisdictionTasks.filter((task) => {
      return (
        isUserAssignedToTask(task, currentUser) ||
        isUserCreatedTask(task, currentUser) ||
        isTaskRequiringUserAction(task, currentUser)
      );
    });
  }, [jurisdictionTasks, currentUser]);

  // View 2: Tasks to Receive (Dispatched tasks awaiting receipt by the authorized recipient)
  const tasksToReceive = useMemo(() => {
    if (!currentUser) return jurisdictionTasks.filter((t) => t.status === 'Open' && !t.receivedAt);
    return jurisdictionTasks.filter((task) => {
      // Must be awaiting receipt
      if (task.status !== 'Open' || task.receivedAt) return false;

      // Direct assignee can always see & receive
      if (isUserAssignedToTask(task, currentUser)) return true;

      // For standard staff: in their regional/central office
      if (currentUser.role === 'STANDARD' || (currentUser.role as string) === 'RANK_AND_FILE') {
        return doesRegionMatch(task.region, currentUser.office);
      }

      // For regional supervisor: tasks in their regional office
      if (currentUser.role === 'REGIONAL_SUPERVISOR') {
        return doesRegionMatch(task.region, currentUser.office);
      }

      // For Cluster Director: tasks in cluster regions
      if (currentUser.role === 'CLUSTER_DIRECTOR') {
        return (
          doesRegionMatch(task.region, currentUser.office) ||
          allowedRegions.some((ar) => doesRegionMatch(task.region, ar))
        );
      }

      // For Admin / Superadmin: all dispatched tasks awaiting receipt in jurisdiction
      return true;
    });
  }, [jurisdictionTasks, currentUser, allowedRegions]);

  // View 3: All Tasks (Tasks visible according to the user's existing role and jurisdiction)
  const allTasks = jurisdictionTasks;

  // Active view base tasks
  const activeViewTasks = useMemo(() => {
    switch (activeView) {
      case 'MY_TASKS':
        return myTasks;
      case 'TASKS_TO_RECEIVE':
        return tasksToReceive;
      case 'ALL_TASKS':
      default:
        return allTasks;
    }
  }, [activeView, myTasks, tasksToReceive, allTasks]);

  // Filtered Tasks logic (reflects active view + dropdown filters)
  const filteredTasks = useMemo(() => {
    return activeViewTasks.filter((task) => {
      // 1. Region Dropdown Filter
      if (selectedRegion !== 'All') {
        if (!doesRegionMatch(task.region, selectedRegion)) return false;
      }

      // 2. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = task.taskTitle.toLowerCase().includes(query);
        const matchesAssigned = task.assignedTo.toLowerCase().includes(query);
        const matchesLocation = (task.location || '').toLowerCase().includes(query);
        const matchesDesc = (task.description || '').toLowerCase().includes(query);
        const matchesId = task.id.toLowerCase().includes(query);
        const matchesDtn = (task.dtn || '').toLowerCase().includes(query);
        if (!matchesTitle && !matchesAssigned && !matchesLocation && !matchesDesc && !matchesId && !matchesDtn) {
          return false;
        }
      }

      // 3. Category
      if (selectedCategory !== 'All' && task.category !== selectedCategory) {
        return false;
      }

      // 4. Origin
      if (selectedOrigin !== 'All' && task.origin !== selectedOrigin) {
        return false;
      }

      // 5. Status
      if (selectedStatus !== 'All' && task.status !== selectedStatus) {
        return false;
      }

      // 6. Priority
      if (selectedPriority !== 'All' && task.priority !== selectedPriority) {
        return false;
      }

      return true;
    });
  }, [
    activeViewTasks,
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
  const handleCreateTask = async (newTask: Task) => {
    try {
      const created = await api.createTask({
        taskTitle: newTask.taskTitle,
        category: newTask.category,
        origin: newTask.origin,
        originDetails: newTask.originDetails,
        assignedTo: newTask.assignedTo,
        region: newTask.region,
        dueDate: newTask.dueDate,
        scheduledDate: newTask.scheduledDate,
        location: newTask.location,
        description: newTask.description,
        priority: newTask.priority,
        dtn: newTask.dtn,
      });

      if (created) {
        setDbStatus('online');
        setTasks((prev) => {
          const next = [created, ...prev.filter((t) => t.id !== created.id)];
          saveStoredTasks(next);
          return next;
        });
        showToast(`Task "${created.taskTitle}" saved and assigned to ${created.assignedTo}.`);
        return;
      }
    } catch (err: any) {
      console.warn('API task creation note:', err.message);
    }

    setTasks((prev) => {
      const next = [newTask, ...prev.filter((t) => t.id !== newTask.id)];
      saveStoredTasks(next);
      return next;
    });
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
    setTasks((prev) => {
      const next = prev.map((t) => (t.id === updatedTask.id ? updatedTask : t));
      saveStoredTasks(next);
      return next;
    });
    if (selectedTask?.id === updatedTask.id) {
      setSelectedTask(updatedTask);
    }
    showToast(`Task details and dispatch slips updated.`);
  };

  // Delete task
  const handleDeleteTask = async (taskId: string) => {
    const target = tasks.find((t) => t.id === taskId);
    try {
      await api.deleteTask(taskId);
    } catch (err: any) {
      console.warn('Backend delete task notice:', err.message);
    }

    setTasks((prev) => {
      const next = prev.filter((t) => t.id !== taskId);
      saveStoredTasks(next);
      return next;
    });
    if (selectedTask?.id === taskId) {
      setSelectedTask(null);
    }
    showToast('Task deleted permanently.');

    if (currentUser && target) {
      logSystemAction(
        'TASK_DELETED',
        currentUser,
        `Deleted operational task: "${target.taskTitle}" (${target.region}).`,
        { targetEntityId: taskId, targetEntityName: target.taskTitle }
      );
    }
  };

  // Trigger receipt confirmation modal
  const handlePromptReceiveTask = (taskToReceive: Task) => {
    setTaskToConfirmReceive(taskToReceive);
  };

  // Confirmed Receive Task handler with validation, identity & timestamp recording
  const handleConfirmAcceptTask = async (taskToReceive: Task) => {
    const validation = validateCanReceiveTask(taskToReceive, currentUser);
    if (!validation.allowed) {
      showToast(validation.reason || 'You are not authorized to receive this task.');
      setTaskToConfirmReceive(null);
      return;
    }

    if (dbStatus === 'online') {
      try {
        const updated = await api.receiveTask(taskToReceive.id);
        if (updated) {
          setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
          if (selectedTask?.id === updated.id) {
            setSelectedTask(updated);
          }
          setTaskToConfirmReceive(null);
          showToast(`Task "${updated.taskTitle}" officially received & accepted into MySQL execution.`);
          return;
        }
      } catch (err: any) {
        console.warn('Backend receive task notice:', err.message);
      }
    }

    const actorName = currentUser
      ? `${currentUser.firstName} ${currentUser.lastName}`
      : taskToReceive.assignedTo;
    const actorOffice = currentUser?.office || taskToReceive.region;
    const actorPosition = currentUser?.position || 'Authorized Staff';

    const formattedNow = formatDateTime(new Date());
    const newActivity: ActivityItem = {
      id: `act-${Date.now()}`,
      action: `Task received and accepted into In-Progress execution.`,
      actor: actorName,
      actorOffice: actorOffice,
      date: formattedNow,
      notes: `Official receipt recorded by ${actorName} (${actorPosition}, ${actorOffice}). Task execution initiated.`,
      newStatus: 'In Progress',
    };

    const updated: Task = {
      ...taskToReceive,
      status: 'In Progress',
      receivedAt: new Date().toISOString(),
      receivedBy: `${actorName} (${actorPosition}, ${actorOffice})`,
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
        `Task "${taskToReceive.taskTitle}" (DTN: ${taskToReceive.dtn || 'N/A'}) received and accepted by ${actorName}. Status updated to In Progress.`,
        { targetEntityId: taskToReceive.id, targetEntityName: taskToReceive.taskTitle }
      );
    }

    setTaskToConfirmReceive(null);
    showToast(`Task "${taskToReceive.taskTitle}" officially received & accepted into execution.`);
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
        onOpenChangePassword={() => setIsChangePasswordOpen(true)}
        onExportCsv={() => exportTasksToCsv(filteredTasks)}
        selectedRegionFilter={selectedRegion}
        onSelectRegionFilter={setSelectedRegion}
        allowedRegions={allowedRegions}
        scopeLabel={scopeLabel}
        allStaffUsers={allStaffUsers}
        dbStatus={dbStatus}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Separate Task Views Tabs (My Tasks, Tasks to Receive, All Tasks) */}
        <TaskViewTabs
          activeView={activeView}
          onSelectView={(v) => {
            setActiveView(v);
            setSelectedStatus('All');
          }}
          myTasksCount={myTasks.length}
          tasksToReceiveCount={tasksToReceive.length}
          allTasksCount={allTasks.length}
        />

        {/* Metric Cards - counts reflect active view base tasks */}
        <StatsCards
          tasks={activeViewTasks}
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
          onReceiveTask={handlePromptReceiveTask}
          currentUserName={`${currentUser.firstName} ${currentUser.lastName}`}
          activeView={activeView}
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
        allStaffUsers={allStaffUsers}
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
        onPromptReceiveTask={handlePromptReceiveTask}
      />

      {/* Receive and Accept Task Confirmation Modal */}
      <ReceiveTaskModal
        isOpen={Boolean(taskToConfirmReceive)}
        onClose={() => setTaskToConfirmReceive(null)}
        task={taskToConfirmReceive}
        currentUser={currentUser}
        onConfirmAccept={handleConfirmAcceptTask}
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

      {/* Change Account Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        currentUser={currentUser}
        onSuccessToast={showToast}
      />
    </div>
  );
}
