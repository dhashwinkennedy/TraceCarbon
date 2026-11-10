import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  Building2,
  Truck,
  ShieldCheck,
  KeyRound,
  Check,
  Sparkles,
} from 'lucide-react';

export type DemoRoleGroup = 'manufacturer' | 'supplier' | 'auditor';

export interface DemoAccount {
  id: string;
  name: string;
  code: string;
  email: string;
  password: string;
  group: DemoRoleGroup;
  roleLabel: string;
  industryOrScope: string;
  badgeColor: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  // 1. Manufacturer (1 account)
  {
    id: 'mfg-001',
    name: 'ABC Manufacturing Ltd',
    code: 'CORP-HQ',
    email: 'manufacturer@scope3track.demo',
    password: 'ManufacturerDemo123!',
    group: 'manufacturer',
    roleLabel: 'Manufacturer Admin',
    industryOrScope: 'Scope 1-3 Enterprise',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },

  // 2. Suppliers (10 accounts: SUP-001 to SUP-010)
  {
    id: 'sup-001',
    name: 'AxiomX Steel Suppliers',
    code: 'SUP-001',
    email: 'supplier.steel@axiomx.demo',
    password: 'AxiomX!Steel#2026',
    group: 'supplier',
    roleLabel: 'Supplier',
    industryOrScope: 'Steel',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-300',
  },
  {
    id: 'sup-002',
    name: 'AxiomX Rubber Suppliers',
    code: 'SUP-002',
    email: 'supplier.rubber@axiomx.demo',
    password: 'AxiomX!Rubber#2026',
    group: 'supplier',
    roleLabel: 'Supplier',
    industryOrScope: 'Rubber',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    id: 'sup-003',
    name: 'AxiomX Aluminium Suppliers',
    code: 'SUP-003',
    email: 'supplier.aluminium@axiomx.demo',
    password: 'AxiomX!Aluminium#2026',
    group: 'supplier',
    roleLabel: 'Supplier',
    industryOrScope: 'Aluminium',
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
  },
  {
    id: 'sup-004',
    name: 'AxiomX Cement Suppliers',
    code: 'SUP-004',
    email: 'supplier.cement@axiomx.demo',
    password: 'AxiomX!Cement#2026',
    group: 'supplier',
    roleLabel: 'Supplier',
    industryOrScope: 'Cement',
    badgeColor: 'bg-stone-100 text-stone-700 border-stone-300',
  },
  {
    id: 'sup-005',
    name: 'AxiomX Chemical Suppliers',
    code: 'SUP-005',
    email: 'supplier.chemical@axiomx.demo',
    password: 'AxiomX!Chemical#2026',
    group: 'supplier',
    roleLabel: 'Supplier',
    industryOrScope: 'Chemicals',
    badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  },
  {
    id: 'sup-006',
    name: 'AxiomX Packaging Suppliers',
    code: 'SUP-006',
    email: 'supplier.packaging@axiomx.demo',
    password: 'AxiomX!Packaging#2026',
    group: 'supplier',
    roleLabel: 'Supplier',
    industryOrScope: 'Packaging',
    badgeColor: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  },
  {
    id: 'sup-007',
    name: 'AxiomX Textile Suppliers',
    code: 'SUP-007',
    email: 'supplier.textile@axiomx.demo',
    password: 'AxiomX!Textile#2026',
    group: 'supplier',
    roleLabel: 'Supplier',
    industryOrScope: 'Textiles',
    badgeColor: 'bg-pink-50 text-pink-700 border-pink-200',
  },
  {
    id: 'sup-008',
    name: 'AxiomX Glass Suppliers',
    code: 'SUP-008',
    email: 'supplier.glass@axiomx.demo',
    password: 'AxiomX!Glass#2026',
    group: 'supplier',
    roleLabel: 'Supplier',
    industryOrScope: 'Glass',
    badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  {
    id: 'sup-009',
    name: 'AxiomX Polymer Suppliers',
    code: 'SUP-009',
    email: 'supplier.polymer@axiomx.demo',
    password: 'AxiomX!Polymer#2026',
    group: 'supplier',
    roleLabel: 'Supplier',
    industryOrScope: 'Polymers',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  {
    id: 'sup-010',
    name: 'AxiomX Machinery Suppliers',
    code: 'SUP-010',
    email: 'supplier.machinery@axiomx.demo',
    password: 'AxiomX!Machinery#2026',
    group: 'supplier',
    roleLabel: 'Supplier',
    industryOrScope: 'Machinery',
    badgeColor: 'bg-orange-50 text-orange-700 border-orange-200',
  },

  // 3. Auditors (2 accounts)
  {
    id: 'aud-001',
    name: 'Auditor One (XYZ)',
    code: 'AUD-XYZ',
    email: 'auditor.xyz@scope3track.demo',
    password: 'AuditorDemo123!',
    group: 'auditor',
    roleLabel: 'Auditor',
    industryOrScope: 'Third-Party Verification',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  {
    id: 'aud-002',
    name: 'Auditor Two (Green)',
    code: 'AUD-GRN',
    email: 'auditor.green@scope3track.demo',
    password: 'AuditorDemo123!',
    group: 'auditor',
    roleLabel: 'Auditor',
    industryOrScope: 'Assurance Partner',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
];

const TAB_GROUPS: {
  key: DemoRoleGroup;
  label: string;
  count: number;
  icon: React.FC<{ className?: string }>;
}[] = [
  { key: 'manufacturer', label: 'Manufacturer', count: 1, icon: Building2 },
  { key: 'supplier', label: 'Suppliers', count: 10, icon: Truck },
  { key: 'auditor', label: 'Auditors', count: 2, icon: ShieldCheck },
];

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<DemoRoleGroup>('manufacturer');

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const isExpired = queryParams.get('expired') === 'true';

  const handleAutofill = (accEmail: string, accPass: string) => {
    setEmail(accEmail);
    setPassword(accPass);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const user = await login(email, password);
      // Navigate to corresponding dashboard
      if (user.role === 'manufacturer') {
        navigate('/manufacturer/dashboard');
      } else if (user.role === 'supplier') {
        navigate('/supplier/dashboard');
      } else if (user.role === 'auditor') {
        navigate('/auditor/dashboard');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const activeAccounts = DEMO_ACCOUNTS.filter((acc) => acc.group === activeTab);

  return (
    <div className="min-h-screen flex flex-col justify-center bg-slate-900 px-4 py-12 sm:px-6 lg:px-8">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative sm:mx-auto sm:w-full sm:max-w-md md:max-w-lg">
        <div className="flex justify-center items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center p-2 shadow-inner flex-shrink-0">
            <img
              src="/LOGO-MAIN.png"
              alt="TraceCarbon Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">TraceCarbon</h1>
            <p className="text-xs text-emerald-400 font-medium tracking-wide">
              Trace. Measure. Improve.
            </p>
          </div>
        </div>

        <h2 className="mt-8 text-center text-xl font-bold tracking-tight text-white">
          Sign in to your portal
        </h2>
        <p className="mt-2 text-center text-xs text-slate-400">
          Enter your authorized enterprise credentials to access emissions workspaces
        </p>
      </div>

      <div className="relative mt-8 sm:mx-auto sm:w-full sm:max-w-md md:max-w-lg">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-100">
          {isExpired && (
            <div className="mb-5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600" />
              <span>Your session has expired. Please sign in again.</span>
            </div>
          )}

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Email Address
              </label>
              <div className="mt-1 relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@company.com"
                  className="block w-full pl-9 pr-3 py-2.5 sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white placeholder-slate-400 text-slate-900 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Password
              </label>
              <div className="mt-1 relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="block w-full pl-9 pr-3 py-2.5 sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white placeholder-slate-400 text-slate-900 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition-colors mt-2"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Demo Credentials Section */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800 tracking-wider uppercase">
                  Demo Credentials
                </span>
              </div>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-600" /> 13 Active Personas
              </span>
            </div>

            <p className="text-xs text-slate-500 mb-3">
              Click any account below to autofill verified demonstration credentials:
            </p>

            {/* Role Selector Tabs: Manufacturer (1), Suppliers (10), Auditors (2) */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-lg mb-3">
              {TAB_GROUPS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    data-testid={`demo-tab-${tab.key}`}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span className="truncate">{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isActive
                          ? 'bg-emerald-100 text-emerald-700 font-bold'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Group Header Caption */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 mb-2">
              <span className="font-medium">
                {activeTab === 'manufacturer' && 'Enterprise Administrator (1 account)'}
                {activeTab === 'supplier' && 'Tier-1 Suppliers SUP-001 to SUP-010 (10 accounts)'}
                {activeTab === 'auditor' && 'Internal & Third-Party Auditors (2 accounts)'}
              </span>
              <span className="text-[10px] text-slate-400 italic">Click card to autofill</span>
            </div>

            {/* Account Cards List */}
            <div
              className={`space-y-2 ${
                activeTab === 'supplier'
                  ? 'max-h-72 overflow-y-auto pr-1'
                  : ''
              }`}
            >
              {activeAccounts.map((acc) => {
                const isSelected = email === acc.email;
                return (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => handleAutofill(acc.email, acc.password)}
                    data-testid={`demo-account-${acc.email}`}
                    className={`w-full text-left p-2.5 rounded-lg border transition-all flex flex-col gap-1 relative ${
                      isSelected
                        ? 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-400/20 shadow-sm'
                        : 'bg-slate-50/80 hover:bg-slate-100/90 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-xs text-slate-900 truncate">
                        {acc.name}
                      </span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${acc.badgeColor}`}
                        >
                          {acc.code} • {acc.industryOrScope}
                        </span>
                        {isSelected && (
                          <span className="flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                            <Check className="w-3 h-3 mr-0.5" /> Filled
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-600 pt-0.5">
                      <div className="flex items-center gap-1 font-mono truncate text-slate-700">
                        <Mail className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{acc.email}</span>
                      </div>
                      <div className="flex items-center gap-1 font-mono text-[10px] text-slate-600 bg-white/90 px-1.5 py-0.5 rounded border border-slate-200 flex-shrink-0">
                        <Lock className="w-2.5 h-2.5 text-slate-400" />
                        <span>{acc.password}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 text-center">
              <p className="text-[11px] text-slate-400">
                All credentials shown are authorized test fixtures for demonstration.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
