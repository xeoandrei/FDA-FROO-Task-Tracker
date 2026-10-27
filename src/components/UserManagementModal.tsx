import React, { useState } from 'react';
import {
  X,
  Users,
  UserPlus,
  Search,
  Shield,
  Trash2,
  CheckCircle,
  Ban,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Building,
} from 'lucide-react';
import { UserAccount, UserPosition, UserRole, ClusterCode, AccountStatus } from '../types/auth';
import { FROO_OFFICES } from '../data/offices';
import { CLUSTERS_LIST, FROO_CLUSTERS } from '../data/clusters';
import {
  getStoredUsers,
  saveStoredUsers,
  isValidFdaEmail,
  determineRole,
  logSystemAction,
  SUPERADMIN_EMAIL,
} from '../utils/authStorage';
import { api } from '../api/client';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
  onUserListChanged: () => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserListChanged,
}) => {
  const [users, setUsers] = useState<UserAccount[]>(() => getStoredUsers());
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);

  // New user form state
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('fda@2026');
  const [newFirstName, setNewFirstName] = useState('');
  const [newMiddleInitial, setNewMiddleInitial] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newPosition, setNewPosition] = useState<UserPosition>('Food-Drug Regulation Officer (FDRO)');
  const [newOffice, setNewOffice] = useState('Region NCR');
  const [newCluster, setNewCluster] = useState<ClusterCode>('SLC');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const refreshUsers = () => {
    const list = getStoredUsers();
    setUsers(list);
    onUserListChanged();
  };

  const handleToggleStatus = async (target: UserAccount) => {
    if (target.email.toLowerCase() === SUPERADMIN_EMAIL) {
      alert('The primary Superadmin account cannot be deactivated.');
      return;
    }

    const nextStatus: AccountStatus = target.status === 'active' ? 'deactivated' : 'active';

    try {
      await api.updateUserStatus(target.id, nextStatus as 'active' | 'deactivated');
    } catch (err: any) {
      console.warn('Backend status update note:', err.message);
    }

    const updated: UserAccount[] = users.map((u) =>
      u.id === target.id ? { ...u, status: nextStatus } : u
    );

    saveStoredUsers(updated);
    setUsers(updated);
    onUserListChanged();

    logSystemAction(
      'USER_STATUS_CHANGED',
      currentUser,
      `Changed account status of ${target.firstName} ${target.lastName} to ${nextStatus.toUpperCase()}.`,
      { targetEntityId: target.id, targetEntityName: target.email }
    );
  };

  const handleDeleteUser = (target: UserAccount) => {
    if (target.email.toLowerCase() === SUPERADMIN_EMAIL) {
      alert('The primary Superadmin account cannot be deleted.');
      return;
    }

    if (
      !confirm(
        `Are you sure you want to permanently delete account ${target.firstName} ${target.lastName} (${target.email})?`
      )
    ) {
      return;
    }

    const updated = users.filter((u) => u.id !== target.id);
    saveStoredUsers(updated);
    setUsers(updated);
    onUserListChanged();

    logSystemAction(
      'USER_DELETED',
      currentUser,
      `Deleted FDA user account: ${target.firstName} ${target.lastName} (${target.email}).`,
      { targetEntityId: target.id, targetEntityName: target.email }
    );
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const emailTrimmed = newEmail.trim().toLowerCase();
    const usernameTrimmed = newUsername.trim().toLowerCase();

    if (!usernameTrimmed || !emailTrimmed || !newFirstName.trim() || !newLastName.trim()) {
      setFormError('Please fill out all required fields.');
      return;
    }

    if (!isValidFdaEmail(emailTrimmed)) {
      setFormError('Staff email address must strictly end with @fda.gov.ph');
      return;
    }

    if (users.some((u) => u.username.toLowerCase() === usernameTrimmed)) {
      setFormError('Username is already taken by another user.');
      return;
    }

    if (users.some((u) => u.email.toLowerCase() === emailTrimmed)) {
      setFormError('An account with this FDA email already exists.');
      return;
    }

    let finalOffice = newOffice;
    let finalCluster: ClusterCode | undefined = undefined;

    if (newPosition === 'Cluster Director') {
      finalOffice = FROO_CLUSTERS[newCluster].name;
      finalCluster = newCluster;
    } else if (newPosition === 'Deputy Director General (DDG-FROO)' || newPosition === 'ODDG-FROO Staff') {
      finalOffice = 'ODDG-FROO';
    }

    const assignedRole = determineRole(emailTrimmed, finalOffice, newPosition);
    const formattedMiddleInitial = newMiddleInitial.trim()
      ? newMiddleInitial.trim().endsWith('.')
        ? newMiddleInitial.trim()
        : `${newMiddleInitial.trim()}.`
      : '';

    let created: UserAccount = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      username: usernameTrimmed,
      password: newPassword,
      email: emailTrimmed,
      firstName: newFirstName.trim(),
      middleInitial: formattedMiddleInitial,
      lastName: newLastName.trim(),
      position: newPosition,
      office: finalOffice,
      cluster: finalCluster,
      role: assignedRole,
      status: 'active',
      createdAt: new Date().toISOString(),
      lastLogin: undefined,
      lastActivity: 'Account created by Administrator',
    };

    try {
      const apiCreated = await api.createUser({
        username: created.username,
        password: newPassword,
        email: created.email,
        firstName: created.firstName,
        middleInitial: created.middleInitial,
        lastName: created.lastName,
        position: created.position,
        office: created.office,
        cluster: created.cluster,
        role: created.role,
        status: 'active',
      });
      created = apiCreated;
    } catch {
      // Fallback to local user object when local MySQL container is offline
    }

    const updated = [created, ...users];
    saveStoredUsers(updated);
    setUsers(updated);
    onUserListChanged();

    logSystemAction(
      'USER_REGISTERED',
      currentUser,
      `Administrator provisioned staff account: ${created.firstName} ${created.lastName} (${created.position}) with role ${created.role}.`,
      { targetEntityId: created.id, targetEntityName: created.email }
    );

    setFormSuccess('User successfully created and active!');
    setTimeout(() => {
      setIsAddUserOpen(false);
      setFormSuccess(null);
      // Reset form
      setNewUsername('');
      setNewEmail('');
      setNewFirstName('');
      setNewMiddleInitial('');
      setNewLastName('');
    }, 1200);
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.office.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole =
      roleFilter === 'All' ||
      u.role === roleFilter ||
      (roleFilter === 'STANDARD' && ((u.role as string) === 'RANK_AND_FILE' || u.role === 'STANDARD'));
    const matchesStatus = statusFilter === 'All' || u.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[88vh] flex flex-col border border-slate-200 overflow-hidden text-slate-800">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-[#056839] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">FDA FROO User Management</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-[#056839] border border-emerald-200">
                  {currentUser.role === 'RANK_AND_FILE' ? 'STANDARD' : currentUser.role} Control
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Manage staff accounts, assign regional office jurisdictions, and enforce role access
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsAddUserOpen(true);
                setFormError(null);
                setFormSuccess(null);
              }}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#056839] hover:bg-[#04522d] rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Staff Account</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="p-4 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, username or office..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#056839] focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Filter className="w-3.5 h-3.5" />
              <span>Role:</span>
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#056839]"
            >
              <option value="All">All Roles</option>
              <option value="SUPERADMIN">Superadmin</option>
              <option value="ADMIN">Admin (ODDG-FROO)</option>
              <option value="CLUSTER_DIRECTOR">Cluster Director</option>
              <option value="REGIONAL_SUPERVISOR">Regional Supervisor</option>
              <option value="STANDARD">Standard</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#056839]"
            >
              <option value="All">All Statuses</option>
              <option value="active">Active</option>
              <option value="deactivated">Deactivated</option>
            </select>

            <span className="text-xs text-slate-400 ml-1">
              Showing {filteredUsers.length} of {users.length} accounts
            </span>
          </div>
        </div>

        {/* Table of Users */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 text-slate-600 font-semibold sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Staff Name & Username</th>
                <th className="py-2.5 px-3">Position</th>
                <th className="py-2.5 px-3">Office / Jurisdiction</th>
                <th className="py-2.5 px-3">RBAC Role</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Last Login / Activity</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => {
                const isSuperadminAccount = user.email.toLowerCase() === SUPERADMIN_EMAIL;

                return (
                  <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {user.firstName} {user.middleInitial} {user.lastName}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <span className="font-mono text-slate-600">@{user.username}</span>
                        <span>•</span>
                        <span>{user.email}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-slate-700 font-medium">{user.position}</td>

                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1 text-slate-800">
                        <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[200px]">{user.office}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          user.role === 'SUPERADMIN'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : user.role === 'ADMIN'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : user.role === 'CLUSTER_DIRECTOR'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : user.role === 'REGIONAL_SUPERVISOR'
                            ? 'bg-teal-100 text-teal-800 border border-teal-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {(user.role as string) === 'RANK_AND_FILE' ? 'STANDARD' : user.role}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                          user.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            user.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'
                          }`}
                        />
                        {user.status === 'active' ? 'Active' : 'Deactivated'}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-slate-500 text-[11px]">
                      <div>{user.lastLogin || 'Never logged in'}</div>
                      {user.lastActivity && (
                        <div className="text-[10px] text-slate-400 truncate max-w-[170px]">
                          {user.lastActivity}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {!isSuperadminAccount && (
                          <>
                            <button
                              onClick={() => handleToggleStatus(user)}
                              title={user.status === 'active' ? 'Deactivate Account' : 'Reactivate Account'}
                              className={`p-1.5 rounded transition-colors ${
                                user.status === 'active'
                                  ? 'text-amber-600 hover:bg-amber-50'
                                  : 'text-emerald-600 hover:bg-emerald-50'
                              }`}
                            >
                              {user.status === 'active' ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user)}
                              title="Delete Account"
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {isSuperadminAccount && (
                          <span className="text-[10px] text-purple-700 font-semibold px-2 py-0.5 bg-purple-50 rounded border border-purple-200">
                            Root Protected
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ADD USER SUBMODAL */}
        {isAddUserOpen && (
          <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 animate-in fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-[#056839]" />
                  <span>Provision New Staff Account</span>
                </h3>
                <button
                  onClick={() => setIsAddUserOpen(false)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {formError && (
                <div className="mb-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="mb-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <form onSubmit={handleCreateUser} className="space-y-3">
                <div className="grid grid-cols-5 gap-2">
                  <div className="col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">First Name *</label>
                    <input
                      type="text"
                      value={newFirstName}
                      onChange={(e) => setNewFirstName(e.target.value)}
                      placeholder="e.g. Dennis"
                      className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 focus:border-[#056839]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">M.I.</label>
                    <input
                      type="text"
                      maxLength={2}
                      value={newMiddleInitial}
                      onChange={(e) => setNewMiddleInitial(e.target.value.toUpperCase())}
                      placeholder="P."
                      className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 text-center focus:border-[#056839]"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Last Name *</label>
                    <input
                      type="text"
                      value={newLastName}
                      onChange={(e) => setNewLastName(e.target.value)}
                      placeholder="e.g. Neri"
                      className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 focus:border-[#056839]"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Username *</label>
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="e.g. dneri"
                      className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 focus:border-[#056839]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Official FDA Email *</label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="user@fda.gov.ph"
                      className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 focus:border-[#056839]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Position *</label>
                  <select
                    value={newPosition}
                    onChange={(e) => setNewPosition(e.target.value as UserPosition)}
                    className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 focus:border-[#056839]"
                  >
                    <option value="Food-Drug Regulation Officer (FDRO)">Food-Drug Regulation Officer (FDRO)</option>
                    <option value="Licensing Officer">Licensing Officer</option>
                    <option value="Information Officer">Information Officer</option>
                    <option value="Regional Supervisor">Regional Supervisor</option>
                    <option value="Cluster Director">Cluster Director</option>
                    <option value="ODDG-FROO Staff">ODDG-FROO Staff (Admin)</option>
                    <option value="Deputy Director General (DDG-FROO)">Deputy Director General (DDG-FROO)</option>
                  </select>
                </div>

                {newPosition === 'Cluster Director' ? (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Cluster Jurisdiction *</label>
                    <select
                      value={newCluster}
                      onChange={(e) => setNewCluster(e.target.value as ClusterCode)}
                      className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 focus:border-[#056839]"
                    >
                      {CLUSTERS_LIST.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : newPosition === 'Deputy Director General (DDG-FROO)' || newPosition === 'ODDG-FROO Staff' ? (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Office</label>
                    <input
                      type="text"
                      disabled
                      value="ODDG-FROO (Admin Privileges Assigned)"
                      className="w-full bg-slate-50 border border-slate-200 text-xs rounded px-2.5 py-1.5 text-emerald-800 font-semibold"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Regional Field Office *</label>
                    <select
                      value={newOffice}
                      onChange={(e) => setNewOffice(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 focus:border-[#056839]"
                    >
                      {FROO_OFFICES.filter((o) => o.code !== 'ODDG-FROO').map((o) => (
                        <option key={o.id} value={o.code}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Temporary Password</label>
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full text-xs font-mono border border-slate-300 rounded px-2.5 py-1.5 focus:border-[#056839]"
                    required
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddUserOpen(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-bold text-white bg-[#056839] hover:bg-[#04522d] rounded shadow-xs"
                  >
                    Save & Activate
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
