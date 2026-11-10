import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { manufacturerService } from '../../services/manufacturer.service';
import { Supplier } from '../../types';
import {
  Users,
  Plus,
  Settings2,
  Mail,
  ToggleLeft,
  ToggleRight,
  CheckCircle2,
  Sliders,
  ShieldAlert,
} from 'lucide-react';

export const SuppliersPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [supplierCode, setSupplierCode] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [initialPassword, setInitialPassword] = useState('SupplierPass123!');
  const [contactDetails, setContactDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Status toggle modal state
  const [statusTarget, setStatusTarget] = useState<Supplier | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  const fetchSuppliers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await manufacturerService.getSuppliers();
      setSuppliers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load suppliers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await manufacturerService.createSupplier({
        name,
        supplier_code: supplierCode || `SUP${Math.floor(100 + Math.random() * 900)}`,
        contact_email: contactEmail,
        login_email: loginEmail || contactEmail,
        initial_password: initialPassword,
        contact_details: contactDetails,
        requirements: [],
      });
      setIsAddOpen(false);
      setName('');
      setSupplierCode('');
      setContactEmail('');
      setLoginEmail('');
      setContactDetails('');
      await fetchSuppliers();
    } catch (err: any) {
      alert(err.message || 'Failed to create supplier');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!statusTarget) return;
    setIsTogglingStatus(true);
    try {
      const newActive = !statusTarget.active;
      await manufacturerService.setSupplierStatus(statusTarget.id, newActive);
      setStatusTarget(null);
      await fetchSuppliers();
    } catch (err: any) {
      alert(err.message || 'Failed to update supplier active status');
    } finally {
      setIsTogglingStatus(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supplier Management"
        subtitle="Maintain tier-1 upstream suppliers and configure dynamic activity reporting requirements"
      >
        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Supplier
        </button>
      </PageHeader>

      {error && <ErrorState message={error} onRetry={fetchSuppliers} />}

      {isLoading ? (
        <LoadingSpinner text="Loading supplier network..." />
      ) : suppliers.length === 0 ? (
        <EmptyState
          title="No Suppliers Configured"
          description="Add your first supplier to define reporting metrics and track their emissions"
          icon={<Users className="w-8 h-8 text-emerald-500" />}
          action={{
            label: 'Add Supplier',
            onClick: () => setIsAddOpen(true),
          }}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Supplier Name</th>
                  <th className="px-6 py-3.5 font-semibold">Contact Email</th>
                  <th className="px-6 py-3.5 font-semibold">Supplier Code</th>
                  <th className="px-6 py-3.5 font-semibold">Status</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs border border-emerald-100">
                          {s.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 block">{s.name}</span>
                          <span className="text-[11px] text-slate-400 font-mono">ID: {s.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-slate-600 text-xs">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {s.contact_email}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-700">
                      {s.supplier_code || '—'}
                    </td>
                    <td className="px-6 py-4">
                      {s.active !== false ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-300">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/manufacturer/suppliers/${s.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                        >
                          <Settings2 className="w-3.5 h-3.5" />
                          Requirements
                        </Link>
                        <button
                          onClick={() => setStatusTarget(s)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            s.active !== false
                              ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                              : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                          }`}
                          title={s.active !== false ? 'Deactivate supplier' : 'Activate supplier'}
                        >
                          {s.active !== false ? (
                            <>
                              <ToggleRight className="w-4 h-4 text-emerald-600" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-4 h-4 text-slate-400" />
                              Activate
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Add Upstream Supplier</h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddSupplier} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Supplier Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Steel Components"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Supplier Code
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SUP003"
                    value={supplierCode}
                    onChange={(e) => setSupplierCode(e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="contact@supplier.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Login Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="portal.login@supplier.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Initial Password
                </label>
                <input
                  type="password"
                  required
                  value={initialPassword}
                  onChange={(e) => setInitialPassword(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Activate / Deactivate Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!statusTarget}
        title={statusTarget?.active !== false ? 'Deactivate Supplier' : 'Activate Supplier'}
        message={
          statusTarget?.active !== false
            ? `Deactivating ${statusTarget?.name} will prevent this supplier from logging into the portal and submitting new carbon reports. Existing calculation records will remain preserved.`
            : `Re-activating ${statusTarget?.name} will allow this supplier to log into the portal and submit monthly activity reports.`
        }
        confirmText={statusTarget?.active !== false ? 'Deactivate Supplier' : 'Activate Supplier'}
        confirmVariant={statusTarget?.active !== false ? 'warning' : 'primary'}
        isLoading={isTogglingStatus}
        onConfirm={handleToggleStatus}
        onCancel={() => setStatusTarget(null)}
      />
    </div>
  );
};
