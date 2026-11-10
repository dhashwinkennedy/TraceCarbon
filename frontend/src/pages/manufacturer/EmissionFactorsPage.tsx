import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { StatusBadge } from '../../components/common/StatusBadge';
import { manufacturerService } from '../../services/manufacturer.service';
import { EmissionFactor, ActivityLibraryItem } from '../../types';
import { Layers, BookOpen, Filter, ShieldCheck } from 'lucide-react';

export const EmissionFactorsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'factors' | 'library'>('factors');
  const [factors, setFactors] = useState<EmissionFactor[]>([]);
  const [library, setLibrary] = useState<ActivityLibraryItem[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [fData, lData] = await Promise.all([
        manufacturerService.getEmissionFactors(),
        manufacturerService.getActivityLibrary(),
      ]);
      setFactors(fData);
      setLibrary(lData);
    } catch (err: any) {
      setError(err.message || 'Failed to load emission factors');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredFactors = factors.filter(
    (f) => !typeFilter || f.factor_type === typeFilter
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Emission Factors & Activity Library"
        subtitle="Standardized GHG Protocol carbon intensity factors and primary activity taxonomy"
      />

      {error && <ErrorState message={error} onRetry={fetchData} />}

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('factors')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'factors'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Layers className="w-4 h-4" />
          Emission Factors Catalog ({factors.length})
        </button>
        <button
          onClick={() => setActiveTab('library')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'library'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Activity Data Library ({library.length})
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner text="Retrieving factors and activity taxonomy..." />
      ) : activeTab === 'factors' ? (
        <div className="space-y-4">
          {/* Notice & Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>
                Standard emission factors are verified reference datasets mapped by GHG calculation methodology.
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="text-xs font-medium bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">All Factor Methodologies</option>
                <option value="product_factor">Product Factor (Tier 1)</option>
                <option value="activity_based">Activity Based (Tier 2)</option>
                <option value="spend_based">Spend Based (Tier 3)</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Factor Name</th>
                  <th className="px-6 py-3.5 font-semibold">Methodology</th>
                  <th className="px-6 py-3.5 font-semibold">Factor Value</th>
                  <th className="px-6 py-3.5 font-semibold">Denominator Unit</th>
                  <th className="px-6 py-3.5 font-semibold">Applicable Activity / Currency</th>
                  <th className="px-6 py-3.5 font-semibold">Source</th>
                  <th className="px-6 py-3.5 font-semibold">Version</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFactors.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      <div>
                        {f.name}
                        <span className="block text-[11px] font-mono text-slate-400 font-normal">
                          {f.id}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={f.factor_type} />
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-800 font-mono">
                      {f.factor_value}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">{f.denominator_unit}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-700">
                      {f.applicable_activity || f.currency || '—'}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {f.source_name || 'Standard Reference'}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      v{f.version || 1} {f.demo && <span className="ml-1 text-[10px] text-amber-600 bg-amber-50 px-1 py-0.5 rounded font-mono">demo</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5 font-semibold">Activity Name</th>
                <th className="px-6 py-3.5 font-semibold">Activity Key ID</th>
                <th className="px-6 py-3.5 font-semibold">Standard Unit</th>
                <th className="px-6 py-3.5 font-semibold">Category</th>
                <th className="px-6 py-3.5 font-semibold">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {library.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-semibold text-slate-900">{item.name}</td>
                  <td className="px-6 py-4 font-mono text-xs text-emerald-700 bg-emerald-50/50 rounded inline-block my-2">
                    {item.id}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs font-semibold">{item.unit}</td>
                  <td className="px-6 py-4">
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">{item.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
