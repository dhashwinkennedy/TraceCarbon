import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { manufacturerService } from '../../services/manufacturer.service';
import { Auditor, AuditorAssignment, Supplier } from '../../types';
import { formatDate } from '../../utils/formatters';
import {
  ShieldCheck,
  Plus,
  Trash2,
  Mail,
  UserCheck,
  BadgeCheck,
  ToggleLeft,
  ToggleRight,
  IdCard,
} from 'lucide-react';

interface FullAssignment extends AuditorAssignment {
  auditor_name?: string;
  auditor_employee_id?: string;
}

export const AuditorsPage: React.FC = () => {
  const [auditors, setAuditors] = useState<Auditor[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [assignments, setAssignments] = useState<FullAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create auditor modal
  const [isAddAuditorOpen, setIsAddAuditorOpen] = useState(false);
  const [auditorName, setAuditorName] = useState('');
  const [auditorEmail, setAuditorEmail] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [initialPassword, setInitialPassword] = useState('AuditorPass123!');
  const [isCreatingAuditor, setIsCreatingAuditor] = useState(false);

  // Assign modal
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedAuditorId, setSelectedAuditorId] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Delete assignment modal
  const [deleteTarget, setDeleteTarget] = useState<FullAssignment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [auds, sups] = await Promise.all([
        manufacturerService.getAuditors(),
        manufacturerService.getSuppliers(),
      ]);
      setAuditors(auds);
      setSuppliers(sups);

      // Fetch assignments for each auditor
      const allAssigns: FullAssignment[] = [];
      await Promise.all(
        auds.map(async (aud) => {
          try {
            const list = await manufacturerService.getAuditorAssignments(aud.id);
            list.forEach((item) => {
              const sup = sups.find((s) => s.id === item.supplier_id);
              allAssigns.push({
                ...item,
                auditor_name: aud.name,
                auditor_employee_id: aud.employee_id,
                supplier_name: sup?.name || item.supplier_id,
              });
            });
          } catch {
            // No assignments or failed for this auditor
          }
        })
      );
      setAssignments(allAssigns);
    } catch (err: any) {
      setError(err.message || 'Failed to load internal auditors and assignments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateAuditor = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingAuditor(true);
    try {
      await manufacturerService.createAuditor({
        name: auditorName,
        email: auditorEmail,
        login_email: loginEmail || auditorEmail,
        initial_password: initialPassword,
        employee_id: employeeId || `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      });
      setIsAddAuditorOpen(false);
      setAuditorName('');
      setAuditorEmail('');
      setLoginEmail('');
      setEmployeeId('');
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to create internal auditor');
    } finally {
      setIsCreatingAuditor(false);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAuditorId || !selectedSupplierId) return;
    setIsAssigning(true);
    try {
      await manufacturerService.createAuditorAssignment(selectedAuditorId, {
        supplier_id: selectedSupplierId,
      });
      setIsAssignOpen(false);
      setSelectedAuditorId('');
      setSelectedSupplierId('');
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to create assignment');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleDeleteAssignment = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await manufacturerService.deleteAuditorAssignment(deleteTarget.auditor_id, deleteTarget.id);
      setDeleteTarget(null);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to remove assignment');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleAuditorStatus = async (aud: Auditor) => {
    try {
      await manufacturerService.setAuditorStatus(aud.id, !aud.active);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update auditor active status');
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Internal Auditors & Verification Governance"
        subtitle="Manage ABC Manufacturing internal verification staff and assign supplier audit portfolios"
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddAuditorOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Internal Auditor
          </button>
          <button
            onClick={() => {
              if (auditors.length > 0) setSelectedAuditorId(auditors[0].id);
              if (suppliers.length > 0) setSelectedSupplierId(suppliers[0].id);
              setIsAssignOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
          >
            <UserCheck className="w-3.5 h-3.5" />
            Assign Supplier to Auditor
          </button>
        </div>
      </PageHeader>

      {error && <ErrorState message={error} onRetry={fetchData} />}

      {isLoading ? (
        <LoadingSpinner text="Loading internal auditors..." />
      ) : (
        <>
          {/* Section 1: Auditor Assignments */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Active Audit Portfolio Assignments ({assignments.length})
            </h3>
            {assignments.length === 0 ? (
              <div className="p-6 text-center bg-white border border-dashed border-slate-300 rounded-xl">
                <p className="text-sm text-slate-500">No suppliers assigned to internal auditors yet.</p>
                <button
                  onClick={() => setIsAssignOpen(true)}
                  className="mt-2 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                >
                  Create first assignment →
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3.5 font-semibold">Internal Auditor</th>
                      <th className="px-6 py-3.5 font-semibold">Assigned Supplier</th>
                      <th className="px-6 py-3.5 font-semibold">Assignment Date</th>
                      <th className="px-6 py-3.5 font-semibold text-right">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {assignments.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-purple-600" />
                            <div>
                              <span className="font-semibold text-slate-900 block">
                                {a.auditor_name || a.auditor_id}
                              </span>
                              {a.auditor_employee_id && (
                                <span className="text-[11px] font-mono text-slate-400">
                                  {a.auditor_employee_id}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <UserCheck className="w-3 h-3 text-emerald-600" />
                            {a.supplier_name || a.supplier_id}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500">
                          {formatDate(a.created_at)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setDeleteTarget(a)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Unassign"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 2: Internal Auditors List */}
          <div className="space-y-3 pt-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              ABC Manufacturing Internal Verification Team ({auditors.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {auditors.map((aud) => {
                const assignedCount = assignments.filter((a) => a.auditor_id === aud.id).length;
                return (
                  <div
                    key={aud.id}
                    className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs border border-purple-100">
                          <BadgeCheck className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {assignedCount} {assignedCount === 1 ? 'Supplier' : 'Suppliers'} Assigned
                        </span>
                      </div>
                      <h4 className="mt-3 font-semibold text-slate-900 text-sm">{aud.name}</h4>
                      <p className="mt-1 text-xs text-slate-500 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {aud.email}
                      </p>
                      {aud.employee_id && (
                        <p className="mt-1 text-xs text-slate-500 flex items-center gap-1.5 font-mono">
                          <IdCard className="w-3.5 h-3.5 text-slate-400" />
                          {aud.employee_id}
                        </p>
                      )}
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-[11px] font-mono text-slate-400">
                        {aud.active !== false ? 'Active Staff' : 'Inactive'}
                      </span>
                      <button
                        onClick={() => handleToggleAuditorStatus(aud)}
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded transition-colors ${
                          aud.active !== false
                            ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                            : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                        }`}
                      >
                        {aud.active !== false ? (
                          <>
                            <ToggleRight className="w-3.5 h-3.5" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-3.5 h-3.5" />
                            Activate
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Add Internal Auditor Modal */}
      {isAddAuditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Add Internal Auditor (ABC Staff)</h3>
              <button
                onClick={() => setIsAddAuditorOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateAuditor} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Staff Member Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe (Quality Assurance)"
                  value={auditorName}
                  onChange={(e) => setAuditorName(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EMP-1042"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Work Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="john@company.com"
                    value={auditorEmail}
                    onChange={(e) => setAuditorEmail(e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
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
                  placeholder="john.auditor@company.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
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
                  className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddAuditorOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingAuditor}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold shadow-sm disabled:opacity-50"
                >
                  {isCreatingAuditor ? 'Creating...' : 'Register Auditor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Auditor Modal */}
      {isAssignOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Assign Supplier to Internal Auditor</h3>
              <button
                onClick={() => setIsAssignOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateAssignment} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Select Auditor (ABC Staff)
                </label>
                <select
                  value={selectedAuditorId}
                  onChange={(e) => setSelectedAuditorId(e.target.value)}
                  required
                  className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  {auditors.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.employee_id || a.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Select Target Supplier
                </label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  required
                  className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.supplier_code || s.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAssignOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigning}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm disabled:opacity-50"
                >
                  {isAssigning ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Assignment Modal */}
      <ConfirmationModal
        isOpen={!!deleteTarget}
        title="Remove Audit Assignment"
        message="Are you sure you want to remove this auditor assignment? The internal auditor will no longer have access to this supplier's monthly submissions."
        confirmText="Remove Assignment"
        confirmVariant="danger"
        isLoading={isDeleting}
        onConfirm={handleDeleteAssignment}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
