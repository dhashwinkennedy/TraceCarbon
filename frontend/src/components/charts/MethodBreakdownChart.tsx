import React from 'react';
import { Bar } from 'react-chartjs-2';
import '../../utils/chartConfig';
import { formatKgCO2e } from '../../utils/formatters';

interface MethodBreakdownProps {
  dataPoints: Array<{ method: string; emissions_kgco2e: number }>;
}

export const MethodBreakdownChart: React.FC<MethodBreakdownProps> = ({ dataPoints }) => {
  const methodTotals: Record<string, number> = {
    product_factor: 0,
    activity_based: 0,
    spend_based: 0,
  };

  dataPoints.forEach((dp) => {
    const m = (dp.method || '').toLowerCase().replace(/[\s-]/g, '_');
    if (methodTotals[m] !== undefined) {
      methodTotals[m] += dp.emissions_kgco2e;
    }
  });

  const data = {
    labels: ['Product-Factor', 'Activity-Based', 'Spend-Based'],
    datasets: [
      {
        data: [
          methodTotals.product_factor,
          methodTotals.activity_based,
          methodTotals.spend_based,
        ],
        backgroundColor: ['#14B8A6', '#6366F1', '#F59E0B'],
        borderRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => ` Emissions: ${formatKgCO2e(context.raw || 0)}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: '#F1F5F9',
        },
        ticks: {
          callback: (value: any) => formatKgCO2e(value, 0),
          font: {
            size: 10,
          },
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
          },
        },
      },
    },
  };

  return (
    <div className="h-64 w-full">
      <Bar data={data} options={options} />
    </div>
  );
};
