import React from 'react';
import { Clock, ShieldAlert, LogOut, RefreshCw } from 'lucide-react';

interface SessionTimeoutModalProps {
  isOpen: boolean;
  remainingSeconds: number;
  userName: string;
  onStaySignedIn: () => void;
  onSignOutNow: () => void;
}

export const SessionTimeoutModal: React.FC<SessionTimeoutModalProps> = ({
  isOpen,
  remainingSeconds,
  userName,
  onStaySignedIn,
  onSignOutNow,
}) => {
  if (!isOpen) return null;

  const formattedSeconds = String(Math.max(0, remainingSeconds)).padStart(2, '0');

  return (
    <div className="fixed inset-0 z-100 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
        {/* Top Warning Bar */}
        <div className="px-6 py-4 bg-amber-50 border-b border-amber-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-950">
              Inactivity Session Timeout Warning
            </h3>
            <p className="text-xs text-amber-800">
              FDA Field Regulatory Operations Office Security Policy
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs text-slate-700">
          <p className="leading-relaxed">
            Hello <strong className="text-slate-900">{userName}</strong>, your workspace has been inactive for nearly{' '}
            <strong className="text-slate-900">30 minutes</strong>. For security and regulatory data protection, your session will automatically close unless you choose to stay signed in.
          </p>

          {/* Countdown Box */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-700">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="font-semibold">Automatic Sign-Out In:</span>
            </div>
            <div className="font-mono text-2xl font-extrabold text-amber-700 tabular-nums tracking-tight">
              00:{formattedSeconds}
            </div>
          </div>

          <p className="text-[11px] text-slate-500">
            Click <strong>Stay Signed In</strong> below to reset your 30-minute activity timer and continue working.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onSignOutNow}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-500" />
            <span>Sign Out Now</span>
          </button>
          <button
            type="button"
            onClick={onStaySignedIn}
            className="px-4 py-2 text-xs font-bold text-white bg-[#056839] hover:bg-[#04522d] rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Stay Signed In</span>
          </button>
        </div>
      </div>
    </div>
  );
};
