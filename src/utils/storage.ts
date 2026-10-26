import { Task, FrooUserPersona } from '../types/task';
import { INITIAL_TASKS } from '../data/initialTasks';
import { DEFAULT_PERSONAS } from '../data/offices';

const TASKS_STORAGE_KEY = 'froo_task_tracker_data_v1';
const PERSONA_STORAGE_KEY = 'froo_task_tracker_current_persona_v1';

export function getStoredTasks(): Task[] {
  try {
    const raw = localStorage.getItem(TASKS_STORAGE_KEY);
    if (!raw) return INITIAL_TASKS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((t) => {
        const init = INITIAL_TASKS.find((it) => it.id === t.id);
        if ((!t.dispatchSlips || t.dispatchSlips.length === 0) && init?.dispatchSlips) {
          return { ...t, dispatchSlips: init.dispatchSlips };
        }
        return { ...t, dispatchSlips: t.dispatchSlips || [] };
      });
    }
    return INITIAL_TASKS;
  } catch (e) {
    console.error('Failed to read tasks from localStorage', e);
    return INITIAL_TASKS;
  }
}

export function saveStoredTasks(tasks: Task[]): void {
  try {
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.error('Failed to save tasks to localStorage', e);
  }
}

export function resetStoredTasks(): Task[] {
  try {
    localStorage.removeItem(TASKS_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to reset tasks', e);
  }
  return INITIAL_TASKS;
}

export function getStoredPersona(): FrooUserPersona {
  try {
    const raw = localStorage.getItem(PERSONA_STORAGE_KEY);
    if (!raw) return DEFAULT_PERSONAS[0];
    return JSON.parse(raw);
  } catch (e) {
    return DEFAULT_PERSONAS[0];
  }
}

export function saveStoredPersona(persona: FrooUserPersona): void {
  try {
    localStorage.setItem(PERSONA_STORAGE_KEY, JSON.stringify(persona));
  } catch (e) {
    console.error('Failed to save persona to localStorage', e);
  }
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  // If already formatted like "Aug 15, 2026"
  if (/[A-Za-z]{3}\s+\d{1,2},\s+\d{4}/.test(dateStr)) {
    return dateStr;
  }
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(date: Date = new Date()): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function exportTasksToCsv(tasks: Task[]) {
  const headers = ['Task ID', 'Task Title', 'Category', 'Origin', 'Assigned To', 'Region', 'Due Date', 'Status', 'Priority', 'Outcome', 'Location', 'Remarks'];
  const rows = tasks.map(t => [
    `"${t.id}"`,
    `"${t.taskTitle.replace(/"/g, '""')}"`,
    `"${t.category}"`,
    `"${t.origin}"`,
    `"${t.assignedTo}"`,
    `"${t.region}"`,
    `"${formatDate(t.dueDate)}"`,
    `"${t.status}"`,
    `"${t.priority}"`,
    `"${(t.outcome || '').replace(/"/g, '""')}"`,
    `"${(t.location || '').replace(/"/g, '""')}"`,
    `"${(t.remarks || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `FROO_Tasks_Export_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
