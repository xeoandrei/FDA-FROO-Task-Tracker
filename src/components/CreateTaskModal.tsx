import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, User, Building, AlertCircle } from 'lucide-react';
import { Task, TaskPriority, TaskStatus, FrooUserPersona } from '../types/task';
import { CATEGORIES, ORIGINS, PRIORITIES, FROO_OFFICES } from '../data/offices';
import { formatDateTime } from '../utils/storage';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (newTask: Task) => void;
  currentPersona: FrooUserPersona;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  currentPersona,
}) => {
  const [taskTitle, setTaskTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [origin, setOrigin] = useState('FROO');
  const [region, setRegion] = useState('NCR');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [dueDate, setDueDate] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  // Default suggested personnel when region changes
  const selectedOfficeObj = FROO_OFFICES.find(
    (o) => o.code === region || o.shortLabel === region || o.name === region
  );

  useEffect(() => {
    if (selectedOfficeObj && selectedOfficeObj.defaultPersonnel.length > 0) {
      setAssignedTo(selectedOfficeObj.defaultPersonnel[0]);
    }
  }, [region]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      setError('Please enter a task title');
      return;
    }
    if (!dueDate) {
      setError('Please select a due date');
      return;
    }

    const newId = `FROO-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    const todayFormatted = formatDateTime(new Date());

    const newTask: Task = {
      id: newId,
      taskTitle: taskTitle.trim(),
      category,
      origin,
      assignedTo: assignedTo.trim() || 'Regional Office Staff',
      assignedOffice: selectedOfficeObj?.shortLabel || region,
      region,
      dueDate,
      scheduledDate: scheduledDate || dueDate,
      location: location.trim() || `${region} Regional Office`,
      description: description.trim() || 'No additional instructions provided.',
      outcome: 'Scheduled',
      remarks: `Task created by ${currentPersona.name} (${currentPersona.officeName})`,
      status: 'Open',
      priority,
      createdAt: new Date().toISOString().split('T')[0],
      createdBy: `${currentPersona.name} (${currentPersona.officeName})`,
      activityHistory: [
        {
          id: `act-${Date.now()}`,
          action: `Task created and assigned to ${assignedTo.trim() || 'FROO staff'}.`,
          actor: currentPersona.name,
          actorOffice: currentPersona.officeName,
          date: todayFormatted,
          notes: description.trim() ? `Direct task assignment: ${description.trim().slice(0, 100)}` : undefined,
        },
      ],
    };

    onCreate(newTask);
    onClose();
    // Reset state
    setTaskTitle('');
    setDescription('');
    setLocation('');
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Create New Task</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Create and assign a new operational task.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Task Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={taskTitle}
              onChange={(e) => {
                setTaskTitle(e.target.value);
                if (error) setError('');
              }}
              placeholder="Enter task title"
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

          {/* Category & Origin */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 cursor-pointer"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Origin
              </label>
              <select
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 cursor-pointer"
              >
                {ORIGINS.map((orig) => (
                  <option key={orig} value={orig}>
                    {orig}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Region & Assigned To */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Region / Office
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 cursor-pointer"
              >
                {FROO_OFFICES.map((off) => (
                  <option key={off.id} value={off.code}>
                    {off.shortLabel}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Assigned To
              </label>
              <div className="space-y-1">
                <input
                  type="text"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  placeholder="Select or enter personnel"
                  list="personnel-suggestions"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
                <datalist id="personnel-suggestions">
                  {selectedOfficeObj?.defaultPersonnel.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
                {selectedOfficeObj && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedOfficeObj.defaultPersonnel.map((person) => (
                      <button
                        type="button"
                        key={person}
                        onClick={() => setAssignedTo(person)}
                        className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded cursor-pointer transition"
                      >
                        {person}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Priority & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 cursor-pointer"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Due Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 cursor-pointer"
              />
            </div>
          </div>

          {/* Scheduled Date & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Scheduled Date
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter location"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the task..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 resize-none"
            />
          </div>

          {/* Footer Actions (matching Screenshot 2) */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium text-white bg-[#056839] hover:bg-[#04522d] rounded-lg shadow-sm transition hover:shadow cursor-pointer"
            >
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
