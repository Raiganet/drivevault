'use client';
import { useEffect, useState } from 'react';

export default function StatCard({ icon, label, value, subtitle, gradient, trend, trendValue, onClick }) {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    const numericValue = parseFloat(String(value).replace(/[^0-9.-]+/g, '')) || 0;
    const duration = 1000;
    const steps = 60;
    const increment = numericValue / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= numericValue) {
        setAnimatedValue(numericValue);
        clearInterval(timer);
      } else {
        setAnimatedValue(current);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  const formatDisplayValue = (val) => {
    if (String(value).includes('MB') || String(value).includes('GB') || String(value).includes('KB')) {
      return value;
    }
    return Number.isInteger(val) ? val : val.toFixed(2);
  };

  return (
    <div 
      className={`card p-6 relative overflow-hidden group cursor-pointer ${onClick ? 'hover:scale-[1.02]' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`${label}: ${value}`}
    >
      {/* Background Gradient */}
      <div className={`absolute top-0 right-0 w-32 h-32 ${gradient} opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:opacity-20 transition-opacity`}></div>
      
      {/* Header */}
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className={`w-12 h-12 rounded-xl ${gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
          <i className={`fa-solid ${icon} text-white text-xl`}></i>
        </div>
        
        {trend && (
          <div className={`badge badge-${trend === 'up' ? 'success' : trend === 'down' ? 'danger' : 'info'}`}>
            <i className={`fa-solid fa-arrow-${trend} text-xs mr-1`}></i>
            {trendValue}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="relative z-10">
        <div className="mb-1">
          <span className="text-3xl lg:text-4xl font-bold text-gradient count-up">
            {formatDisplayValue(animatedValue)}
          </span>
        </div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
        {subtitle && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{subtitle}</p>
        )}
      </div>

      {/* Hover Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
    </div>
  );
}
