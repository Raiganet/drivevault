'use client';

import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function DocumentStatsChart({ categories, isDark }) {
  if (!categories || Object.keys(categories).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <i className="fa-solid fa-chart-pie text-5xl mb-3 opacity-30"></i>
        <p className="text-sm">No data available</p>
      </div>
    );
  }

  const data = {
    labels: Object.keys(categories),
    datasets: [
      {
        data: Object.values(categories),
        backgroundColor: [
          'rgba(102, 126, 234, 0.9)',
          'rgba(139, 92, 246, 0.9)',
          'rgba(16, 185, 129, 0.9)',
          'rgba(245, 158, 11, 0.9)',
          'rgba(239, 68, 68, 0.9)',
          'rgba(236, 72, 153, 0.9)',
        ],
        borderColor: [
          'rgba(102, 126, 234, 1)',
          'rgba(139, 92, 246, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(236, 72, 153, 1)',
        ],
        borderWidth: 2,
        hoverOffset: 8,
        hoverBorderWidth: 3,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: isDark ? '#f1f5f9' : '#1f2937',
          padding: 20,
          font: { size: 12, family: 'Inter', weight: '500' },
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        titleColor: isDark ? '#f1f5f9' : '#1f2937',
        bodyColor: isDark ? '#cbd5e1' : '#4b5563',
        borderColor: isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(0, 0, 0, 0.1)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: function (context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return `${label}: ${value} file (${percentage}%)`;
          },
        },
      },
    },
    animation: {
      animateScale: true,
      animateRotate: true,
      duration: 1200,
      easing: 'easeOutQuart',
    },
  };

  return (
    <div className="chart-container scale-in">
      <Doughnut data={data} options={options} />
    </div>
  );
}