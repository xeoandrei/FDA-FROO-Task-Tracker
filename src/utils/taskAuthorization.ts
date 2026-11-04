import { Task } from '../types/task';
import { UserAccount } from '../types/auth';
import { getRegionsForCluster } from '../data/clusters';
import { FROO_OFFICES } from '../data/offices';

/**
 * Normalizes a single region or office token into canonical lowercase identifiers
 * so "Region NCR" matches "NCR", "Region CAR" matches "CAR", "Region 12" matches "Region 12 / BARMM", etc.
 */
function expandRegionTokens(raw: string): string[] {
  const val = raw.toLowerCase().trim();
  if (!val) return [];

  const tokens = new Set<string>([val]);

  if (val === 'ncr' || val === 'region ncr' || val.includes('field office - ncr')) {
    tokens.add('ncr');
    tokens.add('region ncr');
  }
  if (val === 'car' || val === 'region car' || val.includes('cordillera')) {
    tokens.add('car');
    tokens.add('region car');
  }
  if (val === 'region 12' || val === 'barmm' || val === 'region 12 / barmm' || val.includes('soccksargen')) {
    tokens.add('region 12');
    tokens.add('barmm');
    tokens.add('region 12 / barmm');
  }
  if (val === 'region 13' || val === 'caraga' || val === 'region 13 (caraga)' || val.includes('caraga')) {
    tokens.add('region 13');
    tokens.add('caraga');
    tokens.add('region 13 (caraga)');
  }
  if (val === 'nlc' || val.includes('north luzon')) {
    tokens.add('nlc');
    tokens.add('north luzon cluster (nlc)');
  }
  if (val === 'slc' || val.includes('south luzon')) {
    tokens.add('slc');
    tokens.add('south luzon cluster (slc)');
  }
  if (val === 'vbc' || val === 'vc' || val.includes('visayas')) {
    tokens.add('vbc');
    tokens.add('vc');
    tokens.add('visayas cluster (vc)');
  }
  if (val === 'moc' || val.includes('mindanao')) {
    tokens.add('moc');
    tokens.add('mindanao cluster (moc)');
  }

  for (const office of FROO_OFFICES) {
    const codeL = office.code.toLowerCase();
    const nameL = office.name.toLowerCase();
    const shortL = office.shortLabel.toLowerCase();
    if (val === codeL || val === nameL || val === shortL) {
      tokens.add(codeL);
      tokens.add(nameL);
      tokens.add(shortL);
    }
  }

  return Array.from(tokens);
}

/**
 * Checks if a task's region/office (which may be a comma-separated list of regions/offices)
 * matches a target region/office string.
 */
export function doesRegionMatch(taskRegion: string, targetRegionOrOffice: string): boolean {
  if (!taskRegion || !targetRegionOrOffice) return false;

  const taskParts = taskRegion
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const targetParts = targetRegionOrOffice
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  for (const tp of taskParts) {
    const taskTokens = expandRegionTokens(tp);
    for (const ar of targetParts) {
      const targetTokens = expandRegionTokens(ar);
      if (taskTokens.some((tt) => targetTokens.includes(tt))) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Checks if a task was created by the given user account.
 */
export function isUserCreatedTask(task: Task, user: UserAccount | null): boolean {
  if (!user || !task.createdBy) return false;
  const creator = task.createdBy.toLowerCase().trim();
  const userFullName = `${user.firstName} ${user.lastName}`.toLowerCase().trim();
  const userFullWithMiddle = user.middleInitial
    ? `${user.firstName} ${user.middleInitial} ${user.lastName}`.toLowerCase().trim()
    : '';

  if (creator === userFullName || (userFullWithMiddle && creator === userFullWithMiddle)) {
    return true;
  }
  if (user.email && creator === user.email.toLowerCase().trim()) {
    return true;
  }
  const first = user.firstName.toLowerCase().trim();
  const last = user.lastName.toLowerCase().trim();
  if (first.length > 1 && last.length > 1 && creator.includes(first) && creator.includes(last)) {
    return true;
  }
  return false;
}

/**
 * Checks if a task is directly assigned to the given user account.
 */
export function isUserAssignedToTask(task: Task, user: UserAccount | null): boolean {
  if (!user) return false;

  const userFullName = `${user.firstName} ${user.lastName}`.toLowerCase().trim();
  const assigned = (task.assignedTo || '').toLowerCase().trim();

  // 1. Direct full name or comma-separated multi-assignee match
  const assigneeList = assigned
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (assigned === userFullName || assigneeList.includes(userFullName)) return true;

  // 2. Direct email match
  if (task.assignedUserEmail && task.assignedUserEmail.toLowerCase() === user.email.toLowerCase()) {
    return true;
  }

  // 3. User's last name & first name both present in any assignee entry
  const first = user.firstName.toLowerCase().trim();
  const last = user.lastName.toLowerCase().trim();
  if (
    first.length > 1 &&
    last.length > 1 &&
    (assigneeList.some((entry) => entry.includes(first) && entry.includes(last)) ||
      (assigned.includes(last) && assigned.includes(first)))
  ) {
    return true;
  }

  // 4. Exact username match in assigned string
  if (user.username && assigneeList.includes(user.username.toLowerCase().trim())) {
    return true;
  }

  return false;
}

/**
 * Checks if a task requires direct action from the given user account.
 * (e.g. assigned to them, awaiting receipt in their region/office, or pending dispatch approval)
 */
export function isTaskRequiringUserAction(task: Task, user: UserAccount | null): boolean {
  if (!user) return false;

  // Direct assignee requires action if open (needs receipt) or in progress (needs execution/completion)
  if (isUserAssignedToTask(task, user)) {
    return true;
  }

  // Open task awaiting receipt in the user's office or cluster
  if (task.status === 'Open' && !task.receivedAt) {
    if (doesRegionMatch(task.region, user.office)) {
      return true;
    }
    if (user.role === 'CLUSTER_DIRECTOR') {
      const clusterRegions = getRegionsForCluster(user.cluster || 'NLC');
      if (clusterRegions.some((r) => doesRegionMatch(task.region, r))) {
        return true;
      }
    }
  }

  // Check if there are dispatch slips pending approval by this user
  if (task.dispatchSlips && task.dispatchSlips.length > 0) {
    const hasPendingRegionalApproval = task.dispatchSlips.some(
      (s) => s.status === 'Pending Regional Supervisor Approval'
    );
    if (hasPendingRegionalApproval) {
      if (user.role === 'SUPERADMIN' || user.role === 'ADMIN') return true;
      if (user.role === 'REGIONAL_SUPERVISOR' && doesRegionMatch(task.region, user.office)) {
        return true;
      }
      if (user.role === 'CLUSTER_DIRECTOR') {
        const clusterRegions = getRegionsForCluster(user.cluster || 'NLC');
        if (clusterRegions.some((r) => doesRegionMatch(task.region, r))) {
          return true;
        }
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

  // Direct assignee can always receive a task assigned to them
  if (isUserAssignedToTask(task, user)) {
    return { allowed: true };
  }

  // Cluster Director can receive tasks in their cluster
  if (user.role === 'CLUSTER_DIRECTOR') {
    const clusterRegions = getRegionsForCluster(user.cluster || 'NLC');
    const isRegionMatch =
      doesRegionMatch(task.region, user.office) ||
      clusterRegions.some((r) => doesRegionMatch(task.region, r));
    if (isRegionMatch) return { allowed: true };
    return {
      allowed: false,
      reason: `This task is designated for ${task.region}, which is outside your cluster jurisdiction (${clusterRegions.join(', ')}).`,
    };
  }

  // Regional Supervisor can receive tasks in their region
  if (user.role === 'REGIONAL_SUPERVISOR') {
    if (doesRegionMatch(task.region, user.office)) return { allowed: true };
    return {
      allowed: false,
      reason: `This task is in ${task.region}, but your supervisor jurisdiction is ${user.office}.`,
    };
  }

  // Standard staff in the same regional office
  if (doesRegionMatch(task.region, user.office)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `You are not authorized to receive this task. It is assigned to ${task.assignedTo} (${task.region}).`,
  };
}
