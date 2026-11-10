import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Package,
  Layers,
  FileSpreadsheet,
  FileCheck2,
  Calculator,
  BarChart3,
  Building2,
  FileText,
  UploadCloud,
  HelpCircle,
  Lightbulb,
  X,
  Leaf,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const role = user?.role;

  const manufacturerNav = [
    { name: 'Dashboard', path: '/manufacturer/dashboard', icon: LayoutDashboard },
    { name: 'Suppliers', path: '/manufacturer/suppliers', icon: Users },
    { name: 'Auditors & Assignments', path: '/manufacturer/auditors', icon: ShieldCheck },
    { name: 'Product Catalog', path: '/manufacturer/products', icon: Package },
    { name: 'Factors & Activities', path: '/manufacturer/factors', icon: Layers },
    { name: 'Purchase Ingestion', path: '/manufacturer/purchases', icon: FileSpreadsheet },
    { name: 'Submissions', path: '/manufacturer/submissions', icon: FileCheck2 },
    { name: 'Calculations', path: '/manufacturer/calculations', icon: Calculator },
    { name: 'Reports', path: '/manufacturer/reports', icon: BarChart3 },
    { name: 'Company Profile', path: '/manufacturer/profile', icon: Building2 },
  ];

  const supplierNav = [
    { name: 'Dashboard', path: '/supplier/dashboard', icon: LayoutDashboard },
    { name: 'Requirements', path: '/supplier/requirements', icon: FileText },
    { name: 'Monthly Reports', path: '/supplier/submissions', icon: FileCheck2 },
    { name: 'Clarifications', path: '/supplier/clarifications', icon: HelpCircle },
    { name: 'Reduction Suggestions', path: '/supplier/reductions', icon: Lightbulb },
    { name: 'Supplier Profile', path: '/supplier/profile', icon: Building2 },
  ];

  const auditorNav = [
    { name: 'Auditor Desk', path: '/auditor/dashboard', icon: LayoutDashboard },
    { name: 'My Assignments', path: '/auditor/assignments', icon: ShieldCheck },
    { name: 'Supplier Submissions', path: '/auditor/submissions', icon: FileCheck2 },
  ];

  const currentNav =
    role === 'manufacturer'
      ? manufacturerNav
      : role === 'supplier'
      ? supplierNav
      : auditorNav;

  const roleLabelMap = {
    manufacturer: 'Manufacturer Workspace',
    supplier: 'Supplier Portal',
    auditor: 'Auditor Desk',
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center p-1.5 flex-shrink-0">
              <img
                src="/LOGO-MAIN.png"
                alt="TraceCarbon Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <span className="font-bold text-lg text-white tracking-tight">TraceCarbon</span>
              <p className="text-[10px] text-emerald-400 font-medium">Trace. Measure. Improve.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workspace pill */}
        <div className="px-6 py-3">
          <div className="px-3 py-1.5 rounded-md bg-slate-800/80 border border-slate-700/60 text-xs font-semibold text-emerald-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {role ? roleLabelMap[role] : 'Workspace'}
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto custom-scrollbar">
          {currentNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/40'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800 text-xs text-slate-400">
          <div className="truncate font-medium text-slate-300">{user?.email}</div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
            <span>v1.0.0</span>
            <span className="capitalize">{role}</span>
          </div>
        </div>
      </aside>
    </>
  );
};
