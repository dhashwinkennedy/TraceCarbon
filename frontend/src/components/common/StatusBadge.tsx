import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const normalized = (status || '').toLowerCase().replace(/[\s-]/g, '_');

  const configMap: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    // Submission statuses
    draft: {
      label: 'Draft',
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      dot: 'bg-slate-400',
    },
    submitted: {
      label: 'Submitted',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      dot: 'bg-blue-500',
    },
    clarification_requested: {
      label: 'Clarification Requested',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      dot: 'bg-amber-500',
    },
    reviewed: {
      label: 'Reviewed',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      dot: 'bg-emerald-500',
    },
    response_submitted: {
      label: 'Response Submitted',
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      dot: 'bg-indigo-500',
    },
    closed: {
      label: 'Closed',
      bg: 'bg-slate-100',
      text: 'text-slate-600',
      dot: 'bg-slate-400',
    },

    // Categories
    category_1: {
      label: 'Category 1 (Purchased Goods)',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      dot: 'bg-emerald-500',
    },
    category_2: {
      label: 'Category 2 (Capital Goods)',
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      dot: 'bg-indigo-500',
    },

    // Clarification statuses
    open: {
      label: 'Open',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      dot: 'bg-amber-500',
    },
    pending: {
      label: 'Pending Response',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      dot: 'bg-amber-500',
    },
    responded: {
      label: 'Response Received',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      dot: 'bg-blue-500',
    },
    resolved: {
      label: 'Resolved',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      dot: 'bg-emerald-500',
    },

    // Calculation Methods
    product_factor: {
      label: 'Product-Factor',
      bg: 'bg-teal-50',
      text: 'text-teal-700',
      dot: 'bg-teal-500',
    },
    activity_based: {
      label: 'Activity-Based',
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      dot: 'bg-indigo-500',
    },
    spend_based: {
      label: 'Spend-Based',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      dot: 'bg-amber-500',
    },

    // Cross reference status
    verified: {
      label: 'Verified',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      dot: 'bg-emerald-500',
    },
    discrepancy_detected: {
      label: 'Discrepancy Detected',
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      dot: 'bg-rose-500',
    },
    unverifiable: {
      label: 'Unverifiable',
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      dot: 'bg-slate-400',
    },
  };

  const fallbackLabel = (status || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const current = configMap[normalized] || {
    label: fallbackLabel,
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    dot: 'bg-slate-400',
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full ${current.bg} ${current.text} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
      {current.label}
    </span>
  );
};
