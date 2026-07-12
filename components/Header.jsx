'use client';
import { useState, useRef, useEffect } from 'react';

export default function Header({ 
  activeSection, 
  onNavigate,
  onThemeToggle, 
  isDark,
  currentUser,
  onLogout,
  searchQuery,
  setSearchQuery,
  onUploadClick,
  isMobile,
  setIsMobileMenuOpen
}) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);

  const today = new Date().toLocaleDateString('id-ID', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="glass-strong sticky top-0 z-30 border-b border-gray-200 dark:border-slate-800 animate-slide-down">
      <div className="px-4 lg:px-8 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left Section - Mobile Menu Button + Page Title */}
          <div className="flex items-center gap-4 flex-1">
            {/* Hamburger Menu Button (Mobile Only) */}
            {isMobile && (
              <button 
                onClick={() => setIsMobileMenuOpen && setIsMobileMenuOpen(true)}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition"
                aria-label="Open menu"
              >
                <i className="fa-solid fa-bars text-xl"></i>
              </button>
            )}
            
            <div>
              <h1 className="text-2xl font-bold capitalize text-gray-900 dark:text-white">
                {activeSection}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {today}
              </p>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2 lg:gap-3">
            {/* Theme Toggle */}
            <button 
              onClick={onThemeToggle}
              className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition relative group"
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDark ? 'Light Mode' : 'Dark Mode'}
            >
              <i className={`fa-solid ${isDark ? 'fa-sun text-yellow-500' : 'fa-moon text-indigo-500'} text-lg group-hover:rotate-12 transition-transform`}></i>
            </button>

            {/* Notifications */}
            <button 
              className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition relative"
              aria-label="Notifications"
            >
              <i className="fa-regular fa-bell text-lg"></i>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            </button>

            {/* Upload Button */}
            <button 
              onClick={onUploadClick}
              className="btn-primary hidden sm:flex"
              aria-label="New Upload"
            >
              <i className="fa-solid fa-plus"></i>
              <span className="hidden lg:inline">New Upload</span>
            </button>

            {/* Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-3 p-1.5 pr-3 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition"
                aria-label="User menu"
                aria-expanded={isProfileOpen}
              >
                <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center">
                  <i className="fa-solid fa-user text-white text-sm"></i>
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-sm font-semibold leading-tight">{currentUser?.name || 'User'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase leading-tight">
                    {currentUser?.role || 'guest'}
                  </p>
                </div>
                <i className="fa-solid fa-chevron-down text-xs text-gray-400 hidden lg:block"></i>
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-gray-200 dark:border-slate-800 animate-scale-in overflow-hidden">
                  <div className="p-4 border-b border-gray-200 dark:border-slate-800">
                    <p className="font-semibold text-sm">{currentUser?.name || 'User'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{currentUser?.email || 'user@example.com'}</p>
                  </div>
                  <div className="p-2">
                    <button 
                      onClick={() => { onNavigate && onNavigate('settings'); setIsProfileOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition text-sm"
                    >
                      <i className="fa-solid fa-gear text-gray-400"></i>
                      Settings
                    </button>
                    <button 
                      onClick={() => { onNavigate && onNavigate('activity'); setIsProfileOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition text-sm"
                    >
                      <i className="fa-solid fa-clock-rotate-left text-gray-400"></i>
                      Activity Log
                    </button>
                  </div>
                  <div className="p-2 border-t border-gray-200 dark:border-slate-800">
                    <button 
                      onClick={() => { onLogout(); setIsProfileOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition text-sm text-red-600"
                    >
                      <i className="fa-solid fa-right-from-bracket"></i>
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
