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
                  <th className="px-6 py-3.5 font-semibold">Scope / FY / Sector</th>
                  <th className="px-6 py-3.5 font-semibold">Source & Classification</th>
                  <th className="px-6 py-3.5 font-semibold">Version</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFactors.map((f) => {
                  const isSynth = Boolean(f.demo) || f.source_name === 'SYNTHETIC_DEMO';
                  const isDerived = Boolean(f.is_project_derived) || f.data_classification === 'PROJECT_DERIVED_IPCC_BASED';
                  const isOfficial = !isSynth && !isDerived && (f.id.startsWith('FACT-CEA-') || f.id.startsWith('FACT-CEDA-'));
                  return (
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
                      <div>{f.factor_value_usd ? `${f.factor_value_usd} kg/USD` : f.factor_value}</div>
                      {f.factor_value_usd && (
                        <span className="text-[10px] text-slate-400 font-normal block">
                          {f.factor_value} kg/INR @ {f.fx_rate}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">{f.denominator_unit}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-700">
                      <div>{f.applicable_activity || (f.sector_code ? `NAICS ${f.sector_code}` : f.currency || '—')}</div>
                      {f.financial_year && (
                        <span className="text-[10px] text-slate-400 block">{f.financial_year}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      <div className="mb-1">
                        {isOfficial && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Official Public Factor
                          </span>
                        )}
                        {isDerived && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            Project-Derived (IPCC-Based)
                          </span>
                        )}
                        {isSynth && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            Synthetic Demo Factor
                          </span>
                        )}
                      </div>
                      <span>{f.source_name || 'Standard Reference'}</span>
                      {f.disclosure && (
                        <span className="block text-[10px] text-amber-700 mt-0.5">{f.disclosure}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {f.factor_version ? `v${f.factor_version}` : `v${f.version || 1}`}
                    </td>
                  </tr>
                  );
                })}
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
