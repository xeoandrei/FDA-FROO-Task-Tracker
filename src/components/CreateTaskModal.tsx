import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, User, Building, AlertCircle } from 'lucide-react';
import { Task, TaskPriority, TaskStatus, FrooUserPersona } from '../types/task';
import { UserAccount } from '../types/auth';
import { CATEGORIES, ORIGINS, PRIORITIES, FROO_OFFICES } from '../data/offices';
import { formatDateTime } from '../utils/storage';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (newTask: Task) => void;
  currentPersona?: FrooUserPersona;
  currentUser?: UserAccount | null;
  allowedRegions?: string[];
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  currentPersona,
  currentUser,
  allowedRegions,
}) => {
  const creatorName = currentUser
    ? `${currentUser.firstName} ${currentUser.lastName}`
    : currentPersona?.name || 'Authorized Officer';
  const creatorOffice = currentUser?.office || currentPersona?.officeName || 'ODDG-FROO';

  // Available offices based on jurisdiction
  const availableOffices = allowedRegions && allowedRegions.length > 0
    ? FROO_OFFICES.filter((o) =>
        allowedRegions.some(
          (ar) =>
            ar.toLowerCase() === o.code.toLowerCase() ||
            ar.toLowerCase() === o.name.toLowerCase() ||
            o.code.toLowerCase().includes(ar.toLowerCase())
        )
      )
    : FROO_OFFICES;

  const defaultRegion = availableOffices[0]?.code || 'NCR';

  const [taskTitle, setTaskTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [origin, setOrigin] = useState('FROO');
  const [region, setRegion] = useState(defaultRegion);
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

  useEffect(() => {
    if (availableOffices.length > 0 && !availableOffices.some((o) => o.code === region)) {
      setRegion(availableOffices[0].code);
    }
  }, [allowedRegions]);

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
      remarks: `Task created by ${creatorName} (${creatorOffice})`,
      status: 'Open', // Starts as Open, awaiting Assignee Receipt
      priority,
      createdAt: new Date().toISOString().split('T')[0],
      createdBy: `${creatorName} (${creatorOffice})`,
      activityHistory: [
        {
          id: `act-${Date.now()}`,
          action: `Task created and assigned to ${assignedTo.trim() || 'FROO staff'}.`,
          actor: creatorName,
          actorOffice: creatorOffice,
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4">
      {/* Modal Dialog (Matching Screenshot 2) */}
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Create New Task</h3>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Task Title */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Task Title
            </label>
            <input
              type="text"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="Enter task title"
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#056839]"
            />
          </div>

          {/* Category & Origin */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#056839]"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Origin
              </label>
              <select
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#056839]"
              >
                {ORIGINS.map((orig) => (
                  <option key={orig} value={orig}>
                    {orig}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Assigned To & Region */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Assigned To
              </label>
              <input
                type="text"
                list="personnel-suggestions"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="Select personnel"
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#056839]"
              />
              <datalist id="personnel-suggestions">
                {selectedOfficeObj?.defaultPersonnel.map((person) => (
                  <option key={person} value={person} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Region
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#056839]"
              >
                {availableOffices.map((office) => (
                  <option key={office.id} value={office.code}>
                    {office.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Priority & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#056839]"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Due Date
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#056839]"
              />
            </div>
          </div>

          {/* Scheduled Date & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Scheduled Date
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#056839]"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter location"
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#056839]"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the task..."
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#056839]"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-[#056839] hover:bg-[#04522d] rounded-lg shadow-sm transition cursor-pointer"
            >
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
