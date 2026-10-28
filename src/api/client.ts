import { Task } from '../types/task';
import { UserAccount, SystemLog } from '../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const TOKEN_KEY = 'froo_jwt_token_v1';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
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
    }
  } catch {
    // Ignore storage errors
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `API request failed with status ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson?.error) {
        errorMessage = errJson.error;
      }
    } catch {
      // Fall back to default status text
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
  async login(email: string, password: string): Promise<{ token: string; user: UserAccount }> {
    const res = await request<{ token: string; user: UserAccount }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.token) {
      setAuthToken(res.token);
    }
    return res;
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

  async demoLogin(username: string): Promise<{ token: string; user: UserAccount }> {
    const res = await request<{ token: string; user: UserAccount }>('/api/auth/demo-login', {
      method: 'POST',
      body: JSON.stringify({ username }),
    });
    if (res.token) {
      setAuthToken(res.token);
    }
    return res;
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

  async receiveTask(taskId: string): Promise<Task> {
    return request(`/api/tasks/${taskId}/receive`, {
      method: 'POST',
    });
  },

  async completeTask(
    taskId: string,
    outcomeOrData: string | { outcome: string; remarks?: string },
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
    notesOrData: string | { action?: string; notes?: string; newStatus?: string },
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

  async deleteTask(taskId: string): Promise<{ success: boolean }> {
    return request(`/api/tasks/${taskId}`, {
      method: 'DELETE',
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
};
