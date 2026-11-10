import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { manufacturerService } from '../../services/manufacturer.service';
import { ManufacturerProfile } from '../../types';
import { Building2, Save, CheckCircle2 } from 'lucide-react';

export const CompanyProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<ManufacturerProfile | null>(null);
  const [name, setName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [reportingCurrency, setReportingCurrency] = useState('INR');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await manufacturerService.getProfile();
      setProfile(data);
      setName(data.name || '');
      setContactEmail(data.contact_email || '');
      setReportingCurrency(data.reporting_currency || 'INR');
    } catch (err: any) {
      setError(err.message || 'Failed to load manufacturer profile');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccess(null);
    setError(null);
    try {
      const updated = await manufacturerService.updateProfile({
        name,
        contact_email: contactEmail,
        reporting_currency: reportingCurrency,
      });
      setProfile(updated);
      setSuccess('Enterprise profile updated successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to update company profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="Loading manufacturer profile..." />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="Enterprise Company Profile"
        subtitle="Manage ABC Manufacturing company settings and reporting currency"
      />

      {error && <ErrorState message={error} onRetry={fetchProfile} />}

      {success && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Enterprise Legal Name
            </label>
            <div className="mt-1 relative rounded-lg">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Primary Compliance Contact Email
            </label>
            <div className="mt-1 relative rounded-lg">
              <input
                type="email"
                required
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Reporting Currency
            </label>
            <select
              value={reportingCurrency}
              onChange={(e) => setReportingCurrency(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium bg-white"
            >
              <option value="INR">INR (Indian Rupee - ₹)</option>
              <option value="USD">USD (US Dollar - $)</option>
              <option value="EUR">EUR (Euro - €)</option>
              <option value="GBP">GBP (British Pound - £)</option>
            </select>
            <p className="mt-1 text-xs text-slate-400">
              Reporting currency denominator used across economic spend-based calculations.
            </p>
          </div>

          {profile && (
            <div className="pt-2 text-xs text-slate-400 font-mono">
              Profile ID: {profile.id}
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
