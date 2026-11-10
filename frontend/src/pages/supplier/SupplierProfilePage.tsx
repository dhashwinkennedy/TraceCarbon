import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { StatusBadge } from '../../components/common/StatusBadge';
import { supplierService } from '../../services/supplier.service';
import { Supplier } from '../../types';
import { Building2, Mail, Hash, ShieldCheck, Calendar, Info } from 'lucide-react';
import { formatDate } from '../../utils/formatters';

export const SupplierProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<Supplier | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await supplierService.getProfile();
      setProfile(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load supplier profile');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  if (isLoading) {
    return <LoadingSpinner text="Loading supplier profile..." />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Supplier Verified Profile"
        subtitle="Verified tier-1 supplier entity record registered with ABC Manufacturing"
      >
        {profile && <StatusBadge status={profile.active !== false ? 'active' : 'inactive'} />}
      </PageHeader>

      {error && <ErrorState message={error} onRetry={fetchProfile} />}

      {profile && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          {/* Header Banner */}
          <div className="p-6 bg-slate-50/60 border-b border-slate-100 flex items-start gap-4">
            <div className="p-3 bg-emerald-100/70 text-emerald-800 rounded-xl">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{profile.name}</h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Supplier Key: {profile.id}
              </p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5" />
                Supplier ERP / Vendor Code
              </span>
              <p className="font-mono text-sm font-semibold text-slate-800">
                {profile.supplier_code || '—'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                Official Contact Email
              </span>
              <p className="text-sm font-medium text-slate-800">
                {profile.contact_email}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Account Status
              </span>
              <p className="text-sm font-medium text-slate-800">
                {profile.active !== false ? 'Active Supply Chain Partner' : 'Suspended Partner'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Registered On
              </span>
              <p className="text-sm font-medium text-slate-800">
                {profile.created_at ? formatDate(profile.created_at) : 'Active Master Record'}
              </p>
            </div>
          </div>

          {/* Governance Notice */}
          <div className="p-4 mx-6 mb-6 rounded-lg bg-slate-50 border border-slate-200/80 flex items-start gap-3">
            <Info className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 leading-relaxed">
              <span className="font-semibold text-slate-800 block mb-0.5">
                Master Data Governance Policy:
              </span>
              Supplier master records and ERP vendor codes are administered directly by ABC Manufacturing. If you need to update legal business information, banking, or environmental compliance points of contact, please reach out directly to the procurement administrator.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
