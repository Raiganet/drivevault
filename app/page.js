'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import DocumentStatsChart from './components/DocumentStatsChart';

export default function Home() {
  // State management
  const [isMounted, setIsMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [allDocs, setAllDocs] = useState([]);
  const [selectedDocs, setSelectedDocs] = useState(new Set());
  const [activityLog, setActivityLog] = useState([]);
  const [stats, setStats] = useState({ totalFiles: 0, totalSize: 0, totalSizeFormatted: '0 MB', categories: {} });
  const [isLoading, setIsLoading] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortFilter, setSortFilter] = useState('newest');
  const [selectedFiles, setSelectedFiles] = useState([]);

  // Filtered and sorted documents
  const filteredDocs = useMemo(() => {
    let result = [...allDocs];

    if (searchTerm) {
      result = result.filter(doc => 
        doc.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (categoryFilter) {
      result = result.filter(doc => doc.category === categoryFilter);
    }

    result.sort((a, b) => {
      switch (sortFilter) {
        case 'newest': return new Date(b.date) - new Date(a.date);
        case 'oldest': return new Date(a.date) - new Date(b.date);
        case 'name_asc': return a.fileName.localeCompare(b.fileName);
        case 'name_desc': return b.fileName.localeCompare(a.fileName);
        default: return 0;
      }
    });

    return result;
  }, [allDocs, searchTerm, categoryFilter, sortFilter]);

  // Load documents from API
  const loadDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/documents');
      const data = await res.json();
      
      if (data.success) {
        setAllDocs(data.data || []);
        setStats(data.stats || { totalFiles: 0, totalSize: 0, totalSizeFormatted: '0 MB', categories: {} });
      } else {
        showToast('Failed to load documents', 'error');
      }
    } catch (error) {
      showToast('Error: ' + error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    setIsMounted(true);
    
    const savedTheme = localStorage.getItem('theme') || 'light';
    setIsDark(savedTheme === 'dark');
    document.body.classList.remove('light', 'dark');
    document.body.classList.add(savedTheme);

    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch(e) {
        localStorage.removeItem('currentUser');
      }
    }

    loadDocuments();
  }, [loadDocuments]);

  // Helper functions
  function showToast(msg, type = 'info') {
    const t = document.createElement('div');
    const colors = { success: 'bg-green-500', error: 'bg-red-500', warning: 'bg-orange-500', info: 'bg-blue-500' };
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
    t.className = `fixed bottom-24 right-6 px-6 py-3 rounded-xl shadow-2xl z-50 fade-in text-white ${colors[type]}`;
    t.innerHTML = `<i class="fa-solid ${icons[type]} mr-2"></i>${msg}`;
    document.getElementById('toastContainer')?.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  function addActivity(action, description, type = 'info') {
    setActivityLog(prev => {
      const entry = { action, description, type, timestamp: new Date().toISOString() };
      const newLog = [entry, ...prev];
      return newLog.slice(0, 50);
    });
  }

  function toggleTheme() {
    setIsDark(prev => {
      const newTheme = !prev;
      document.body.classList.remove('light', 'dark');
      document.body.add(newTheme ? 'dark' : 'light');
      localStorage.setItem('theme', newTheme ? 'dark' : 'light');
      return newTheme;
    });
  }

  function handleLogin(e) {
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
        showToast(data.message, 'error');
      }
    })
    .catch(err => showToast('Network error', 'error'));
  }

  function logout() {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    showToast('Logged out successfully', 'info');
  }

  function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    if (files.some(f => f.size > 10 * 1024 * 1024)) {
      showToast('Maximum file size is 10MB!', 'error');
      e.target.value = '';
      setSelectedFiles([]);
      return;
    }
    setSelectedFiles(files);
  }

  function handleUpload(e) {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      showToast('Please select files!', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFiles[0]);
    formData.append('category', e.target.category.value);
    formData.append('description', e.target.description.value);
    formData.append('customName', e.target.customName.value || selectedFiles[0].name);

    fetch('/api/upload', {
      method: 'POST',
      body: formData
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        showToast('File uploaded successfully!', 'success');
        addActivity('Upload', `Uploaded: ${selectedFiles[0].name}`, 'success');
        setSelectedFiles([]);
        e.target.reset();
        loadDocuments();
        setActiveSection('documents');
      } else {
        showToast(data.message, 'error');
      }
    })
    .catch(err => showToast('Upload error', 'error'));
  }

  function deleteDoc(id, name) {
    if (!confirm(`Delete "${name}"?`)) return;

    fetch('/api/documents', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id] })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        showToast(data.message, 'success');
        addActivity('Delete', `Deleted: ${name}`, 'warning');
        loadDocuments();
      } else {
        showToast(data.message, 'error');
      }
    })
    .catch(err => showToast('Delete error', 'error'));
  }

  function exportData() {
    window.open('/api/export/csv', '_blank');
    addActivity('Export', 'Downloaded CSV backup', 'success');
    showToast('CSV downloaded!', 'success');
  }

  // Loading state
  if (!isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <i className="fa-solid fa-circle-notch fa-spin text-4xl text-blue-500 mb-4"></i>
          <p className="text-gray-600">Loading SecureVault Pro...</p>
        </div>
      </div>
    );
  }

  // Login page
  if (!currentUser) {
    return (
      <div className="fade-in min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 gradient-primary opacity-10"></div>
        <div className="card p-8 max-w-md w-full relative z-10">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">SecureVault Pro</h1>
            <p className="text-gray-500">Enterprise Document Management</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="text" name="username" placeholder="Username" className="w-full px-4 py-3 rounded-xl border border-gray-300" required />
            <input type="password" name="password" placeholder="Password" className="w-full px-4 py-3 rounded-xl border border-gray-300" required />
            <button type="submit" className="btn-primary w-full py-3 rounded-xl font-semibold text-white">Sign In</button>
          </form>
          <div className="mt-6 p-4 bg-blue-50 rounded-xl">
            <p className="text-xs text-blue-800 font-semibold">💡 Login: guest / guest123</p>
          </div>
        </div>
      </div>
    );
  }

  // Main app
  return (
    <div className="min-h-screen">
      {/* Sidebar */}
      <aside className="sidebar-desktop-only fixed left-0 top-0 h-full w-72 glass z-50 overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">SecureVault</h2>
          <p className="text-xs text-gray-500">Developed by @Raiganet</p>
        </div>
        <nav className="p-4 space-y-2">
          {['dashboard', 'upload', 'documents', 'activity', 'settings'].map(section => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`sidebar-item w-full flex items-center gap-3 px-4 py-3 text-left ${activeSection === section ? 'active' : ''}`}
            >
              <i className={`fa-solid ${section === 'dashboard' ? 'fa-chart-pie' : section === 'upload' ? 'fa-cloud-arrow-up' : section === 'documents' ? 'fa-folder-open' : section === 'activity' ? 'fa-clock-rotate-left' : 'fa-gear'} w-5`}></i>
              <span className="capitalize">{section}</span>
            </button>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
              <i className="fa-solid fa-user text-white"></i>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{currentUser.name}</p>
              <p className="text-xs text-gray-500">{currentUser.role.toUpperCase()}</p>
            </div>
          </div>
          <button onClick={logout} className="w-full px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition flex items-center justify-center gap-2">
            <i className="fa-solid fa-right-from-bracket"></i><span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content lg:ml-72 min-h-screen">
        <header className="glass sticky top-0 z-30 px-4 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold capitalize">{activeSection}</h1>
            <p className="text-sm text-gray-500">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="p-2 rounded-xl hover:bg-gray-100 transition">
              <i className={`fa-solid ${isDark ? 'fa-sun' : 'fa-moon'} text-xl`}></i>
            </button>
            <button onClick={() => setActiveSection('upload')} className="btn-primary px-4 lg:px-6 py-2.5 rounded-xl font-medium text-white flex items-center gap-2">
              <i className="fa-solid fa-plus"></i><span className="hidden sm:inline">New Upload</span>
            </button>
          </div>
        </header>

        <div className="p-4 lg:p-8">
          {/* Dashboard */}
          {activeSection === 'dashboard' && (
            <div className="space-y-6 fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center"><i className="fa-solid fa-file text-white text-xl"></i></div>
                    <span className="text-3xl font-bold">{stats.totalFiles}</span>
                  </div>
                  <p className="text-gray-500 text-sm">Total Documents</p>
                </div>
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl gradient-success flex items-center justify-center"><i className="fa-solid fa-database text-white text-xl"></i></div>
                    <span className="text-3xl font-bold">{stats.totalSizeFormatted}</span>
                  </div>
                  <p className="text-gray-500 text-sm">Storage Used</p>
                </div>
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center"><i className="fa-solid fa-tags text-white text-xl"></i></div>
                    <span className="text-3xl font-bold">{Object.keys(stats.categories).length}</span>
                  </div>
                  <p className="text-gray-500 text-sm">File Types</p>
                </div>
                <div className="card p-6 cursor-pointer hover:shadow-xl transition" onClick={exportData}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center"><i className="fa-solid fa-download text-white text-xl"></i></div>
                    <i className="fa-solid fa-arrow-right text-gray-400"></i>
                  </div>
                  <p className="text-gray-500 text-sm mb-1">Backup Data</p>
                  <p className="text-lg font-bold gradient-primary">Download CSV</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card p-6">
                  <h3 className="font-bold text-lg mb-4">Document Statistics</h3>
                  <DocumentStatsChart categories={stats.categories} isDark={isDark} />
                </div>
                <div className="card p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">Recent Documents</h3>
                    <button onClick={() => setActiveSection('documents')} className="text-blue-600 text-sm hover:underline">View All</button>
                  </div>
                  <div className="space-y-3">
                    {allDocs.slice(0, 5).map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:shadow-md transition cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center"><i className="fa-solid fa-file text-white"></i></div>
                          <div>
                            <p className="font-medium">{doc.fileName}</p>
                            <p className="text-xs text-gray-500">{doc.date}</p>
                          </div>
                        </div>
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-gray-200 rounded-lg transition">
                          <i className="fa-solid fa-external-link-alt text-gray-400"></i>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Upload */}
          {activeSection === 'upload' && (
            <div className="fade-in max-w-3xl mx-auto">
              <div className="card p-6 lg:p-8">
                <h2 className="text-2xl font-bold mb-6">Upload Documents</h2>
                <form onSubmit={handleUpload}>
                  <input type="file" onChange={handleFileSelect} className="w-full mb-4" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.csv" required />
                  <select name="category" className="w-full px-4 py-3 rounded-xl border border-gray-300 mb-4" required>
                    <option value="">Select type...</option>
                    <option value="PDF">PDF</option>
                    <option value="JPG">JPG</option>
                    <option value="PNG">PNG</option>
                    <option value="DOC">DOC</option>
                    <option value="XLS">XLS</option>
                    <option value="CSV">CSV</option>
                    <option value="Lainnya">Others</option>
                  </select>
                  <input type="text" name="customName" placeholder="File Name (optional)" className="w-full px-4 py-3 rounded-xl border border-gray-300 mb-4" />
                  <textarea name="description" placeholder="Description" rows="3" className="w-full px-4 py-3 rounded-xl border border-gray-300 mb-4"></textarea>
                  <button type="submit" className="btn-primary w-full py-3 rounded-xl font-semibold text-white">Upload</button>
                </form>
              </div>
            </div>
          )}

          {/* Documents */}
          {activeSection === 'documents' && (
            <div className="fade-in space-y-6">
              <div className="card p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search..." className="px-4 py-3 rounded-xl border border-gray-300" />
                  <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-4 py-3 rounded-xl border border-gray-300">
                    <option value="">All Types</option>
                    {Object.keys(stats.categories).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <select value={sortFilter} onChange={(e) => setSortFilter(e.target.value)} className="px-4 py-3 rounded-xl border border-gray-300">
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="name_asc">Name A-Z</option>
                    <option value="name_desc">Name Z-A</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDocs.map(doc => (
                  <div key={doc.id} className="card p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <i className="fa-solid fa-file text-2xl text-gray-500"></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{doc.fileName}</h3>
                          <p className="text-sm text-gray-500 line-clamp-2">{doc.description}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-4 pb-4 border-b border-gray-200">
                      <span><i className="fa-solid fa-tag"></i> {doc.category}</span>
                      <span><i className="fa-solid fa-database"></i> {doc.sizeFormatted}</span>
                    </div>
                    <div className="flex gap-2">
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="btn-view flex-1 px-3 py-2 rounded-lg text-sm font-medium text-center">View</a>
                      <a href={`/api/download?url=${encodeURIComponent(doc.url)}&name=${encodeURIComponent(doc.fileName)}`} target="_blank" className="btn-download flex-1 px-3 py-2 rounded-lg text-sm font-medium text-center">Download</a>
                      {currentUser.role === 'admin' && (
                        <button onClick={() => deleteDoc(doc.id, doc.fileName)} className="btn-delete px-3 py-2 rounded-lg">
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity */}
          {activeSection === 'activity' && (
            <div className="fade-in">
              <div className="card p-6">
                <h3 className="font-bold text-xl mb-6">Recent Activity</h3>
                <div className="space-y-4">
                  {activityLog.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No activity yet</p>
                  ) : (
                    activityLog.map((log, i) => (
                      <div key={i} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                          <i className={`fa-solid ${log.type === 'success' ? 'fa-check-circle text-green-500' : log.type === 'warning' ? 'fa-exclamation-triangle text-orange-500' : 'fa-info-circle text-blue-500'} text-xl`}></i>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{log.action}</p>
                          <p className="text-sm text-gray-500">{log.description}</p>
                          <p className="text-xs text-gray-400 mt-1">{new Date(log.timestamp).toLocaleString('id-ID')}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Settings */}
          {activeSection === 'settings' && (
            <div className="fade-in max-w-2xl mx-auto">
              <div className="card p-6">
                <h3 className="font-bold text-xl mb-6">Settings</h3>
                <div className="space-y-6">
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-medium">Dark Mode</p>
                      <p className="text-sm text-gray-500">Toggle theme</p>
                    </div>
                    <button onClick={toggleTheme} className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium">Toggle</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <div id="toastContainer"></div>
    </div>
  );
}