import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import '../../utils/chartConfig';
import { formatKgCO2e } from '../../utils/formatters';

interface CategoryDoughnutProps {
  category1: number;
  category2: number;
}

export const CategoryDoughnut: React.FC<CategoryDoughnutProps> = ({
  category1,
  category2,
}) => {
  const total = category1 + category2;

  const data = {
    labels: ['Category 1: Purchased Goods', 'Category 2: Capital Goods'],
    datasets: [
      {
        data: [category1, category2],
        backgroundColor: ['#10B981', '#6366F1'],
        hoverBackgroundColor: ['#059669', '#4F46E5'],
        borderWidth: 2,
        borderColor: '#FFFFFF',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          boxWidth: 12,
          usePointStyle: true,
          pointStyle: 'circle',
          font: {
            size: 11,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const val = context.raw || 0;
            const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0';
            return ` ${context.label}: ${formatKgCO2e(val)} (${pct}%)`;
          },
        },
      },
    },
    cutout: '72%',
  };

  if (total === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-sm">
        <p>No emissions calculated for this period</p>
      </div>
    );
  }

  return (
    <div className="relative h-64 w-full flex items-center justify-center">
      <Doughnut data={data} options={options} />
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-6">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total</span>
        <span className="text-lg font-bold text-slate-800">{formatKgCO2e(total)}</span>
      </div>
    </div>
  );
};
