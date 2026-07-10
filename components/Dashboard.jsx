'use client';
import { QUICK_ACTIONS, STORAGE_LIMIT } from '@/utils/constants';
import { formatBytes, getStoragePercentage, getFileIcon, getFileColor, formatRelativeTime, truncateText } from '@/utils/helpers';
import StatCard from './StatCard';
import DocumentCard from './DocumentCard';
import EmptyState from './EmptyState';

export default function Dashboard({ 
  currentUser, 
  stats, 
  allDocs,
  onNavigate,
  onViewDoc,
  onDownloadDoc,
  onDeleteDoc,
  onExportData
}) {
  const storagePercentage = getStoragePercentage(stats.totalSize, STORAGE_LIMIT);

  const handleQuickAction = (actionId) => {
    switch (actionId) {
      case 'upload':
        onNavigate('upload');
        break;
      case 'export':
        onExportData();
        break;
      default:
        // Handle other actions
        break;
    }
  };

  const gradientMap = {
    primary: 'from-indigo-500 to-purple-500',
    secondary: 'from-gray-500 to-gray-600',
    success: 'from-emerald-500 to-teal-500',
    warning: 'from-amber-500 to-orange-500',
    danger: 'from-red-500 to-pink-500',
    info: 'from-blue-500 to-cyan-500',
    purple: 'from-purple-500 to-pink-500',
    pink: 'from-pink-500 to-rose-500',
  };

  return (
    <div className="space-y-4 lg:space-y-6 animate-fade-in">
   {/* Welcome Banner dengan gradient */}
<div className="card-elevated p-4 lg:p-8 relative overflow-hidden">
  {/* Animated gradient background */}
  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 animate-pulse"></div>
  <div className="absolute top-0 right-0 w-32 h-32 lg:w-64 lg:h-64 gradient-primary opacity-20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
  <div className="absolute bottom-0 left-0 w-24 h-24 lg:w-48 lg:h-48 gradient-purple opacity-20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
  <div className="relative z-10">
    <h2 className="text-xl lg:text-3xl font-bold mb-2">
      Welcome back, <span className="text-gradient">{currentUser?.name || 'User'}</span>! 👋
    </h2>
    <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-400">
      Here's what's happening with your documents today.
    </p>
  </div>
</div>

      {/* Statistics Cards - Grid 2x2 di Mobile, 4 kolom di Desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
        <StatCard 
          icon="fa-file-lines"
          label="Total Documents"
          value={stats.totalFiles}
          subtitle="All uploaded files"
          gradient="gradient-primary"
          trend="up"
          trendValue="12%"
        />
        <StatCard 
          icon="fa-database"
          label="Storage Used"
          value={stats.totalSizeFormatted}
          subtitle={`of 15 GB (${storagePercentage.toFixed(1)}%)`}
          gradient="gradient-success"
        />
        <StatCard 
          icon="fa-layer-group"
          label="File Types"
          value={Object.keys(stats.categories).length}
          subtitle="Categories"
          gradient="gradient-warning"
        />
        <StatCard 
          icon="fa-cloud-arrow-down"
          label="Quick Export"
          value="CSV"
          subtitle="Click to backup data"
          gradient="gradient-purple"
          onClick={onExportData}
        />
      </div>

      {/* Quick Actions */}
      <div className="card p-4 lg:p-6">
        <h3 className="font-bold text-sm lg:text-lg mb-4 flex items-center gap-2">
          <i className="fa-solid fa-bolt text-yellow-500"></i>
          Quick Actions
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2 lg:gap-3">
          {QUICK_ACTIONS.map(action => {
            const colorMap = {
              primary: 'from-indigo-500 to-purple-500',
              info: 'from-blue-500 to-cyan-500',
              success: 'from-emerald-500 to-teal-500',
              warning: 'from-amber-500 to-orange-500',
              purple: 'from-purple-500 to-pink-500',
              pink: 'from-pink-500 to-rose-500',
            };
            return (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action.id)}
                className="flex flex-col items-center gap-1.5 lg:gap-2 p-3 lg:p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition group"
                aria-label={action.label}
              >
                <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br ${colorMap[action.color]} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                  <i className={`fa-solid ${action.icon} text-white text-sm lg:text-lg`}></i>
                </div>
                <span className="text-xs font-medium text-center">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Storage & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Storage Widget */}
        {/* Document Statistics - Pie Chart */}
<div className="card p-4 lg:p-6">
  <h3 className="font-bold text-sm lg:text-lg mb-4 flex items-center gap-2">
    <i className="fa-solid fa-chart-pie text-purple-500"></i>
    Document Statistics
  </h3>
  
  {Object.keys(stats.categories).length === 0 ? (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center mb-3">
        <i className="fa-solid fa-chart-pie text-4xl text-gray-400"></i>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center">No documents yet</p>
    </div>
  ) : (
    <>
      {/* Pie Chart */}
      <div className="relative w-48 h-48 mx-auto mb-4">
        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
          {(() => {
            const categories = Object.entries(stats.categories);
            const total = categories.reduce((sum, [, count]) => sum + count, 0);
            const colors = ['#3B82F6', '#A855F7', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1'];
            let currentAngle = 0;
            
            return categories.map(([category, count], index) => {
              const percentage = (count / total) * 100;
              const angle = (percentage / 100) * 360;
              const x1 = 50 + 40 * Math.cos((currentAngle * Math.PI) / 180);
              const y1 = 50 + 40 * Math.sin((currentAngle * Math.PI) / 180);
              const x2 = 50 + 40 * Math.cos(((currentAngle + angle) * Math.PI) / 180);
              const y2 = 50 + 40 * Math.sin(((currentAngle + angle) * Math.PI) / 180);
              const largeArcFlag = angle > 180 ? 1 : 0;
              
              const pathData = [
                `M 50 50`,
                `L ${x1} ${y1}`,
                `A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                `Z`
              ].join(' ');
              
              const segment = (
                <path
                  key={category}
                  d={pathData}
                  fill={colors[index % colors.length]}
                  stroke="white"
                  strokeWidth="2"
                  className="dark:stroke-slate-900"
                >
                  <title>{category}: {count} files ({percentage.toFixed(1)}%)</title>
                </path>
              );
              
              currentAngle += angle;
              return segment;
            });
          })()}
          
          {/* Center Circle */}
          <circle cx="50" cy="50" r="25" className="fill-white dark:fill-slate-900" />
        </svg>
        
        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalFiles}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">Total</span>
        </div>
      </div>
      
      {/* Legend */}
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(stats.categories).map(([category, count], index) => {
          const colors = ['bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500', 'bg-red-500', 'bg-pink-500', 'bg-indigo-500'];
          return (
            <div key={category} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`}></div>
              <span className="text-xs text-gray-600 dark:text-gray-400 flex-1">{category}</span>
              <span className="text-xs font-semibold text-gray-900 dark:text-white">{count}</span>
            </div>
          );
        })}
      </div>
    </>
  )}
</div>

        {/* Recent Documents - Compact */}
        <div className="card p-4 lg:p-6 lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-sm lg:text-lg flex items-center gap-2">
                <i className="fa-solid fa-clock-rotate-left text-blue-500"></i>
                Recent Documents
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Latest uploads</p>
            </div>
            <button 
              onClick={() => onNavigate('documents')}
              className="text-xs lg:text-sm text-primary hover:text-secondary font-medium transition-colors"
            >
              View All <i className="fa-solid fa-arrow-right ml-1 hidden sm:inline"></i>
            </button>
          </div>
          
          {allDocs.length === 0 ? (
            <EmptyState 
              icon="fa-folder-open"
              title="No documents yet"
              description="Upload your first document to get started."
              action={
                <button 
                  onClick={() => onNavigate('upload')}
                  className="btn-primary text-sm"
                >
                  <i className="fa-solid fa-cloud-arrow-up mr-2"></i>
                  Upload Document
                </button>
              }
            />
          ) : (
            <div className="space-y-2">
              {allDocs.slice(0, 5).map((doc) => (
                <div 
                  key={doc.id}
                  className="flex items-center gap-2.5 lg:gap-3 p-2.5 lg:p-3 bg-gray-50 dark:bg-slate-800 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition cursor-pointer"
                  onClick={() => onViewDoc && onViewDoc(doc)}
                >
                  {/* Icon */}
                  <div className={`w-9 h-9 lg:w-10 lg:h-10 rounded-lg bg-gradient-to-br ${gradientMap[getFileColor(doc.fileName)]} flex items-center justify-center flex-shrink-0`}>
                    <i className={`fa-solid ${getFileIcon(doc.fileName)} text-white text-xs lg:text-sm`}></i>
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-xs lg:text-sm truncate">{truncateText(doc.fileName, 25)}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {doc.sizeFormatted} • {formatRelativeTime(doc.date)}
                    </p>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-1.5">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDownloadDoc && onDownloadDoc(doc); }}
                      className="p-1.5 lg:p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition"
                      aria-label="Download"
                    >
                      <i className="fa-solid fa-download text-xs"></i>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onViewDoc && onViewDoc(doc); }}
                      className="p-1.5 lg:p-2 rounded-lg bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 transition"
                      aria-label="View"
                    >
                      <i className="fa-solid fa-eye text-xs"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Categories Breakdown */}
      {Object.keys(stats.categories).length > 0 && (
        <div className="card p-4 lg:p-6">
          <h3 className="font-bold text-sm lg:text-lg mb-4 flex items-center gap-2">
            <i className="fa-solid fa-chart-pie text-purple-500"></i>
            Categories Breakdown
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 lg:gap-3">
            {Object.entries(stats.categories).map(([category, count]) => (
              <div 
                key={category}
                className="p-3 lg:p-4 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-primary transition-colors cursor-pointer"
              >
                <div className="text-xl lg:text-2xl font-bold text-gradient mb-1">{count}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{category}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
