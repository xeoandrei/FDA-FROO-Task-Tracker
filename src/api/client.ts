import { Task } from '../types/task';
import { UserAccount, SystemLog } from '../types/auth';
import {
  DoctrackStatusResponse,
  DoctrackBulkUploadResponse,
  DoctrackDtnSearchResponse,
  DoctrackUploadHistoryBatch,
  DoctrackUploadHistoryDetailResponse,
} from '../types/doctrack';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const TOKEN_KEY = 'froo_jwt_token_v1';
const SESSION_ID_KEY = 'froo_session_id_v1';
const LOGOUT_REASON_KEY = 'froo_session_logout_reason_v1';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getSessionId(): string | null {
  try {
    return localStorage.getItem(SESSION_ID_KEY);
  } catch {
    return null;
  }
}

export function setSessionId(sessionId: string | null): void {
  try {
    if (sessionId) {
      localStorage.setItem(SESSION_ID_KEY, sessionId);
    } else {
      localStorage.removeItem(SESSION_ID_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export function setSessionLogoutReason(reason: string | null): void {
  try {
    if (reason) {
      localStorage.setItem(LOGOUT_REASON_KEY, reason);
    } else {
      localStorage.removeItem(LOGOUT_REASON_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export function getSessionLogoutReason(): string | null {
  try {
    return localStorage.getItem(LOGOUT_REASON_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(SESSION_ID_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const sessionId = getSessionId();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (sessionId && !headers.has('X-Session-Id')) {
    headers.set('X-Session-Id', sessionId);
  }

  try {
    const sessionRaw = localStorage.getItem('froo_current_user_session_v2');
    if (sessionRaw) {
      const sessionUser = JSON.parse(sessionRaw);
      if (sessionUser?.id && !headers.has('X-User-Id')) {
        headers.set('X-User-Id', String(sessionUser.id));
      }
      if (sessionUser?.email && !headers.has('X-User-Email')) {
        headers.set('X-User-Email', String(sessionUser.email));
      }
    }
  } catch {
    // Ignore session parse errors
  }

  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `API request failed with status ${response.status}`;
    let errorCode = '';
    try {
      const errJson = await response.json();
      if (errJson?.error) {
        errorMessage = errJson.error;
      }
      if (errJson?.code) {
        errorCode = String(errJson.code);
      }
    } catch {
      // Fall back to default status text
    }

    // Broadcast immediate session invalidation event when kicked by another login, idle timeout, or admin force-logout
    if (
      typeof window !== 'undefined' &&
      endpoint !== '/api/auth/login' &&
      (errorCode === 'SESSION_REPLACED' ||
        errorCode === 'SESSION_FORCED_LOGOUT' ||
        errorCode === 'SESSION_IDLE_TIMEOUT' ||
        errorCode === 'SESSION_EXPIRED' ||
        errorCode === 'ACCOUNT_DEACTIVATED')
    ) {
      window.dispatchEvent(
        new CustomEvent('froo-session-invalidated', {
          detail: { code: errorCode, message: errorMessage },
        })
      );
    }

    throw new Error(errorMessage);
  }

  return response.json();
}

export const api = {
  // Health check
  async checkHealth(): Promise<{ status: string; database?: any }> {
    return request('/api/health');
  },

  // Auth
  async login(
    email: string,
    password: string
  ): Promise<{ token: string; sessionId?: string; user: UserAccount; displacedPreviousSession?: boolean }> {
    const res = await request<{
      token: string;
      sessionId?: string;
      user: UserAccount;
      displacedPreviousSession?: boolean;
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.token) {
      setAuthToken(res.token);
    }
    if (res.sessionId) {
      setSessionId(res.sessionId);
    }
    setSessionLogoutReason(null);
    return res;
  },

  async checkSession(): Promise<{ valid: boolean; sessionId?: string; serverTime?: string }> {
    return request('/api/auth/session-check');
  },

  async logout(reason: 'MANUAL' | 'IDLE_TIMEOUT' = 'MANUAL'): Promise<{ success: boolean }> {
    return request('/api/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async register(data: {
    username: string;
    email: string;
    password: string;
    firstName: string;
    middleInitial?: string;
    lastName: string;
    position: string;
    office: string;
  }): Promise<{ message: string; user: UserAccount }> {
    return request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    return request('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  async getMe(): Promise<{ user: UserAccount }> {
    return request('/api/auth/me');
  },

  // Users
  async getUsers(): Promise<UserAccount[]> {
    return request('/api/users');
  },

  async createUser(user: Partial<UserAccount> & { password?: string }): Promise<UserAccount> {
    return request('/api/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  },

  async updateUserStatus(id: string, status: 'active' | 'deactivated' | 'pending'): Promise<{ success: boolean }> {
    return request(`/api/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async approveUser(id: string): Promise<{ success: boolean; id: string; status: string; message: string }> {
    return request(`/api/users/${id}/approve`, {
      method: 'POST',
    });
  },

  async deleteUser(id: string): Promise<{ success: boolean; id: string; message: string }> {
    return request(`/api/users/${id}`, {
      method: 'DELETE',
    });
  },

  async forceLogoutUser(id: string): Promise<{ success: boolean; id: string; message: string }> {
    return request(`/api/users/${id}/force-logout`, {
      method: 'POST',
    });
  },

  async adminResetUserPassword(id: string, newPassword: string): Promise<{ success: boolean; id: string; message: string }> {
    return request(`/api/users/${id}/password`, {
      method: 'PATCH',
      body: JSON.stringify({ newPassword }),
    });
  },

  // Dynamic System Configuration (Superadmin CRUD)
  async getSystemConfig(): Promise<any> {
    return request('/api/references/config');
  },

  async updateSystemConfig(config: any): Promise<any> {
    return request('/api/references/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  },

  // Tasks
  async getTasks(): Promise<Task[]> {
    return request('/api/tasks');
  },

  async getTask(id: string): Promise<Task> {
    return request(`/api/tasks/${id}`);
  },

  async createTask(taskData: any): Promise<Task> {
    return request('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  },

  async updateTask(taskId: string, updates: any): Promise<Task> {
    return request(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  async receiveTask(taskId: string, syncToFis = true): Promise<Task> {
    return request(`/api/tasks/${taskId}/receive`, {
      method: 'POST',
      body: JSON.stringify({ syncToFis }),
    });
  },

  async completeTask(
    taskId: string,
    outcomeOrData: string | { outcome: string; remarks?: string; syncToFis?: boolean },
    remarksParam?: string
  ): Promise<Task> {
    const body =
      typeof outcomeOrData === 'object'
        ? outcomeOrData
        : { outcome: outcomeOrData, remarks: remarksParam };
    return request(`/api/tasks/${taskId}/complete`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async addTaskActivity(
    taskId: string,
    notesOrData: string | { action?: string; notes?: string; newStatus?: string; syncToFis?: boolean },
    newStatusParam?: string,
    actionParam?: string
  ): Promise<Task> {
    const body =
      typeof notesOrData === 'object'
        ? notesOrData
        : { notes: notesOrData, newStatus: newStatusParam, action: actionParam };
    return request(`/api/tasks/${taskId}/activity`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async syncTaskActivityToFis(
    taskId: string,
    remarkText: string
  ): Promise<{ success: boolean; mode: string; docrecID?: number; finalRemarks?: string }> {
    return request(`/api/tasks/${taskId}/sync-fis-activity`, {
      method: 'POST',
      body: JSON.stringify({ remarkText }),
    });
  },

  async deleteTask(taskId: string): Promise<{ success: boolean }> {
    return request(`/api/tasks/${taskId}`, {
      method: 'DELETE',
    });
  },

  async sendTaskReminder(
    taskId: string,
    customNote?: string
  ): Promise<{
    success: boolean;
    sent: boolean;
    mode: string;
    recipients: string[];
    error?: string;
    task?: Task;
  }> {
    return request(`/api/tasks/${taskId}/remind`, {
      method: 'POST',
      body: JSON.stringify({ customNote }),
    });
  },

  // Dispatches
  async createDispatch(taskId: string, dispatchData: any): Promise<any> {
    return request(`/api/tasks/${taskId}/dispatches`, {
      method: 'POST',
      body: JSON.stringify(dispatchData),
    });
  },

  async approveDispatch(dispatchId: string): Promise<{ success: boolean; id: string; status: string }> {
    return request(`/api/dispatches/${dispatchId}/approve`, {
      method: 'POST',
    });
  },

  async rejectDispatch(dispatchId: string, rejectionReason: string): Promise<{ success: boolean; id: string; status: string }> {
    return request(`/api/dispatches/${dispatchId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ rejectionReason }),
    });
  },

  async deleteDispatch(dispatchId: string): Promise<{ success: boolean }> {
    return request(`/api/dispatches/${dispatchId}`, {
      method: 'DELETE',
    });
  },

  // System Logs
  async getSystemLogs(): Promise<SystemLog[]> {
    return request('/api/system-logs');
  },

  async logSystemAction(actionType: string, description: string, extra?: { targetEntityId?: string; targetEntityName?: string }): Promise<any> {
    return request('/api/system-logs', {
      method: 'POST',
      body: JSON.stringify({
        actionType,
        description,
        targetEntityId: extra?.targetEntityId,
        targetEntityName: extra?.targetEntityName,
      }),
    });
  },

  // FIS Doctrack Integration (CDRR Bulk Upload & DTN Lookup)
  async getDoctrackStatus(): Promise<DoctrackStatusResponse> {
    return request('/api/doctrack/status');
  },

  async submitDoctrackBulkUpload(payload: {
    fileName: string;
    rows?: Array<{ rowNum: number; rsn: string; remarks: string }>;
    fileBase64?: string;
    customAlias?: string;
    syncFrooTasks?: boolean;
  }): Promise<DoctrackBulkUploadResponse> {
    return request('/api/doctrack/bulk-upload', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async searchDoctrackDtn(dtn: string): Promise<DoctrackDtnSearchResponse> {
    return request(`/api/doctrack/dtn/${encodeURIComponent(dtn.trim())}`);
  },

  async getDoctrackHistory(): Promise<DoctrackUploadHistoryBatch[]> {
    return request('/api/doctrack/history');
  },

  async getDoctrackHistoryDetails(historyId: string): Promise<DoctrackUploadHistoryDetailResponse> {
    return request(`/api/doctrack/history/${encodeURIComponent(historyId)}`);
  },
};

