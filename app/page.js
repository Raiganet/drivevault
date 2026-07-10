'use client';
import { useEffect, useState, useCallback } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { useDocuments } from '@/hooks/useDocuments';
import { useResponsive } from '@/hooks/useResponsive';
import { showToast, confirmDialog } from '@/utils/helpers';
import { STORAGE_LIMIT } from '@/utils/constants';

import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Dashboard from '@/components/Dashboard';
import Upload from '@/components/Upload';
import Documents from '@/components/Documents';
import Activity from '@/components/Activity';
import { DashboardSkeleton } from '@/components/LoadingSkeleton';
import Settings from '@/components/Settings';
import PDFTools from '@/components/PDFTools';

export default function Home() {
  // Hooks
  const { isDark, isMounted, toggleTheme } = useTheme();
  const { isMobile, isTablet } = useResponsive();
  const {
    allDocs,
    filteredDocs,
    stats,
    isLoading,
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    sortFilter,
    setSortFilter,
    viewMode,
    setViewMode,
    loadDocuments,
    deleteDoc,
    bulkDelete,
    exportData,
    handleDownload,
  } = useDocuments();

  // Local State
  const [currentUser, setCurrentUser] = useState(null);
  const [activityLog, setActivityLog] = useState([]);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState(new Set());

  // Initial Load
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch(e) {
        localStorage.removeItem('currentUser');
      }
    }
  }, []);

  // Helper Functions
  const addActivity = useCallback((action, description, type = 'info') => {
    setActivityLog(prev => {
      const entry = { action, description, type, timestamp: new Date().toISOString() };
      return [entry, ...prev].slice(0, 50);
    });
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    const username = e.target.username.value;
    const password = e.target.password.value;

    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setCurrentUser(data);
        localStorage.setItem('currentUser', JSON.stringify(data));
        showToast(`Welcome back, ${data.name}!`, 'success');
        addActivity('Login', `User ${data.name} logged in`, 'success');
      } else {
        showToast(data.message || 'Login failed', 'error');
      }
    })
    .catch(err => showToast('Network error: ' + err.message, 'error'));
  };

  const handleLogout = () => {
    confirmDialog('Are you sure you want to logout?', () => {
      setCurrentUser(null);
      localStorage.removeItem('currentUser');
      showToast('Logged out successfully', 'info');
    });
  };

  const handleViewDoc = (doc) => {
    window.open(doc.url, '_blank', 'noopener,noreferrer');
    addActivity('View', `Viewed: ${doc.fileName}`, 'info');
  };

  const handleDeleteDoc = (doc) => {
    deleteDoc(doc.id, doc.fileName);
    addActivity('Delete', `Deleted: ${doc.fileName}`, 'warning');
  };

  const handleBulkDelete = (ids) => {
    bulkDelete(ids);
    addActivity('Bulk Delete', `Deleted ${ids.length} document(s)`, 'warning');
  };

  const handleExportData = () => {
    exportData();
    addActivity('Export', 'Downloaded CSV backup', 'success');
  };

  const handleUploadSuccess = () => {
    addActivity('Upload', 'Uploaded new document(s)', 'success');
  };

  // Loading State
  if (!isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-primary">
        <div className="text-center text-white">
          <i className="fa-solid fa-circle-notch fa-spin text-6xl mb-4"></i>
          <p className="text-xl font-medium">Loading DriveVault Pro...</p>
        </div>
      </div>
    );
  }

  // Login Page
  if (!currentUser) {
    return (
      <div className="fade-in min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 gradient-primary opacity-10"></div>
        <div className="absolute top-20 left-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
        
        <div className="card-elevated p-8 max-w-md w-full relative z-10 animate-scale-in">
          <div className="text-center mb-8">
            <div className="w-24 h-24 mx-auto mb-4 flex items-center justify-center shadow-2xl rounded-2xl overflow-hidden gradient-primary p-1">
              <div className="w-full h-full bg-white rounded-xl flex items-center justify-center">
                <img src="/logo.png" alt="DriveVault Logo" className="w-16 h-16 object-contain" />
              </div>
            </div>
            <h1 className="text-3xl font-bold mb-2 text-gradient">
              DriveVault Pro
            </h1>
            <p className="text-gray-500 dark:text-gray-400">Enterprise Document Management</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Username</label>
              <div className="relative">
                <i className="fa-solid fa-user absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <input 
                  type="text" 
                  name="username"
                  className="input pl-12"
                  placeholder="admin or guest" 
                  required 
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <div className="relative">
                <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <input 
                  type="password" 
                  name="password"
                  className="input pl-12"
                  placeholder="••••••••" 
                  required 
                />
              </div>
            </div>
            
            <button 
              type="submit" 
              className="btn-primary w-full py-3"
            >
              <i className="fa-solid fa-right-to-bracket"></i>
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Main App
  return (
   <div className="min-h-screen flex flex-col lg:flex-row bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors">
      {/* Sidebar */}
      <Sidebar
      activeSection={activeSection}
      setActiveSection={setActiveSection}
      currentUser={currentUser}
      stats={stats}
      onLogout={handleLogout}
      isMobile={isMobile}
      isMobileMenuOpen={isMobileMenuOpen}
      setIsMobileMenuOpen={setIsMobileMenuOpen}
      isCollapsed={isSidebarCollapsed}
      setIsCollapsed={setIsSidebarCollapsed}
    />

      {/* Main Content */}
       <main className="flex-1 flex flex-col min-h-screen lg:min-h-0 overflow-hidden">
        {/* Header */}
        <Header
        activeSection={activeSection}
        onNavigate={setActiveSection}
        onThemeToggle={toggleTheme}
        isDark={isDark}
        currentUser={currentUser}
        onLogout={handleLogout}
        searchQuery={searchTerm}
        setSearchQuery={setSearchTerm}
        onUploadClick={() => setActiveSection('upload')}
      />

        {/* Page Content */}
       <div className="flex-1 overflow-y-auto p-4 lg:p-8 pb-24 lg:pb-8">
          {isLoading && activeSection === 'dashboard' ? (
            <DashboardSkeleton />
          ) : (
            <>
              {activeSection === 'dashboard' && (
                <Dashboard
                  currentUser={currentUser}
                  stats={stats}
                  allDocs={allDocs}
                  onNavigate={setActiveSection}
                  onViewDoc={handleViewDoc}
                  onDownloadDoc={handleDownload}
                  onDeleteDoc={handleDeleteDoc}
                  onExportData={handleExportData}
                />
              )}

              {activeSection === 'upload' && (
                <Upload
                  onUploadSuccess={handleUploadSuccess}
                  onNavigate={setActiveSection}
                />
              )}

              {activeSection === 'documents' && (
                <Documents
                  filteredDocs={filteredDocs}
                  isLoading={isLoading}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  categoryFilter={categoryFilter}
                  setCategoryFilter={setCategoryFilter}
                  sortFilter={sortFilter}
                  setSortFilter={setSortFilter}
                  viewMode={viewMode}
                  setViewMode={setViewMode}
                  stats={stats}
                  currentUser={currentUser}
                  selectedDocs={selectedDocs}
                  setSelectedDocs={setSelectedDocs}
                  onViewDoc={handleViewDoc}
                  onDownloadDoc={handleDownload}
                  onDeleteDoc={handleDeleteDoc}
                  onBulkDelete={handleBulkDelete}
                />
              )}

              {activeSection === 'activity' && (
                <Activity activityLog={activityLog} />
              )}

              {activeSection === 'settings' && (
                <Settings
                  isDark={isDark}
                  onThemeToggle={toggleTheme}
                  currentUser={currentUser}
                />
              )}
{activeSection === 'pdf-tools' && (
  <PDFTools
    onToolComplete={handleUploadSuccess}
    onNavigate={setActiveSection}
  />
)}
            </>
          )}
        </div>

        {/* Mobile Bottom Navigation */}
        {isMobile && (
          <nav className="mobile-nav no-print" aria-label="Mobile navigation">
            <div className="flex justify-around items-center">
              {[
                { id: 'dashboard', icon: 'fa-chart-pie', label: 'Home' },
                { id: 'upload', icon: 'fa-cloud-arrow-up', label: 'Upload' },
                { id: 'documents', icon: 'fa-folder-open', label: 'Docs' },
                { id: 'activity', icon: 'fa-clock-rotate-left', label: 'Activity' },
                { id: 'settings', icon: 'fa-gear', label: 'Settings' },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`mobile-nav-item ${activeSection === item.id ? 'active' : ''}`}
                  aria-label={item.label}
                  aria-current={activeSection === item.id ? 'page' : undefined}
                >
                  <i className={`fa-solid ${item.icon} text-xl`}></i>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </nav>
        )}
      </main>
    </div>
  );
}
