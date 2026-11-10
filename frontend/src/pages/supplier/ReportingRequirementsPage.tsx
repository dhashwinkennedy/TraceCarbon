import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { supplierService } from '../../services/supplier.service';
import { SupplierRequirement } from '../../types';
import { FileText, Sliders, Info, CheckCircle2 } from 'lucide-react';

export const ReportingRequirementsPage: React.FC = () => {
  const [requirements, setRequirements] = useState<SupplierRequirement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequirements = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await supplierService.getRequirements();
      setRequirements(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load reporting requirements');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequirements();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reporting Requirements"
        subtitle="Energy, fuel, and activity metrics mandated by ABC Manufacturing"
      />

      {error && <ErrorState message={error} onRetry={fetchRequirements} />}

      {isLoading ? (
        <LoadingSpinner text="Fetching mandated requirements..." />
      ) : requirements.length === 0 ? (
        <div className="p-8 text-center bg-white border border-dashed border-slate-300 rounded-xl">
          <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No Specific Requirements Set</p>
          <p className="text-xs text-slate-400 mt-1">
            Your manufacturer partner has not configured mandatory metric keys yet.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Activity Metric Key</th>
                  <th className="px-6 py-3.5 font-semibold">Expected Standard Unit</th>
                  <th className="px-6 py-3.5 font-semibold">Aggregation Method</th>
                  <th className="px-6 py-3.5 font-semibold">Requirement Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requirements.map((req, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-emerald-600" />
                        <span>{req.activity_id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-700">
                      {req.expected_unit}
                    </td>
                    <td className="px-6 py-4 text-xs capitalize text-slate-600">
                      {req.aggregation_rule} across reporting cycle
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        Mandatory
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Unit Conversion Engine Note */}
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-3 text-xs text-blue-900">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block">Automatic Unit Conversion Engine:</span>
              <p>
                TraceCarbon includes an automatic conversion engine. If your facility records electricity in <strong>MWh</strong>, fuel in <strong>Gallons</strong>, or mass in <strong>Tonnes</strong>, you can report in your native units — the system converts automatically (e.g. 100 MWh &rarr; 100,000 kWh) for audit trail consistency.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
