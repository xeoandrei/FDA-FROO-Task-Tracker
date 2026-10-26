import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Search,
  Filter,
  Download,
  Trash2,
  Clock,
  User,
  CheckCircle2,
  FileText,
  AlertTriangle,
  Send,
  Building,
} from 'lucide-react';
import { SystemLog, SystemActionType, UserAccount } from '../types/auth';
import { getSystemLogs, clearSystemLogs } from '../utils/authStorage';

interface SystemLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
}

export const SystemLogsModal: React.FC<SystemLogsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [logs, setLogs] = useState<SystemLog[]>(() => getSystemLogs());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('All');

  if (!isOpen) return null;

  const handleRefresh = () => {
    setLogs(getSystemLogs());
  };

  const handleClearLogs = () => {
    if (currentUser.role !== 'SUPERADMIN') {
      alert('Only the Superadmin can clear system audit logs.');
      return;
    }
    if (confirm('Are you sure you want to purge all system audit trail logs? This action is irreversible.')) {
      clearSystemLogs();
      setLogs([]);
    }
  };

  const handleExportCsv = () => {
    const headers = ['Log ID', 'Timestamp', 'User', 'Email', 'Office', 'Role', 'Action Type', 'Description', 'Target Entity'];
    const rows = filteredLogs.map((l) => [
      `"${l.id}"`,
      `"${l.timestamp}"`,
      `"${l.userName}"`,
      `"${l.userEmail}"`,
      `"${l.office}"`,
      `"${l.role}"`,
      `"${l.actionType}"`,
      `"${l.description.replace(/"/g, '""')}"`,
      `"${(l.targetEntityName || l.targetEntityId || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `FROO_Audit_Logs_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.office.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.targetEntityName && log.targetEntityName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesAction = selectedAction === 'All' || log.actionType === selectedAction;

    return matchesSearch && matchesAction;
  });

  const getActionBadgeColor = (action: SystemActionType) => {
    switch (action) {
      case 'USER_LOGIN':
      case 'USER_LOGOUT':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'TASK_CREATED':
      case 'TASK_ASSIGNED':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'TASK_RECEIVED':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'TASK_COMPLETED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'DISPATCH_CREATED':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'DISPATCH_APPROVED':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'DISPATCH_REJECTED':
      case 'USER_DELETED':
      case 'TASK_DELETED':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'USER_REGISTERED':
      case 'USER_STATUS_CHANGED':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[88vh] flex flex-col border border-slate-200 overflow-hidden text-slate-800">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-[#056839] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Global System Audit Trail</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-200 text-slate-700">
                  Compliance Log
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Immutable operational records of regulatory tasks, dispatches, supervisor approvals, and staff activity
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            {currentUser.role === 'SUPERADMIN' && (
              <button
                onClick={handleClearLogs}
                className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Audit</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="p-4 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search audit trail by description, user, entity, or region..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#056839] focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Filter className="w-3.5 h-3.5" />
              <span>Action:</span>
            </div>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#056839]"
            >
              <option value="All">All Actions</option>
              <option value="TASK_CREATED">Task Created</option>
              <option value="TASK_ASSIGNED">Task Assigned</option>
              <option value="TASK_RECEIVED">Task Received / Accepted</option>
              <option value="TASK_COMPLETED">Task Completed</option>
              <option value="DISPATCH_CREATED">Dispatch Created</option>
              <option value="DISPATCH_APPROVED">Dispatch Approved</option>
              <option value="DISPATCH_REJECTED">Dispatch Rejected</option>
              <option value="USER_LOGIN">User Login</option>
              <option value="USER_REGISTERED">User Registered</option>
              <option value="USER_STATUS_CHANGED">User Status Changed</option>
            </select>

            <span className="text-xs text-slate-400 ml-1">
              {filteredLogs.length} events logged
            </span>
          </div>
        </div>

        {/* Logs Table */}
        <div className="flex-1 overflow-auto divide-y divide-slate-100">
          {filteredLogs.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold">No audit logs found</p>
              <p className="text-xs">Adjust your search terms or filter selection.</p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-slate-50 transition-colors flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getActionBadgeColor(
                        log.actionType
                      )}`}
                    >
                      {log.actionType.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs font-semibold text-slate-900">{log.userName}</span>
                    <span className="text-[11px] text-slate-400 font-mono">({log.userEmail})</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      {log.office}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed font-normal">
                    {log.description}
                  </p>

                  {log.targetEntityName && (
                    <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1 mt-0.5">
                      <FileText className="w-3 h-3 text-emerald-600" />
                      <span>Target: {log.targetEntityName}</span>
                    </div>
                  )}
                </div>

                <div className="text-right text-[11px] text-slate-400 shrink-0 font-mono">
                  {log.timestamp}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
