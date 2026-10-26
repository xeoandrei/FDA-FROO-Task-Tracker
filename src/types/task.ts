export type TaskStatus = 'Open' | 'In Progress' | 'Completed' | 'Overdue';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface ActivityItem {
  id: string;
  action: string;
  actor: string;
  actorOffice?: string;
  date: string;
  notes?: string;
  newStatus?: TaskStatus;
}

export interface DispatchSlip {
  id: string;
  taskId: string;
  ctrlNo: string;
  dispatchDate: string;
  establishments: string[];
  locations: string[];
  purposes: {
    inspection: boolean;
    postMarketSurveillance: boolean;
    attendanceToMeeting: boolean;
    investigation: boolean;
    witnessForDestruction: boolean;
  };
  othersPurpose: string;
  timeOfArrival: string;
  teamLeader: string;
  teamMembers: string;
  driver: string;
  vehiclePlateNumber: string;
  recommendedBy: {
    name: string;
    title: string;
  };
  approvedBy: {
    name: string;
    title: string;
    signatureDate?: string;
    signedBy?: string;
  };
  status: 'Draft' | 'Approved' | 'Dispatched';
  createdAt: string;
}

export interface Task {
  id: string;
  taskTitle: string;
  category: string;
  origin: string;
  assignedTo: string;
  assignedOffice?: string;
  region: string;
  dueDate: string;
  scheduledDate?: string;
  location?: string;
  description?: string;
  outcome?: string;
  remarks?: string;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: string;
  createdBy: string;
  activityHistory: ActivityItem[];
  dispatchSlips?: DispatchSlip[];
}

export interface FrooOffice {
  id: string;
  code: string;
  name: string;
  shortLabel: string;
  coverage: string;
  defaultPersonnel: string[];
}

export interface FrooUserPersona {
  name: string;
  role: string;
  officeId: string;
  officeName: string;
  email: string;
}
