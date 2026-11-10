import React from 'react';
import { Bar } from 'react-chartjs-2';
import '../../utils/chartConfig';
import { formatKgCO2e } from '../../utils/formatters';

interface SupplierEmissionsBarProps {
  suppliers: Array<{
    supplier_id: string;
    supplier_name: string;
    emissions_kgco2e: number;
  }>;
}

export const SupplierEmissionsBar: React.FC<SupplierEmissionsBarProps> = ({ suppliers }) => {
  if (!suppliers || suppliers.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-sm">
        <p>No supplier emissions data available</p>
      </div>
    );
  }

  // Sort descending
  const sorted = [...suppliers].sort((a, b) => b.emissions_kgco2e - a.emissions_kgco2e);

  const data = {
    labels: sorted.map((s) => s.supplier_name),
    datasets: [
      {
        label: 'Emissions',
        data: sorted.map((s) => s.emissions_kgco2e),
        backgroundColor: '#0EA5E9',
        borderRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
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
      x: {
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
      y: {
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
