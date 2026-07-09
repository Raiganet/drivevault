'use client';
import { formatRelativeTime } from '@/utils/helpers';
import EmptyState from './EmptyState';

export default function Activity({ activityLog }) {
  const getIcon = (type) => {
    const icons = {
      success: { icon: 'fa-check-circle', color: 'text-success', bg: 'bg-success/10' },
      warning: { icon: 'fa-exclamation-triangle', color: 'text-warning', bg: 'bg-warning/10' },
      error: { icon: 'fa-times-circle', color: 'text-danger', bg: 'bg-danger/10' },
      info: { icon: 'fa-info-circle', color: 'text-info', bg: 'bg-info/10' },
    };
    return icons[type] || icons.info;
  };

  return (
    <div className="fade-in animate-slide-up">
      <div className="card-elevated p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 gradient-info rounded-2xl flex items-center justify-center shadow-lg">
              <i className="fa-solid fa-clock-rotate-left text-white text-2xl"></i>
            </div>
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold">Activity Log</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Track all actions and changes
              </p>
            </div>
          </div>
        </div>

        {/* Timeline */}
        {activityLog.length === 0 ? (
          <EmptyState 
            icon="fa-clock"
            title="No activity yet"
            description="Your actions will be recorded here."
          />
        ) : (
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-slate-700"></div>
            
            <div className="space-y-6">
              {activityLog.map((log, i) => {
                const iconConfig = getIcon(log.type);
                return (
                  <div 
                    key={i} 
                    className="relative flex gap-4 animate-slide-up"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    {/* Timeline Dot */}
                    <div className={`relative z-10 w-12 h-12 rounded-full ${iconConfig.bg} flex items-center justify-center flex-shrink-0 border-4 border-white dark:border-slate-900`}>
                      <i className={`fa-solid ${iconConfig.icon} ${iconConfig.color} text-lg`}></i>
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 card p-4 lg:p-5">
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold">{log.action}</h3>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatRelativeTime(log.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {log.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
