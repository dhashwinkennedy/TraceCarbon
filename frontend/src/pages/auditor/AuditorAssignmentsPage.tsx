import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { auditorService } from '../../services/auditor.service';
import { AuditorAssignment } from '../../types';
import { formatDate } from '../../utils/formatters';
import { ShieldCheck, UserCheck, Calendar, ArrowRight } from 'lucide-react';

export const AuditorAssignmentsPage: React.FC = () => {
  const [assignments, setAssignments] = useState<AuditorAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await auditorService.getAssignments();
      setAssignments(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load assigned suppliers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assigned Suppliers Portfolio"
        subtitle="Upstream industrial partners allocated to your verification jurisdiction"
      />

      {error && <ErrorState message={error} onRetry={fetchAssignments} />}

      {isLoading ? (
        <LoadingSpinner text="Fetching audit portfolio assignments..." />
      ) : assignments.length === 0 ? (
        <div className="p-8 text-center bg-white border border-dashed border-slate-300 rounded-xl">
          <ShieldCheck className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No Suppliers Assigned</p>
          <p className="text-xs text-slate-400 mt-1">
            The enterprise manufacturer has not assigned any supplier portfolios to your account yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assignments.map((a) => (
            <div
              key={a.id}
              className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-sm border border-purple-100">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                    Active Mandate
                  </span>
                </div>

                <h3 className="mt-3 font-bold text-slate-900 text-base">
                  {a.supplier_name || a.supplier_id}
                </h3>
                <p className="mt-1 text-xs text-slate-400 font-mono">
                  Supplier ID: {a.supplier_id}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs text-slate-500">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Assigned on {formatDate(a.created_at)}</span>
                </div>
              </div>

              <Link
                to={`/auditor/submissions?supplier_id=${a.supplier_id}`}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold transition-colors"
              >
                Inspect Submissions
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
