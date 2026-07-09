'use client';
import { QUICK_ACTIONS, STORAGE_LIMIT } from '@/utils/constants';
import { formatBytes, getStoragePercentage } from '@/utils/helpers';
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Banner */}
      <div className="card-elevated p-6 lg:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 gradient-primary opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 gradient-purple opacity-10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
        <div className="relative z-10">
          <h2 className="text-2xl lg:text-3xl font-bold mb-2">
            Welcome back, <span className="text-gradient">{currentUser?.name || 'User'}</span>! 👋
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm lg:text-base">
            Here's what's happening with your documents today.
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
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
      <div className="card p-6">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <i className="fa-solid fa-bolt text-yellow-500"></i>
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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
                className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition group"
                aria-label={action.label}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorMap[action.color]} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                  <i className={`fa-solid ${action.icon} text-white text-lg`}></i>
                </div>
                <span className="text-xs font-medium text-center">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Storage & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Storage Widget */}
        <div className="card p-6">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <i className="fa-solid fa-database text-primary"></i>
            Storage Usage
          </h3>
          <div className="text-center mb-4">
            <div className="relative inline-block">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-gray-200 dark:text-slate-700"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="url(#gradient)"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${storagePercentage * 2.51} 251`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#4F46E5" />
                    <stop offset="100%" stopColor="#7C3AED" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold">{storagePercentage.toFixed(0)}%</span>
                <span className="text-xs text-gray-500">Used</span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Used</span>
              <span className="font-semibold">{stats.totalSizeFormatted}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Total</span>
              <span className="font-semibold">15 GB</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Free</span>
              <span className="font-semibold text-success">
                {formatBytes(STORAGE_LIMIT - stats.totalSize)}
              </span>
            </div>
          </div>
        </div>

        {/* Recent Documents */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2">
                <i className="fa-solid fa-clock-rotate-left text-blue-500"></i>
                Recent Documents
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Latest uploads</p>
            </div>
            <button 
              onClick={() => onNavigate('documents')}
              className="text-sm text-primary hover:text-secondary font-medium transition-colors"
            >
              View All <i className="fa-solid fa-arrow-right ml-1"></i>
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
                  className="btn-primary"
                >
                  <i className="fa-solid fa-cloud-arrow-up mr-2"></i>
                  Upload Document
                </button>
              }
            />
          ) : (
            <div className="space-y-3">
              {allDocs.slice(0, 5).map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  viewMode="list"
                  onView={onViewDoc}
                  onDownload={onDownloadDoc}
                  onDelete={onDeleteDoc}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Categories Breakdown */}
      {Object.keys(stats.categories).length > 0 && (
        <div className="card p-6">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <i className="fa-solid fa-chart-pie text-purple-500"></i>
            Categories Breakdown
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(stats.categories).map(([category, count]) => (
              <div 
                key={category}
                className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-primary transition-colors cursor-pointer"
              >
                <div className="text-2xl font-bold text-gradient mb-1">{count}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{category}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
