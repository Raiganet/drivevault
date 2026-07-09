'use client';
import { NAVIGATION_ITEMS, STORAGE_LIMIT } from '@/utils/constants';
import { formatBytes, getStoragePercentage, getStorageStatus } from '@/utils/helpers';

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
  const storagePercentage = getStoragePercentage(stats.totalSize, STORAGE_LIMIT);
  const storageStatus = getStorageStatus(storagePercentage);

  const handleNavClick = (id) => {
    setActiveSection(id);
    if (isMobile && setIsMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        ></div>
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed lg:static
          left-0 top-0
          h-full lg:h-screen
          ${isCollapsed ? 'w-20' : 'w-72'}
          bg-white dark:bg-slate-900
          border-r border-gray-200 dark:border-slate-800
          z-50
          transform transition-all duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col
          shadow-xl lg:shadow-none
        `}
        aria-label="Main navigation"
      >
        {/* Logo Section */}
        <div className={`p-6 border-b border-gray-200 dark:border-slate-800 ${isCollapsed ? 'px-4' : ''}`}>
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center w-full' : ''}`}>
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg flex-shrink-0">
                <img src="/logo.png" alt="DriveVault Logo" className="w-8 h-8 object-contain" />
              </div>
              {!isCollapsed && (
                <div className="animate-fade-in">
                  <h2 className="font-bold text-xl text-gradient">DriveVault</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Pro Edition</p>
                </div>
              )}
            </div>
            {isMobile && (
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition"
                aria-label="Close menu"
              >
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            )}
            {!isMobile && (
              <button 
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition hidden lg:block"
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <i className={`fa-solid fa-${isCollapsed ? 'chevron-right' : 'chevron-left'} text-sm`}></i>
              </button>
            )}
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {NAVIGATION_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`sidebar-item relative ${activeSection === item.id ? 'active' : ''} ${isCollapsed ? 'justify-center px-2' : ''}`}
              aria-label={item.label}
              aria-current={activeSection === item.id ? 'page' : undefined}
              title={isCollapsed ? item.label : undefined}
            >
              <i className={`fa-solid ${item.icon} w-5 text-center`}></i>
              {!isCollapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
        
        {/* Storage Widget */}
        {!isCollapsed && (
          <div className="px-4 py-3 mx-4 mb-4 p-4 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium flex items-center gap-2">
                <i className="fa-solid fa-database text-primary"></i>
                Storage
              </span>
              <span className={`text-xs font-semibold badge badge-${storageStatus.color}`}>
                {storageStatus.label}
              </span>
            </div>
            <div className="flex justify-between text-xs mb-2">
              <span className="text-gray-600 dark:text-gray-400">Used</span>
              <span className="font-semibold text-primary">
                {stats.totalSizeFormatted} / 15 GB
              </span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-bar-fill" 
                style={{ width: `${storagePercentage}%` }}
                role="progressbar"
                aria-valuenow={storagePercentage}
                aria-valuemin={0}
                aria-valuemax={100}
              ></div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {formatBytes(STORAGE_LIMIT - stats.totalSize)} remaining
            </p>
          </div>
        )}
        
        {/* User Profile & Logout */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-800">
          <div className={`flex items-center gap-3 mb-3 ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
              <i className="fa-solid fa-user text-white"></i>
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0 animate-fade-in">
                <p className="font-medium text-sm truncate">{currentUser?.name || 'User'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                  {currentUser?.role || 'guest'}
                </p>
              </div>
            )}
          </div>
          <button 
            onClick={onLogout}
            className={`btn-danger w-full ${isCollapsed ? 'px-2' : ''}`}
            aria-label="Logout"
            title={isCollapsed ? 'Logout' : undefined}
          >
            <i className="fa-solid fa-right-from-bracket"></i>
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
