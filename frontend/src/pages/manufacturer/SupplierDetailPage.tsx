import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { manufacturerService } from '../../services/manufacturer.service';
import { Supplier, SupplierRequirement, ActivityLibraryItem } from '../../types';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Layers,
  AlertCircle,
} from 'lucide-react';

export const SupplierDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [library, setLibrary] = useState<ActivityLibraryItem[]>([]);
  const [requirements, setRequirements] = useState<SupplierRequirement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchData = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const [supData, reqData, libData] = await Promise.all([
        manufacturerService.getSupplier(id),
        manufacturerService.getSupplierRequirements(id),
        manufacturerService.getActivityLibrary(),
      ]);
      setSupplier(supData);
      setRequirements(reqData);
      setLibrary(libData);
    } catch (err: any) {
      setError(err.message || 'Failed to load supplier details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleAddRequirement = () => {
    if (library.length === 0) return;
    const defaultActivity = library[0];
    const newReq: SupplierRequirement = {
      activity_id: defaultActivity.id,
      expected_unit: defaultActivity.unit,
      aggregation_rule: 'sum', // Only 'sum' is supported by backend
    };
    setRequirements([...requirements, newReq]);
  };

  const handleRemoveRequirement = (index: number) => {
    const updated = [...requirements];
    updated.splice(index, 1);
    setRequirements(updated);
  };

  const handleActivityChange = (index: number, activityId: string) => {
    const selectedItem = library.find((l) => l.id === activityId);
    const updated = [...requirements];
    updated[index] = {
      ...updated[index],
      activity_id: activityId,
      expected_unit: selectedItem ? selectedItem.unit : updated[index].expected_unit,
      aggregation_rule: 'sum',
    };
    setRequirements(updated);
  };

  const handleUnitChange = (index: number, unit: string) => {
    const updated = [...requirements];
    updated[index] = { ...updated[index], expected_unit: unit, aggregation_rule: 'sum' };
    setRequirements(updated);
  };

  const handleSave = async () => {
    if (!id || !supplier) return;
    setIsSaving(true);
    setSuccess(null);
    setError(null);
    try {
      const cleanReqs = requirements.map((r) => ({
        activity_id: r.activity_id,
        expected_unit: r.expected_unit,
        aggregation_rule: 'sum' as const,
      }));
      const updated = await manufacturerService.setSupplierRequirements(id, cleanReqs);
      setRequirements(updated);
      setSuccess('Reporting requirements saved successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to save requirements');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="Loading supplier configuration..." />;
  }

  if (error || !supplier) {
    return <ErrorState message={error || 'Supplier not found'} onRetry={fetchData} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link
          to="/manufacturer/suppliers"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Suppliers
        </Link>
      </div>

      <PageHeader
        title={`Configure: ${supplier.name}`}
        subtitle={`Supplier Code: ${supplier.supplier_code || supplier.id} • ${supplier.contact_email} • ${supplier.active ? 'Active' : 'Inactive'}`}
      >
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save Requirements'}
        </button>
      </PageHeader>

      {success && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* Configuration Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-6">
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Monthly Activity Requirements
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Define the primary energy, fuel, or material metrics this supplier must report each month.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddRequirement}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Activity Rule
            </button>
          </div>
        </div>

        {requirements.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl">
            <Layers className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">No Reporting Requirements Configured</p>
            <p className="text-xs text-slate-400 mt-1">
              Click "Add Activity Rule" to mandate specific emission activity inputs for this supplier.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Activity Metric</th>
                  <th className="px-4 py-3 font-semibold">Expected Unit</th>
                  <th className="px-4 py-3 font-semibold">Aggregation Rule</th>
                  <th className="px-4 py-3 font-semibold text-right">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requirements.map((req, index) => (
                  <tr key={index} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <select
                        value={req.activity_id}
                        onChange={(e) => handleActivityChange(index, e.target.value)}
                        className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-emerald-500"
                      >
                        {library.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} ({item.id})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={req.expected_unit}
                        onChange={(e) => handleUnitChange(index, e.target.value)}
                        placeholder="e.g. kWh, litres, tonnes"
                        className="w-28 text-xs font-medium bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                        sum (Sum across batch)
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveRequirement(index)}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
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

        <div className="p-4 rounded-lg bg-blue-50 border border-blue-100 flex items-start gap-3 text-xs text-blue-800">
          <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block mb-0.5">Enforcement Policy:</span>
            The Scope 3 ingestion engine strictly aggregates multi-row spreadsheet entries using the documented <code>sum</code> rule. All configured metrics will be checked during supplier reporting.
          </div>
        </div>
      </div>
    </div>
  );
};
