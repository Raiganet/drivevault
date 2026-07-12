'use client';
import { NAVIGATION_ITEMS, APP_NAME } from '@/utils/constants';
import { formatBytes, getStoragePercentage } from '@/utils/helpers';
import { STORAGE_LIMIT } from '@/utils/constants';

export default function Sidebar({ 
  activeSection, 
  setActiveSection, 
  currentUser, 
  stats, 
  onLogout,
  isMobile,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  isCollapsed,
  setIsCollapsed
}) {
  const storagePercentage = getStoragePercentage(stats?.totalSize || 0, STORAGE_LIMIT);

  const handleNavigation = (sectionId) => {
    setActiveSection(sectionId);
    if (isMobile && setIsMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        ></div>
      )}

      {/* Sidebar - Purple Tinted Background */}
      <aside 
        className={`
          fixed lg:sticky top-0 left-0 z-50 h-screen
          w-64
          transform transition-transform duration-300 ease-in-out
          ${isMobile ? (isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'}
          bg-gradient-to-b from-violet-50 via-purple-50 to-fuchsia-50 dark:from-slate-900 dark:via-purple-950/30 dark:to-slate-900 backdrop-blur-xl
          border-r border-violet-200/50 dark:border-violet-800/30
          shadow-xl lg:shadow-none
          flex flex-col
        `}
        aria-label="Main navigation"
      >
        {/* Logo Section */}
        <div className={`p-6 border-b border-violet-200/50 dark:border-violet-800/30 ${isCollapsed ? 'px-4' : ''}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 flex items-center justify-center shadow-lg overflow-hidden">
                <img 
                  src="/logo.png" 
                  alt="DriveVault Logo" 
                  className="w-8 h-8 object-contain"
                  onError={(e) => { 
                    e.target.style.display = 'none'; 
                    const fallback = e.target.nextSibling;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <i 
                  className="fa-solid fa-vault text-white text-lg" 
                  style={{ display: 'none' }}
                ></i>
              </div>
              {!isCollapsed && (
                <div>
                  <h1 className="font-bold text-lg bg-gradient-to-r from-violet-700 to-fuchsia-600 bg-clip-text text-transparent">{APP_NAME}</h1>
                  <p className="text-xs text-violet-600/70 dark:text-violet-400/70">Enterprise</p>
                </div>
              )}
            </div>
            {!isMobile && (
              <button 
                onClick={() => setIsCollapsed && setIsCollapsed(!isCollapsed)}
                className="p-2 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/30 transition hidden lg:block"
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <i className={`fa-solid ${isCollapsed ? 'fa-angles-right' : 'fa-angles-left'} text-violet-600 dark:text-violet-400`}></i>
              </button>
            )}
            {isMobile && (
              <button 
                onClick={() => setIsMobileMenuOpen && setIsMobileMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/30 transition"
                aria-label="Close menu"
              >
                <i className="fa-solid fa-xmark text-violet-600 dark:text-violet-400"></i>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {NAVIGATION_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.id)}
              className={`
                group
                relative
                w-full
                flex
                items-center
                gap-4
                px-5
                py-3.5
                rounded-2xl
                font-medium
                transition-all
                duration-300
                ${
                  activeSection === item.id
                    ? 'bg-gradient-to-r from-violet-600 via-fuchsia-500 to-blue-500 text-white shadow-[0_15px_40px_rgba(124,58,237,.35)]'
                    : 'text-violet-700 dark:text-violet-300 hover:bg-violet-100/70 dark:hover:bg-violet-900/30 hover:translate-x-1'
                }
              `}
              aria-current={activeSection === item.id ? 'page' : undefined}
              title={isCollapsed ? item.label : ''}
            >
              {/* Icon Container */}
              <div
                className={`
                  w-10
                  h-10
                  rounded-xl
                  flex
                  items-center
                  justify-center
                  transition-all
                  ${
                    activeSection === item.id
                      ? 'bg-white/20'
                      : 'bg-violet-100/70 dark:bg-violet-900/40 group-hover:bg-violet-200/70 dark:group-hover:bg-violet-800/50'
                  }
                `}
              >
                <i className={`fa-solid ${item.icon} text-violet-600 dark:text-violet-400 group-hover:text-violet-700 dark:group-hover:text-violet-300`}></i>
              </div>

              {/* Label */}
              {!isCollapsed && (
                <span className="font-medium text-sm">{item.label}</span>
              )}

              {/* Active Indicator */}
              {activeSection === item.id && !isCollapsed && (
                <div className="ml-auto">
                  <i className="fa-solid fa-chevron-right text-xs"></i>
                </div>
              )}
            </button>
          ))}
        </nav>

        {/* Storage Widget - Premium Gradient */}
        {!isCollapsed && (
          <div className="mt-auto p-4">
            <div className="rounded-3xl bg-gradient-to-br from-violet-600 to-blue-600 text-white p-5 shadow-lg">
              <div className="flex justify-between mb-2">
                <span className="font-medium">Storage</span>
                <span className="font-bold">{storagePercentage.toFixed(0)}%</span>
              </div>
              <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all"
                  style={{ width: `${storagePercentage}%` }}
                ></div>
              </div>
              <div className="mt-3 text-sm opacity-90 font-medium">
                {stats.totalSizeFormatted}
              </div>
            </div>
          </div>
        )}

        {/* User Profile & Logout */}
        <div className="p-4 border-t border-violet-200/50 dark:border-violet-800/30">
          <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-500 flex items-center justify-center shadow-lg">
              <i className="fa-solid fa-user text-white"></i>
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate text-violet-900 dark:text-violet-100">{currentUser?.name || 'User'}</p>
                <p className="text-xs text-violet-600/70 dark:text-violet-400/70 uppercase">
                  {currentUser?.role || 'guest'}
                </p>
              </div>
            )}
          </div>
          
          {!isCollapsed && (
            <button 
              onClick={onLogout}
              className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition font-medium text-sm"
            >
              <i className="fa-solid fa-right-from-bracket"></i>
              Logout
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
