import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Menu,
  LogOut,
  KeyRound,
  User as UserIcon,
  ChevronDown,
} from 'lucide-react';

interface TopbarProps {
  onToggleSidebar: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleBadgeColors: Record<string, string> = {
    manufacturer: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    supplier: 'bg-blue-100 text-blue-800 border-blue-200',
    auditor: 'bg-purple-100 text-purple-800 border-purple-200',
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 sm:px-6 backdrop-blur">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 hidden sm:inline-block">
          TraceCarbon Sustainability Portal
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* User profile menu */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 rounded-lg p-1.5 hover:bg-slate-50 transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-medium text-xs border border-slate-200">
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="hidden text-left sm:block">
              <div className="text-xs font-semibold text-slate-800 truncate max-w-[150px]">
                {user?.email}
              </div>
              <span
                className={`inline-block text-[10px] uppercase font-bold px-1.5 py-0.2 rounded border ${
                  user ? roleBadgeColors[user.role] : ''
                }`}
              >
                {user?.role}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white p-1.5 shadow-lg border border-slate-200 z-50 animate-scale-up">
                <div className="px-3 py-2 border-b border-slate-100 text-xs">
                  <p className="font-semibold text-slate-900 truncate">{user?.email}</p>
                  <p className="text-slate-500 capitalize">{user?.role} Account</p>
                </div>
                <div className="py-1">
                  <Link
                    to="/settings/change-password"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    <KeyRound className="w-4 h-4 text-slate-400" />
                    Change Password
                  </Link>
                </div>
                <div className="pt-1 border-t border-slate-100">
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
