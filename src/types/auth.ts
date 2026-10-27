export type UserRole =
  | 'SUPERADMIN'
  | 'ADMIN'
  | 'CLUSTER_DIRECTOR'
  | 'REGIONAL_SUPERVISOR'
  | 'STANDARD'
  | 'RANK_AND_FILE'; // alias for existing saved sessions

export type UserPosition =
  | 'Deputy Director General (DDG-FROO)'
  | 'ODDG-FROO Staff'
  | 'Cluster Director'
  | 'Regional Supervisor'
  | 'Food-Drug Regulation Officer (FDRO)'
  | 'Licensing Officer'
  | 'Information Officer';

export type ClusterCode = 'NLC' | 'SLC' | 'VC' | 'MEC' | 'MWC';

export interface ClusterInfo {
  code: ClusterCode;
  name: string;
  fullName: string;
  regions: string[];
}

export type AccountStatus = 'active' | 'inactive' | 'deactivated';

export interface UserAccount {
  id: string;
  username: string;
  password?: string;
  email: string; // strictly ends with @fda.gov.ph
  firstName: string;
  middleInitial: string;
  lastName: string;
  position: UserPosition;
  office: string; // ODDG-FROO or Region Name (e.g., Region NCR)
  cluster?: ClusterCode; // only for Cluster Director
  role: UserRole;
  status: AccountStatus;
  createdAt: string;
  lastLogin?: string;
  lastActivity?: string;
}

export type SystemActionType =
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'USER_REGISTERED'
  | 'USER_STATUS_CHANGED'
  | 'USER_DELETED'
  | 'USER_UPDATED'
  | 'TASK_CREATED'
  | 'TASK_ASSIGNED'
  | 'TASK_RECEIVED'
  | 'TASK_STATUS_CHANGED'
  | 'TASK_COMPLETED'
  | 'TASK_DELETED'
  | 'DISPATCH_CREATED'
  | 'DISPATCH_APPROVED'
  | 'DISPATCH_REJECTED'
  | 'DISPATCH_DELETED';

export interface SystemLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userEmail: string;
  office: string;
  role: UserRole;
  actionType: SystemActionType;
  description: string;
  targetEntityId?: string;
  targetEntityName?: string;
  metadata?: Record<string, unknown>;
}
