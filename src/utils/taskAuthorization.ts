import { Task } from '../types/task';
import { UserAccount } from '../types/auth';
import { FROO_CLUSTERS, getRegionsForCluster } from '../data/clusters';

/**
 * Checks if a task is directly assigned to the given user account.
 */
export function isUserAssignedToTask(task: Task, user: UserAccount | null): boolean {
  if (!user) return false;

  const userFullName = `${user.firstName} ${user.lastName}`.toLowerCase().trim();
  const assigned = (task.assignedTo || '').toLowerCase().trim();

  // 1. Direct full name match
  if (assigned === userFullName) return true;

  // 2. Direct email match
  if (task.assignedUserEmail && task.assignedUserEmail.toLowerCase() === user.email.toLowerCase()) {
    return true;
  }

  // 3. User's last name & first name both present in assigned string
  const first = user.firstName.toLowerCase().trim();
  const last = user.lastName.toLowerCase().trim();
  if (first.length > 1 && last.length > 1 && assigned.includes(last) && assigned.includes(first)) {
    return true;
  }

  // 4. Exact username match in assigned string
  if (user.username && assigned.includes(user.username.toLowerCase())) {
    return true;
  }

  return false;
}

/**
 * Checks if a task requires direct action from the given user account.
 * (e.g. assigned to them, or user is supervisor/admin needing to approve dispatch)
 */
export function isTaskRequiringUserAction(task: Task, user: UserAccount | null): boolean {
  if (!user) return false;

  // Direct assignee requires action if open (needs receipt) or in progress (needs execution/completion)
  if (isUserAssignedToTask(task, user)) {
    return true;
  }

  // Check if there are dispatch slips pending approval by this user
  if (task.dispatchSlips && task.dispatchSlips.length > 0) {
    const hasPendingRegionalApproval = task.dispatchSlips.some(
      (s) => s.status === 'Pending Regional Supervisor Approval'
    );
    if (hasPendingRegionalApproval) {
      if (user.role === 'SUPERADMIN' || user.role === 'ADMIN') return true;
      if (user.role === 'REGIONAL_SUPERVISOR') {
        const isOfficeMatch =
          user.office.toLowerCase().includes(task.region.toLowerCase()) ||
          task.region.toLowerCase().includes(user.office.toLowerCase());
        if (isOfficeMatch) return true;
      }
    }

    const hasPendingODDGApproval = task.dispatchSlips.some(
      (s) => s.status === 'Pending ODDG Approval'
    );
    if (hasPendingODDGApproval) {
      if (user.role === 'SUPERADMIN' || user.role === 'ADMIN' || user.office === 'ODDG-FROO') {
        return true;
      }
    }
  }

  return false;
}

/**
 * Validates whether the given user is authorized to receive and accept the task.
 */
export function validateCanReceiveTask(
  task: Task,
  user: UserAccount | null
): { allowed: boolean; reason?: string } {
  if (!user) {
    return { allowed: false, reason: 'Active authenticated session required.' };
  }

  // Prevent duplicate acceptance
  if (task.receivedAt || task.status !== 'Open') {
    return {
      allowed: false,
      reason: `Task was already received${task.receivedBy ? ` by ${task.receivedBy}` : ''}. Duplicate receipt is prevented.`,
    };
  }

  // Superadmin and Central Admin can receive any operational task
  if (user.role === 'SUPERADMIN' || user.role === 'ADMIN') {
    return { allowed: true };
  }

  // Cluster Director can receive tasks in their cluster
  if (user.role === 'CLUSTER_DIRECTOR') {
    const clusterRegions = getRegionsForCluster(user.cluster || 'NLC');
    const isRegionMatch = clusterRegions.some(
      (r) => r.toLowerCase() === task.region.toLowerCase() || task.region.toLowerCase().includes(r.toLowerCase())
    );
    if (isRegionMatch) return { allowed: true };
    return {
      allowed: false,
      reason: `This task is designated for ${task.region}, which is outside your cluster jurisdiction (${clusterRegions.join(', ')}).`,
    };
  }

  // Regional Supervisor can receive tasks in their region
  if (user.role === 'REGIONAL_SUPERVISOR') {
    const isRegionMatch =
      user.office.toLowerCase().includes(task.region.toLowerCase()) ||
      task.region.toLowerCase().includes(user.office.toLowerCase());
    if (isRegionMatch) return { allowed: true };
    return {
      allowed: false,
      reason: `This task is in ${task.region}, but your supervisor jurisdiction is ${user.office}.`,
    };
  }

  // Standard staff (FDRO, Licensing Officer, etc.)
  // Authorized if assigned to them, or if within their regional office
  if (isUserAssignedToTask(task, user)) {
    return { allowed: true };
  }

  const isSameRegion =
    user.office.toLowerCase().includes(task.region.toLowerCase()) ||
    task.region.toLowerCase().includes(user.office.toLowerCase());
  if (isSameRegion) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `You are not authorized to receive this task. It is assigned to ${task.assignedTo} (${task.region}).`,
  };
}
