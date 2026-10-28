import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  User,
  Mail,
  Building2,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck,
  Compass,
  FileCheck2,
  Users2,
  Briefcase,
  Layers,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { UserAccount, UserPosition, ClusterCode } from '../types/auth';
import { FROO_OFFICES } from '../data/offices';
import { FROO_CLUSTERS, CLUSTERS_LIST } from '../data/clusters';
import {
  getStoredUsers,
  saveStoredUsers,
  setCurrentUser,
  isValidFdaEmail,
  determineRole,
  logSystemAction,
  SUPERADMIN_EMAIL,
} from '../utils/authStorage';
import { api } from '../api/client';

interface LandingPageProps {
  onLoginSuccess: (user: UserAccount) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginSuccess }) => {
  const [activeModal, setActiveModal] = useState<'none' | 'login' | 'register'>('none');

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState(''); // username or email
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Register form state
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regFirstName, setRegFirstName] = useState('');
  const [regMiddleInitial, setRegMiddleInitial] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regPosition, setRegPosition] = useState<UserPosition>('Food-Drug Regulation Officer (FDRO)');
  const [regOffice, setRegOffice] = useState('Region NCR');
  const [regCluster, setRegCluster] = useState<ClusterCode>('SLC');
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);

  // Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const identifier = loginIdentifier.trim().toLowerCase();
    if (!identifier || !loginPassword.trim()) {
      setLoginError('Please enter both your FDA username/email and password.');
      return;
    }

    try {
      const res = await api.login(identifier, loginPassword);
      if (res && res.user) {
        setCurrentUser(res.user);
        onLoginSuccess(res.user);
        return;
      }
    } catch (apiErr: any) {
      const errorMsg = apiErr.message || 'Login failed';
      if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
        setLoginError('Unable to connect to the FROO backend API server. Please check your network connection.');
      } else {
        setLoginError(errorMsg);
      }
      return;
    }
  };

  // Handle Quick Demo Login through backend authentication
  const handleQuickLogin = async (username: string) => {
    setLoginError(null);
    try {
      const res = await api.demoLogin(username);
      if (res && res.user) {
        setCurrentUser(res.user);
        onLoginSuccess(res.user);
        return;
      }
    } catch (apiErr: any) {
      const errorMsg = apiErr.message || 'Demo authentication failed';
      if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
        setLoginError('Unable to connect to the FROO backend server for demo login.');
      } else {
        setLoginError(errorMsg);
      }
      setActiveModal('login');
    }
  };

  // Handle Staff Registration
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegSuccess(null);

    const emailTrimmed = regEmail.trim().toLowerCase();
    const usernameTrimmed = regUsername.trim().toLowerCase();

    // Field Validations
    if (!usernameTrimmed || !regPassword || !emailTrimmed || !regFirstName.trim() || !regLastName.trim()) {
      setRegError('Please complete all required fields.');
      return;
    }

    if (!isValidFdaEmail(emailTrimmed)) {
      setRegError('Only official FDA email addresses ending in @fda.gov.ph are permitted.');
      return;
    }

    if (regPassword.length < 6) {
      setRegError('Password must be at least 6 characters long.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match.');
      return;
    }

    try {
      const res = await api.register({
        username: usernameTrimmed,
        email: emailTrimmed,
        password: regPassword,
        firstName: regFirstName.trim(),
        middleInitial: regMiddleInitial.trim(),
        lastName: regLastName.trim(),
        position: regPosition,
        office: regOffice,
      });

      if (res && res.user) {
        setRegSuccess(`Registration submitted! Your staff account (${res.user.email}) is currently pending approval by the Superadmin or ODDG-FROO Administrator in the User & Access panel before you can sign in.`);

        // Synchronize local cached staff list with pending status
        const pendingUser = { ...res.user, status: 'pending' as const, lastActivity: 'Awaiting Administrator Approval' };
        const currentStored = getStoredUsers();
        if (!currentStored.some((u) => u.id === res.user.id || u.email.toLowerCase() === res.user.email.toLowerCase())) {
          saveStoredUsers([pendingUser, ...currentStored]);
        }

        // Clear password fields
        setLoginIdentifier(res.user.email);
        setLoginPassword('');
        setRegPassword('');
        setRegConfirmPassword('');
        return;
      }
    } catch (apiErr: any) {
      const errorMsg = apiErr.message || 'Registration failed';
      if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
        setRegError('Unable to connect to the FROO backend API server. Please check your network connection.');
      } else {
        setRegError(errorMsg);
      }
      return;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col font-sans selection:bg-[#056839] selection:text-white relative overflow-x-hidden">
      {/* Background radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[520px] bg-gradient-to-b from-[#056839]/25 via-[#056839]/5 to-transparent blur-3xl pointer-events-none" />

      {/* Top Navbar */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center p-1 shadow-md border-2 border-emerald-500/40">
              <img
                src="/assets/aistudio/FDA-Web-Logo-150x150-1_975a7f7f.png"
                alt="FDA Philippines Emblem"
                className="w-10 h-10 object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base sm:text-lg text-white tracking-tight">
                  Field Regulatory Operations Office Tracker
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Food and Drug Administration Philippines
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setLoginError(null);
                setActiveModal('login');
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800/90 hover:bg-slate-700/80 rounded-lg transition-colors border border-slate-700 cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setRegError(null);
                setActiveModal('register');
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#056839] hover:bg-[#04522d] shadow-sm shadow-[#056839]/40 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Register Account</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-16 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex-1 flex flex-col justify-center">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 text-xs font-medium mb-6">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Role-Based Access Control • 5 Clusters • 17 Regional Offices</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-snug sm:leading-tight">
            Field Regulatory Operations Office{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-green-500">
              Tracker
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-300 leading-relaxed max-w-3xl mx-auto">
            The centralized operational system for assigning, tracking, and executing field inspections, investigations, and authorized regulatory dispatches across the Philippines.
          </p>

          {/* Action CTAs */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => setActiveModal('login')}
              className="px-6 py-3.5 text-sm font-semibold text-white bg-[#056839] hover:bg-[#04522d] rounded-xl shadow-lg shadow-[#056839]/30 transition-all flex items-center gap-2 cursor-pointer hover:scale-[1.02]"
            >
              <Lock className="w-4 h-4 text-emerald-200" />
              <span>Access Tracker Workspace</span>
              <ArrowRight className="w-4 h-4 text-emerald-200" />
            </button>

            <button
              onClick={() => setActiveModal('register')}
              className="px-6 py-3.5 text-sm font-semibold text-slate-200 hover:text-white bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 rounded-xl transition-all cursor-pointer"
            >
              Create Staff Account (@fda.gov.ph)
            </button>
          </div>
        </div>

        {/* Quick Demo Sign In Box */}
        <div className="mt-14 max-w-4xl mx-auto w-full bg-slate-800/70 border border-slate-700/80 rounded-2xl p-5 backdrop-blur-sm shadow-xl">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4 pb-3 border-b border-slate-700/60">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Instant Demo Access (Test Specific Roles & Jurisdictions)
              </span>
            </div>
            <span className="text-[11px] text-slate-400">Click any card to sign in immediately</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Superadmin */}
            <button
              onClick={() => handleQuickLogin('amldelgado')}
              className="text-left p-3.5 rounded-xl bg-slate-900/80 hover:bg-emerald-950/50 border border-slate-700 hover:border-emerald-500/50 transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/60">
                  SUPERADMIN
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
              </div>
              <div className="text-xs font-bold text-white group-hover:text-emerald-300">AML Delgado</div>
              <div className="text-[11px] text-slate-400 truncate">amldelgado@fda.gov.ph</div>
              <div className="text-[10px] text-emerald-400 mt-2 font-medium">IT Developer • System Console</div>
            </button>

            {/* ODDG-FROO Admin */}
            <button
              onClick={() => handleQuickLogin('atty.franklin')}
              className="text-left p-3.5 rounded-xl bg-slate-900/80 hover:bg-emerald-950/50 border border-slate-700 hover:border-emerald-500/50 transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/60">
                  ODDG-FROO (ADMIN)
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
              </div>
              <div className="text-xs font-bold text-white group-hover:text-emerald-300">Atty. Franklin Tabaquin</div>
              <div className="text-[11px] text-slate-400 truncate">Deputy Director General</div>
              <div className="text-[10px] text-blue-400 mt-2 font-medium">National Scope & Approver</div>
            </button>

            {/* Cluster Director */}
            <button
              onClick={() => handleQuickLogin('director.gomel')}
              className="text-left p-3.5 rounded-xl bg-slate-900/80 hover:bg-emerald-950/50 border border-slate-700 hover:border-emerald-500/50 transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                  CLUSTER DIRECTOR
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
              </div>
              <div className="text-xs font-bold text-white group-hover:text-emerald-300">Gomel C. Gabuna</div>
              <div className="text-[11px] text-slate-400 truncate">North Luzon (Reg 1, 2, 3, CAR)</div>
              <div className="text-[10px] text-emerald-400 mt-2 font-medium">NLC Cluster Jurisdiction</div>
            </button>

            {/* FDRO Inspector */}
            <button
              onClick={() => handleQuickLogin('juan.fdro')}
              className="text-left p-3.5 rounded-xl bg-slate-900/80 hover:bg-emerald-950/50 border border-slate-700 hover:border-emerald-500/50 transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/60">
                  FDRO (STANDARD)
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
              </div>
              <div className="text-xs font-bold text-white group-hover:text-emerald-300">Juan Dela Cruz</div>
              <div className="text-[11px] text-slate-400 truncate">FDRO • Region NCR</div>
              <div className="text-[10px] text-amber-400 mt-2 font-medium">Task Receive & Execute</div>
            </button>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto w-full">
          <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-800 hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-900/40 border border-emerald-500/30 flex items-center justify-center mb-4 text-emerald-400">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Cluster & Regional Hierarchy</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tailored views scoped strictly to user jurisdiction: North Luzon (NLC), South Luzon (SLC), Visayas (VC), Mindanao East (MEC), and Mindanao West (MWC).
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-800 hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-900/40 border border-emerald-500/30 flex items-center justify-center mb-4 text-emerald-400">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Automated Dispatch Slips</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Auto-generated CTRL No. by region and sequential counter. Formatted PDF exports ready for field inspection missions.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-800 hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-900/40 border border-emerald-500/30 flex items-center justify-center mb-4 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Receive & Acceptance Flow</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Clear task lifecycle from assignment to receipt, in-progress execution, and completion with audit-logged timestamps.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        <p>Field Regulatory Operations Office (FROO) • Food and Drug Administration Philippines</p>
        <p className="text-[11px] text-slate-600 mt-1">Civic Drive, Filinvest Corporate City, Alabang 1781 Muntinlupa, Philippines</p>
      </footer>

      {/* LOGIN MODAL */}
      {activeModal === 'login' && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white p-1 flex items-center justify-center shadow-sm">
                  <img
                    src="/assets/aistudio/FDA-Web-Logo-150x150-1_975a7f7f.png"
                    alt="FDA Logo"
                    className="w-7 h-7 object-contain"
                  />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Staff Sign In</h3>
                  <p className="text-xs text-slate-400">Enter your official FDA credentials</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal('none')}
                className="text-slate-400 hover:text-white text-sm p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            {loginError && (
              <div className="mb-4 p-3 rounded-lg bg-red-950/70 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Username or FDA Email
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="e.g. amldelgado or user@fda.gov.ph"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#056839] focus:ring-1 focus:ring-[#056839]"
                    required
                  />
                  <User className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#056839] focus:ring-1 focus:ring-[#056839]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-2.5 text-xs font-bold text-white bg-[#056839] hover:bg-[#04522d] rounded-lg shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            </form>

            <div className="mt-5 pt-4 border-t border-slate-800 text-center">
              <p className="text-xs text-slate-400">
                New FDA personnel?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setActiveModal('register');
                    setRegError(null);
                  }}
                  className="text-emerald-400 font-semibold hover:underline"
                >
                  Register Staff Account
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* REGISTER MODAL */}
      {activeModal === 'register' && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white p-1 flex items-center justify-center shadow-sm">
                  <img
                    src="/assets/aistudio/FDA-Web-Logo-150x150-1_975a7f7f.png"
                    alt="FDA Logo"
                    className="w-7 h-7 object-contain"
                  />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Create FDA Account</h3>
                  <p className="text-xs text-slate-400">Staff registration with official @fda.gov.ph email</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal('none')}
                className="text-slate-400 hover:text-white text-sm p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            {regError && (
              <div className="mb-4 p-3 rounded-lg bg-red-950/70 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{regError}</span>
              </div>
            )}

            {regSuccess && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{regSuccess}</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              {/* Name columns */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">First Name *</label>
                  <input
                    type="text"
                    value={regFirstName}
                    onChange={(e) => setRegFirstName(e.target.value)}
                    placeholder="e.g. Maria"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#056839]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">M.I.</label>
                  <input
                    type="text"
                    value={regMiddleInitial}
                    maxLength={2}
                    onChange={(e) => setRegMiddleInitial(e.target.value.toUpperCase())}
                    placeholder="P."
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white text-center focus:outline-none focus:border-[#056839]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Last Name *</label>
                  <input
                    type="text"
                    value={regLastName}
                    onChange={(e) => setRegLastName(e.target.value)}
                    placeholder="e.g. Santos"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#056839]"
                    required
                  />
                </div>
              </div>

              {/* Username & Official Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Username *</label>
                  <input
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="e.g. msantos"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#056839]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Official FDA Email *
                  </label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="name@fda.gov.ph"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#056839]"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Must end with @fda.gov.ph</span>
                </div>
              </div>

              {/* Position */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Staff Position *</label>
                <select
                  value={regPosition}
                  onChange={(e) => setRegPosition(e.target.value as UserPosition)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#056839]"
                >
                  <option value="Food-Drug Regulation Officer (FDRO)">Food-Drug Regulation Officer (FDRO - Field Inspector)</option>
                  <option value="Licensing Officer">Licensing Officer</option>
                  <option value="Information Officer">Information Officer</option>
                  <option value="Regional Supervisor">Regional Supervisor</option>
                </select>
              </div>

              {/* Regional Office */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Designated Regional Field Office *</label>
                <select
                  value={regOffice}
                  onChange={(e) => setRegOffice(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#056839]"
                >
                  {FROO_OFFICES.filter((o) => o.code !== 'ODDG-FROO').map((o) => (
                    <option key={o.id} value={o.name}>
                      {o.name}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Jurisdiction and cluster are automatically enforced based on regional assignment.
                </span>
              </div>

              {/* Password & Confirm */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Password *</label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#056839]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Confirm Password *</label>
                  <input
                    type="password"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#056839]"
                    required
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-800/70 border border-slate-700/60 text-[11px] text-slate-300 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-300">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Staff Registration & Security Policy:</span>
                </div>
                <p className="text-[10px] text-slate-400">
                  • All staff accounts are persisted directly to the MySQL database with bcrypt hashed credentials.
                  <br />• Regional staff access is strictly scoped to designated field jurisdictions.
                  <br />• ODDG-FROO Headquarters Executive and Cluster Director accounts are provisioned by an Administrator.
                </p>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-2.5 text-xs font-bold text-white bg-[#056839] hover:bg-[#04522d] rounded-lg shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Create Staff Account</span>
              </button>
            </form>

            <div className="mt-4 pt-3 border-t border-slate-800 text-center">
              <p className="text-xs text-slate-400">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setActiveModal('login');
                    setLoginError(null);
                  }}
                  className="text-emerald-400 font-semibold hover:underline"
                >
                  Sign In
                </button>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
