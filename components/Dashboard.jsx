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
      {/* ======================= FLOATING BACKGROUND ======================= */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-violet-500/10 blur-[150px] rounded-full"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-cyan-400/10 blur-[150px] rounded-full"></div>
      </div>
      {/* ======================= END FLOATING BACKGROUND ======================= */}

      {/* ======================= HERO PREMIUM V2 ======================= */}
      <div className="relative overflow-hidden rounded-[32px] border border-white/30 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl shadow-[0_20px_60px_rgba(124,58,237,.15)]">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-cyan-500/10"></div>
        <div className="absolute -top-24 -right-20 w-80 h-80 rounded-full bg-violet-500/20 blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-cyan-400/20 blur-3xl"></div>

        <div className="relative z-10 p-6 lg:p-10">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            {/* LEFT */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 text-sm font-semibold mb-6">
                <i className="fa-solid fa-shield-halved"></i>
                DriveVault Enterprise
              </div>

              <h1 className="text-3xl lg:text-5xl font-black leading-tight">
                Welcome Back,
                <br />
                <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-sky-500 bg-clip-text text-transparent">
                  {currentUser?.name || "User"}
                </span>
                👋
              </h1>

              <p className="mt-5 text-gray-600 dark:text-gray-300 text-base lg:text-lg max-w-xl">
                Manage your documents securely, collaborate faster, and access your files anytime from anywhere.
              </p>

              {/* STORAGE */}
              <div className="rounded-3xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-blue-600 text-white p-8 shadow-2xl mt-6">
                <h3 className="font-bold text-xl mb-6">Storage Analytics</h3>
                <div className="mb-5">
                  <div className="flex justify-between mb-2">
                    <span>Used Space</span>
                    <span>{storagePercentage.toFixed(1)}%</span>
                  </div>
                  <div className="h-4 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full"
                      style={{ width: `${storagePercentage}%` }}
                    ></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <div className="text-3xl font-black">{stats.totalSizeFormatted}</div>
                    <div className="text-white/70">Current</div>
                  </div>
                  <div>
                    <div className="text-3xl font-black">{formatBytes(STORAGE_LIMIT)}</div>
                    <div className="text-white/70">Maximum</div>
                  </div>
                </div>
              </div>

              {/* BUTTON */}
              <div className="flex flex-wrap gap-4 mt-8">
                <button
                  onClick={() => onNavigate('upload')}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white font-semibold shadow-xl hover:scale-105 transition-all"
                >
                  <i className="fa-solid fa-cloud-arrow-up mr-2"></i>
                  Upload Document
                </button>
                <button
                  onClick={() => onNavigate('documents')}
                  className="px-6 py-3 rounded-2xl border border-violet-300 dark:border-violet-700 hover:bg-violet-50 dark:hover:bg-slate-800 transition"
                >
                  <i className="fa-solid fa-folder-open mr-2"></i>
                  Browse Files
                </button>
              </div>
            </div>

            {/* RIGHT */}
            <div>
              <div className="grid grid-cols-2 gap-5">
                <div className="rounded-3xl bg-white dark:bg-slate-800 shadow-lg p-6">
                  <div className="text-violet-600 text-3xl mb-3">
                    <i className="fa-solid fa-file-lines"></i>
                  </div>
                  <h2 className="text-3xl font-black">{stats.totalFiles}</h2>
                  <p className="text-gray-500">Documents</p>
                </div>
                <div className="rounded-3xl bg-white dark:bg-slate-800 shadow-lg p-6">
                  <div className="text-fuchsia-600 text-3xl mb-3">
                    <i className="fa-solid fa-layer-group"></i>
                  </div>
                  <h2 className="text-3xl font-black">{Object.keys(stats.categories).length}</h2>
                  <p className="text-gray-500">Categories</p>
                </div>
                <div className="rounded-3xl bg-white dark:bg-slate-800 shadow-lg p-6">
                  <div className="text-cyan-600 text-3xl mb-3">
                    <i className="fa-solid fa-hard-drive"></i>
                  </div>
                  <h2 className="text-3xl font-black">{storagePercentage.toFixed(0)}%</h2>
                  <p className="text-gray-500">Used</p>
                </div>
                <div className="rounded-3xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-xl p-6">
                  <div className="text-3xl mb-3">
                    <i className="fa-solid fa-lock"></i>
                  </div>
                  <h2 className="font-bold text-lg">Protected</h2>
                  <p className="opacity-80 text-sm">Enterprise Security</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* ======================= END HERO ======================= */}

      {/* ======================= PREMIUM STATISTICS ======================= */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard
          icon="fa-file-lines"
          label="Documents"
          value={stats.totalFiles}
          subtitle="All uploaded files"
          gradient="gradient-primary"
          trend="up"
          trendValue="+12%"
        />
        <StatCard
          icon="fa-hard-drive"
          label="Storage"
          value={stats.totalSizeFormatted}
          subtitle={`${storagePercentage.toFixed(1)}% Used`}
          gradient="gradient-success"
          trend="up"
          trendValue={`${storagePercentage.toFixed(0)}%`}
        />
        <StatCard
          icon="fa-layer-group"
          label="Categories"
          value={Object.keys(stats.categories).length}
          subtitle="Document Types"
          gradient="gradient-warning"
          trend="up"
          trendValue={`${Object.keys(stats.categories).length}`}
        />
        <StatCard
          icon="fa-cloud-arrow-down"
          label="Backup"
          value="CSV"
          subtitle="Export your data"
          gradient="gradient-purple"
          onClick={onExportData}
        />
      </div>
      {/* ======================= END PREMIUM STATS ======================= */}

      {/* ================= PREMIUM QUICK ACTION ================= */}
      <div className="rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/30 dark:border-slate-700 shadow-[0_15px_50px_rgba(124,58,237,.08)] p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center text-white shadow-lg">
                <i className="fa-solid fa-bolt"></i>
              </div>
              Quick Actions
            </h3>
            <p className="text-sm text-gray-500 mt-1">Frequently used features</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
          {QUICK_ACTIONS.map((action) => {
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
                className="group relative overflow-hidden rounded-3xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-5 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(124,58,237,.15)]"
              >
                <div
                  className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition bg-gradient-to-br ${colorMap[action.color]}`}
                ></div>
                <div
                  className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${colorMap[action.color]} flex items-center justify-center text-white shadow-xl mb-5 group-hover:scale-110 group-hover:rotate-6 transition-all`}
                >
                  <i className={`fa-solid ${action.icon} text-xl`}></i>
                </div>
                <h4 className="font-bold text-sm lg:text-base mb-1">{action.label}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">Click to continue</p>
                <div className="mt-4 flex justify-end">
                  <i className="fa-solid fa-arrow-right text-violet-500 group-hover:translate-x-2 transition-transform"></i>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      {/* ================= END QUICK ACTION ================= */}

      {/* Storage & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
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
