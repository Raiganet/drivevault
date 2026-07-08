'use client';
import { useEffect, useState } from 'react';

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    let currentUser = null;
    let allDocs = [];
    let filteredDocs = [];
    let selectedDocs = new Set();
    let selectedFiles = [];
    let activityLog = [];
    let statsChart = null;
    let isLoading = false;
    const IDLE_TIMEOUT = 10 * 60 * 1000;
    let idleTimer = null;
    let logoutReason = 'manual';

    function getElement(id) { return document.getElementById(id); }
    function safeSetTextContent(id, text) { const el = getElement(id); if (el) el.textContent = text; }

    async function apiCall(endpoint, method = 'GET', body = null) {
      const opts = { method, headers: {} };
      if (body) {
        if (body instanceof FormData) opts.body = body;
        else { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
      }
      const res = await fetch(endpoint, opts);
      return res.json();
    }

    function resetIdleTimer() {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => autoLogout(), IDLE_TIMEOUT);
    }
    function autoLogout() { logoutReason = 'auto'; logout(); }
    function setupIdleListeners() {
      ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click', 'keydown'].forEach(event => {
        document.addEventListener(event, resetIdleTimer, true);
      });
    }

    function toggleTheme() {
      const body = document.body;
      const isDark = body.classList.contains('dark');
      if (isDark) {
        body.classList.remove('dark'); body.classList.add('light');
        localStorage.setItem('theme', 'light');
        getElement('themeIconSun')?.classList.remove('hidden');
        getElement('themeIconMoon')?.classList.add('hidden');
      } else {
        body.classList.remove('light'); body.classList.add('dark');
        localStorage.setItem('theme', 'dark');
        getElement('themeIconSun')?.classList.add('hidden');
        getElement('themeIconMoon')?.classList.remove('hidden');
      }
      if (statsChart) {
        const categories = {};
        allDocs.forEach(d => { categories[d.category] = (categories[d.category] || 0) + 1; });
        setTimeout(() => renderStatsChart(categories), 100);
      }
    }

    function showToast(msg, type='info') {
      const container = getElement('toastContainer');
      if (!container) return;
      const t = document.createElement('div');
      const colors = { success: 'bg-green-500', error: 'bg-red-500', warning: 'bg-orange-500', info: 'bg-blue-500' };
      const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
      t.className = `fixed bottom-24 right-6 px-6 py-3 rounded-xl shadow-2xl z-50 fade-in text-white ${colors[type]}`;
      t.innerHTML = `<i class="fa-solid ${icons[type]} mr-2"></i>${msg}`;
      container.appendChild(t);
      setTimeout(() => t.remove(), 3000);
    }

    async function handleLogin(e) {
      e.preventDefault();
      const u = getElement('username').value;
      const p = getElement('password').value;
      const loginBtn = getElement('loginBtn');
      const loginText = getElement('loginText');
      const loginLoader = getElement('loginLoader');
      if (loginBtn) loginBtn.disabled = true;
      if (loginText) loginText.textContent = 'Signing in...';
      if (loginLoader) loginLoader.classList.remove('hidden');
      
      try {
        const res = await apiCall('/api/auth/login', 'POST', { username: u, password: p });
        if (loginBtn) loginBtn.disabled = false;
        if (loginText) loginText.textContent = 'Sign In';
        if (loginLoader) loginLoader.classList.add('hidden');
        
        if (res.success) {
          currentUser = res;
          localStorage.setItem('currentUser', JSON.stringify(res));
          logoutReason = 'manual';
          showMainApp();
          showToast(`Welcome back, ${res.name}!`, 'success');
          addActivity('Login', `User ${res.name} logged in`, 'success');
        } else {
          Swal.fire({ icon: 'error', title: 'Login Failed!', text: res.message });
        }
      } catch (error) {
        if (loginBtn) loginBtn.disabled = false;
        if (loginText) loginText.textContent = 'Sign In';
        if (loginLoader) loginLoader.classList.add('hidden');
        showToast('Network error', 'error');
      }
    }

    function showMainApp() {
      getElement('login-page')?.classList.add('hidden');
      getElement('main-app')?.classList.remove('hidden');
      safeSetTextContent('sidebarUserName', currentUser.name);
      safeSetTextContent('sidebarUserRole', currentUser.role.toUpperCase());
      safeSetTextContent('mobileUserName', currentUser.name);
      safeSetTextContent('mobileUserRole', currentUser.role.toUpperCase());
      showSection('dashboard');
      setupIdleListeners();
      resetIdleTimer();
      document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'u') { e.preventDefault(); showSection('upload'); }
        if (e.ctrlKey && e.key === 'f') { e.preventDefault(); const s = getElement('searchInput'); if (s) s.focus(); }
      });
    }

    function showSection(sec) {
      ['dashboard', 'upload', 'documents', 'activity', 'settings'].forEach(s => {
        getElement(s + '-section')?.classList.add('hidden');
      });
      getElement(sec + '-section')?.classList.remove('hidden');
      const titles = { dashboard: 'Dashboard', upload: 'Upload', documents: 'Documents', activity: 'Activity Log', settings: 'Settings' };
      safeSetTextContent('pageTitle', titles[sec] || sec);
      document.querySelectorAll('.sidebar-item').forEach(item => { item.classList.remove('active'); });
      if (sec === 'dashboard') { isLoading = false; setTimeout(() => loadDocuments(), 50); }
      else if (sec === 'documents') { if (!isLoading) { isLoading = true; loadDocuments(); } }
      if (sec === 'activity') renderActivityLog();
    }

    function openSidebar() {
      const sidebar = getElement('mobileSidebar');
      const overlay = getElement('overlay');
      if (sidebar) {
        sidebar.style.transform = 'translateX(0)';
        overlay?.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
      }
    }
    function closeSidebar() {
      const sidebar = getElement('mobileSidebar');
      const overlay = getElement('overlay');
      if (sidebar) {
        sidebar.style.transform = 'translateX(-100%)';
        overlay?.classList.add('hidden');
        document.body.style.overflow = '';
      }
    }

    function formatBytes(b) {
      if(b===0) return '0 Bytes';
      const k=1024; const s=['Bytes','KB','MB','GB'];
      const i=Math.floor(Math.log(b)/Math.log(k));
      return Math.round(b/Math.pow(k,i)*100)/100+' '+s[i];
    }

    function previewFiles() {
      const input = getElement('fileInput');
      const preview = getElement('filePreview');
      if (!input || !preview) return;
      selectedFiles = Array.from(input.files);
      if (selectedFiles.some(f => f.size > 10*1024*1024)) {
        showToast('Maximum file size is 10MB!', 'error');
        input.value = ''; selectedFiles = []; return;
      }
      preview.innerHTML = selectedFiles.map((f, i) => `
        <div class="flex items-center gap-3 p-3 bg-white rounded-lg">
          <i class="fa-solid fa-file text-2xl text-blue-500"></i>
          <div class="flex-1 min-w-0"><p class="font-medium truncate">${f.name}</p><p class="text-sm text-gray-500">${formatBytes(f.size)}</p></div>
          <button type="button" onclick="window.removeFile(${i})" class="text-red-500 hover:text-red-700"><i class="fa-solid fa-xmark"></i></button>
        </div>`).join('');
      if (selectedFiles.length > 0) {
        const ext = selectedFiles[0].name.split('.').pop().toLowerCase();
        const map = {pdf:'PDF',jpg:'JPG',jpeg:'JPG',png:'PNG',doc:'DOC',docx:'DOC',xls:'XLS',xlsx:'XLS',csv:'CSV'};
        getElement('category').value = map[ext] || 'Lainnya';
      }
    }

    function removeFile(index) {
      selectedFiles.splice(index, 1);
      const input = getElement('fileInput');
      if (!input) return;
      const dt = new DataTransfer();
      selectedFiles.forEach(f => dt.items.add(f));
      input.files = dt.files;
      previewFiles();
    }

    async function handleUpload(e) {
      e.preventDefault();
      if (selectedFiles.length === 0) { showToast('Please select files!', 'error'); return; }
      getElement('btnText').textContent = `Uploading ${selectedFiles.length} file(s)...`;
      getElement('btnLoader')?.classList.remove('hidden');
      let uploadedCount = 0;
      
      async function uploadNext(index = 0) {
        if (index >= selectedFiles.length) {
          getElement('btnText').textContent = 'Upload Documents';
          getElement('btnLoader')?.classList.add('hidden');
          showToast(`Uploaded ${uploadedCount} file(s) successfully!`, 'success');
          addActivity('Upload', `Uploaded ${uploadedCount} document(s)`, 'success');
          getElement('uploadForm')?.reset();
          getElement('filePreview').innerHTML = '';
          selectedFiles = [];
          setTimeout(() => showSection('documents'), 1500);
          return;
        }
        const file = selectedFiles[index];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', getElement('category').value);
        formData.append('description', getElement('description').value);
        formData.append('customName', getElement('customName').value || file.name);
        try {
          const res = await apiCall('/api/upload', 'POST', formData);
          if (res.success) uploadedCount++;
          else showToast(res.message, 'error');
        } catch (err) { showToast('Upload error', 'error'); }
        uploadNext(index + 1);
      }
      uploadNext();
    }

    async function loadDocuments() {
      try {
        const res = await apiCall('/api/documents');
        isLoading = false;
        if (res && res.success) {
          allDocs = res.data || [];
          filteredDocs = [...allDocs];
          safeSetTextContent('stat-total', res.stats.totalFiles || 0);
          safeSetTextContent('stat-size', res.stats.totalSizeFormatted || '0 MB');
          safeSetTextContent('stat-types', Object.keys(res.stats.categories || {}).length);
          const usedMB = parseFloat(res.stats.totalSizeFormatted) || 0;
          const percentage = (usedMB / (15 * 1024)) * 100;
          const storageBar = getElement('storageBar');
          if (storageBar) storageBar.style.width = Math.min(percentage, 100) + '%';
          safeSetTextContent('storageText', `${res.stats.totalSizeFormatted} / 15 GB`);
          const cf = getElement('categoryFilter');
          if (cf) {
            cf.innerHTML = '<option value="">All Types</option>';
            if (res.stats.categories) Object.keys(res.stats.categories).sort().forEach(c => {
              cf.innerHTML += `<option value="${c}">${c} (${res.stats.categories[c]})</option>`;
            });
          }
          renderRecentDocs();
          setTimeout(() => renderStatsChart(res.stats.categories || {}), 100);
          if (!getElement('documents-section')?.classList.contains('hidden')) applyFilters();
        } else { showToast('Failed to load documents', 'error'); }
      } catch (error) { isLoading = false; showToast('Error: ' + error.message, 'error'); }
    }

    function renderRecentDocs() {
      const container = getElement('recentDocs');
      if (!container) return;
      const recent = allDocs.slice(0, 5);
      if (recent.length === 0) { container.innerHTML = '<p class="text-gray-500 text-center py-8">No documents yet</p>'; return; }
      container.innerHTML = recent.map(d => `
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:shadow-md transition cursor-pointer" onclick="window.viewDocument('${d.id}')">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center"><i class="fa-solid fa-file text-white"></i></div>
            <div><p class="font-medium">${d.fileName}</p><p class="text-xs text-gray-500">${d.date}</p></div>
          </div>
          <button class="p-2 hover:bg-gray-200 rounded-lg transition"><i class="fa-solid fa-external-link-alt text-gray-400"></i></button>
        </div>`).join('');
    }

    function renderStatsChart(categories) {
      const ctx = getElement('statsChart');
      if (!ctx) return;
      if (statsChart) { statsChart.destroy(); statsChart = null; }
      if (!categories || Object.keys(categories).length === 0) return;
      try {
        const isDark = document.body.classList.contains('dark');
        statsChart = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: Object.keys(categories),
            datasets: [{ data: Object.values(categories), backgroundColor: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6b7280'], borderWidth: 0, hoverOffset: 4 }]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom', labels: { color: isDark ? '#f1f5f9' : '#1f2937', padding: 15, font: { size: 11, family: 'Inter' } } },
              tooltip: { callbacks: { label: function(context) { const label = context.label || ''; const value = context.parsed || 0; const total = context.dataset.data.reduce((a, b) => a + b, 0); const percentage = ((value / total) * 100).toFixed(1); return `${label}: ${value} (${percentage}%)`; } } }
            },
            animation: { animateScale: true, animateRotate: true, duration: 750 }
          }
        });
      } catch (error) { console.error('Chart error:', error); }
    }

    function applyFilters() {
      const searchInput = getElement('searchInput');
      const categoryFilter = getElement('categoryFilter');
      const sortFilter = getElement('sortFilter');
      if (!searchInput || !categoryFilter || !sortFilter) return;
      const s = searchInput.value.toLowerCase();
      const c = categoryFilter.value;
      const sort = sortFilter.value;
      filteredDocs = allDocs.filter(d => {
        const ms = (d.fileName || '').toLowerCase().includes(s) || (d.description && d.description.toLowerCase().includes(s));
        const mc = c === '' || d.category === c;
        return ms && mc;
      });
      filteredDocs.sort((a, b) => {
        if (sort === 'newest') return new Date(b.date) - new Date(a.date);
        if (sort === 'oldest') return new Date(a.date) - new Date(b.date);
        if (sort === 'name_asc') return (a.fileName || '').localeCompare(b.fileName || '');
        if (sort === 'name_desc') return (b.fileName || '').localeCompare(a.fileName || '');
        return 0;
      });
      renderDocuments();
    }

    function renderDocuments() {
      const grid = getElement('documentsGrid');
      const bulkActions = getElement('bulkActions');
      if (!grid) return;
      if (filteredDocs.length === 0) {
        grid.innerHTML = '<div class="card p-12 col-span-full text-center"><i class="fa-regular fa-folder-open text-6xl text-gray-400 mb-4"></i><p class="text-gray-500 text-lg">No documents found</p></div>';
        bulkActions?.classList.add('hidden');
        return;
      }
      if (currentUser && currentUser.role === 'admin') bulkActions?.classList.remove('hidden');
      else bulkActions?.classList.add('hidden');
      
      const icons = { PDF: 'fa-file-pdf text-red-500', JPG: 'fa-file-image text-pink-500', PNG: 'fa-file-image text-purple-500', DOC: 'fa-file-word text-blue-500', XLS: 'fa-file-excel text-green-500', CSV: 'fa-file-csv text-emerald-500', Lainnya: 'fa-file text-gray-500' };
      let html = '';
      filteredDocs.forEach(d => {
        const ic = icons[d.category] || 'fa-file text-gray-500';
        const isSelected = selectedDocs.has(d.id);
        const safeFileName = (d.fileName || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        html += `
          <div class="card p-6 ${isSelected ? 'ring-2 ring-blue-500' : ''}">
            <div class="flex items-start justify-between mb-4">
              <div class="flex items-start gap-3 flex-1 min-w-0">
                <div class="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0"><i class="fa-solid ${ic} text-2xl"></i></div>
                <div class="flex-1 min-w-0">
                  <h3 class="font-semibold text-gray-900 truncate mb-1" title="${safeFileName}">${d.fileName || 'Unknown'}</h3>
                  <p class="text-sm text-gray-500 line-clamp-2">${d.description && d.description !== '-' ? d.description : '<span class="italic">No description</span>'}</p>
                </div>
              </div>
              ${currentUser && currentUser.role === 'admin' ? `<input type="checkbox" class="doc-checkbox w-5 h-5 rounded ml-2 flex-shrink-0" value="${d.id}" ${isSelected ? 'checked' : ''} onchange="window.toggleDoc('${d.id}')">` : ''}
            </div>
            <div class="flex items-center justify-between text-xs text-gray-500 mb-4 pb-4 border-b border-gray-200">
              <span class="flex items-center gap-1"><i class="fa-solid fa-tag"></i>${d.category || '-'}</span>
              <span class="flex items-center gap-1"><i class="fa-solid fa-database"></i>${d.sizeFormatted || '0 Bytes'}</span>
            </div>
            <div class="flex gap-2">
              <a href="${d.url || '#'}" target="_blank" class="btn-view flex-1 px-3 py-2 rounded-lg text-sm font-medium text-center flex items-center justify-center gap-1"><i class="fa-solid fa-eye"></i>View</a>
              <button onclick="window.downloadFile('${d.url}', '${safeFileName}')" class="btn-download flex-1 px-3 py-2 rounded-lg text-sm font-medium text-center flex items-center justify-center gap-1"><i class="fa-solid fa-download"></i>Download</button>
              ${currentUser && currentUser.role === 'admin' ? `<button onclick="window.deleteDoc('${d.id}','${safeFileName}')" class="btn-delete px-3 py-2 rounded-lg flex items-center justify-center"><i class="fa-solid fa-trash"></i></button>` : ''}
            </div>
          </div>`;
      });
      grid.innerHTML = html;
      if (currentUser && currentUser.role === 'admin') updateBulkActions();
    }

    function downloadFile(fileUrl, filename) {
      window.open(`/api/download?url=${encodeURIComponent(fileUrl)}&name=${encodeURIComponent(filename)}`, '_blank');
      addActivity('Download', `Downloaded: ${filename}`, 'success');
    }

    function toggleDoc(id) {
      if (selectedDocs.has(id)) selectedDocs.delete(id); else selectedDocs.add(id);
      updateBulkActions(); renderDocuments();
    }

    function toggleSelectAll() {
      const cb = getElement('selectAll');
      if (!cb) return;
      if (cb.checked) filteredDocs.forEach(d => selectedDocs.add(d.id)); else selectedDocs.clear();
      renderDocuments();
    }

    function updateBulkActions() {
      const n = selectedDocs.size;
      const sc = getElement('selectedCount');
      const bd = getElement('bulkDeleteBtn');
      const sa = getElement('selectAll');
      if (sc) { sc.textContent = `(${n} selected)`; sc.classList.toggle('hidden', n===0); }
      if (bd) { bd.classList.toggle('hidden', n===0); bd.disabled = n===0; }
      if (sa) sa.checked = filteredDocs.length>0 && filteredDocs.every(d => selectedDocs.has(d.id));
    }

    async function bulkDelete() {
      if (selectedDocs.size === 0) return;
      Swal.fire({ title: `Delete ${selectedDocs.size} document(s)?`, text: 'This action cannot be undone!', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Yes, Delete', cancelButtonText: 'Cancel' }).then(async r => {
        if (r.isConfirmed) {
          Swal.fire({title:'Deleting...',allowOutsideClick:false,didOpen:()=>Swal.showLoading()});
          try {
            const res = await apiCall('/api/documents', 'DELETE', { ids: Array.from(selectedDocs) });
            Swal.close();
            if (res.success) { selectedDocs.clear(); loadDocuments(); showToast(res.message, 'success'); addActivity('Bulk Delete', `Deleted ${res.message}`, 'warning'); }
            else showToast(res.message, 'error');
          } catch (err) { Swal.close(); showToast('Error', 'error'); }
        }
      });
    }

    function viewDocument(id) {
      const doc = allDocs.find(d => d.id === id);
      if (!doc) return;
      window.open(doc.url, '_blank');
      addActivity('View', `Viewed document: ${doc.fileName}`, 'info');
    }

    async function deleteDoc(id, name) {
      Swal.fire({ title: 'Delete Document?', html: `<div class="text-left"><p class="font-medium text-red-600">${name}</p></div>`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Yes, Delete', cancelButtonText: 'Cancel' }).then(async r => {
        if (r.isConfirmed) {
          Swal.fire({title:'Deleting...',allowOutsideClick:false,didOpen:()=>Swal.showLoading()});
          try {
            const res = await apiCall('/api/documents', 'DELETE', { ids: [id] });
            Swal.close();
            if (res.success) { loadDocuments(); showToast(res.message, 'success'); addActivity('Delete', `Deleted document: ${name}`, 'warning'); }
            else showToast(res.message, 'error');
          } catch (err) { Swal.close(); showToast('Error', 'error'); }
        }
      });
    }

    function addActivity(action, description, type='info') {
      const entry = { action, description, type, timestamp: new Date().toISOString() };
      activityLog.unshift(entry);
      if (activityLog.length > 50) activityLog.pop();
    }

    function renderActivityLog() {
      const container = getElement('activityLog');
      if (!container) return;
      if (activityLog.length === 0) { container.innerHTML = '<p class="text-gray-500 text-center py-8">No activity yet</p>'; return; }
      const icons = { success: 'fa-check-circle text-green-500', warning: 'fa-exclamation-triangle text-orange-500', error: 'fa-times-circle text-red-500', info: 'fa-info-circle text-blue-500' };
      container.innerHTML = activityLog.map(log => `<div class="flex items-start gap-4 p-4 bg-gray-50 rounded-xl"><div class="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0"><i class="fa-solid ${icons[log.type] || icons.info} text-xl"></i></div><div class="flex-1"><p class="font-medium">${log.action}</p><p class="text-sm text-gray-500">${log.description}</p><p class="text-xs text-gray-400 mt-1">${new Date(log.timestamp).toLocaleString('id-ID')}</p></div></div>`).join('');
    }

    function exportData() {
      window.open('/api/export/csv', '_blank');
      addActivity('Export', 'Downloaded CSV backup', 'success');
      showToast('CSV downloaded successfully!', 'success');
    }

    function logout() {
      const isAuto = logoutReason === 'auto';
      if (isAuto) { performLogout(); showLoginNotification('Session expired. Please login again.', 'warning'); }
      else {
        Swal.fire({ title: 'Logout?', text: 'Are you sure you want to logout?', icon: 'question', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Yes, Logout', cancelButtonText: 'Cancel' }).then(r => { if (r.isConfirmed) performLogout(); });
      }
    }

    function performLogout() {
      currentUser = null;
      localStorage.removeItem('currentUser');
      getElement('main-app')?.classList.add('hidden');
      getElement('login-page')?.classList.remove('hidden');
      getElement('loginForm')?.reset();
      if (idleTimer) clearTimeout(idleTimer);
      showLoginNotification('You have been logged out successfully', 'info');
      logoutReason = 'manual';
    }

    function showLoginNotification(message, type = 'info') {
      getElement('loginNotification')?.remove();
      const colors = { warning: 'bg-orange-500/20 border-orange-500/50 text-orange-300', info: 'bg-blue-500/20 border-blue-500/50 text-blue-300', success: 'bg-green-500/20 border-green-500/50 text-green-300' };
      const icons = { warning: 'fa-clock', info: 'fa-info-circle', success: 'fa-check-circle' };
      const notif = document.createElement('div');
      notif.id = 'loginNotification';
      notif.className = `fade-in fixed top-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl border ${colors[type]} backdrop-blur-md z-50 flex items-center gap-3 shadow-2xl`;
      notif.innerHTML = `<i class="fa-solid ${icons[type]}"></i><span class="text-sm font-medium">${message}</span><button onclick="this.parentElement.remove()" class="ml-3"><i class="fa-solid fa-xmark"></i></button>`;
      document.body.appendChild(notif);
      setTimeout(() => { if (notif.parentElement) { notif.style.opacity = '0'; setTimeout(() => notif.remove(), 500); } }, 5000);
    }

    window.handleLogin = handleLogin;
    window.showSection = showSection;
    window.openSidebar = openSidebar;
    window.closeSidebar = closeSidebar;
    window.previewFiles = previewFiles;
    window.removeFile = removeFile;
    window.handleUpload = handleUpload;
    window.applyFilters = applyFilters;
    window.toggleDoc = toggleDoc;
    window.toggleSelectAll = toggleSelectAll;
    window.bulkDelete = bulkDelete;
    window.viewDocument = viewDocument;
    window.deleteDoc = deleteDoc;
    window.downloadFile = downloadFile;
    window.exportData = exportData;
    window.logout = logout;
    window.toggleTheme = toggleTheme;

    safeSetTextContent('currentDate', new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.classList.remove('light', 'dark');
    document.body.classList.add(savedTheme);
    if (savedTheme === 'dark') {
      getElement('themeIconSun')?.classList.add('hidden');
      getElement('themeIconMoon')?.classList.remove('hidden');
    }
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try { currentUser = JSON.parse(savedUser); showMainApp(); }
      catch(e) { localStorage.removeItem('currentUser'); }
    }

    const dropZone = getElement('dropZone');
    if (dropZone) {
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => { e.preventDefault(); e.stopPropagation(); }, false);
      });
      ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('drag-active'), false);
      });
      ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('drag-active'), false);
      });
      dropZone.addEventListener('drop', (e) => {
        const fileInput = getElement('fileInput');
        if (fileInput) {
          fileInput.files = e.dataTransfer.files;
          selectedFiles = Array.from(e.dataTransfer.files);
          previewFiles();
        }
      }, false);
    }

  }, []);

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

  return (
    <>
      <div id="login-page" className="fade-in min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 gradient-primary opacity-10"></div>
        <div className="absolute top-20 left-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="card p-8 max-w-md w-full relative z-10">
          <div className="text-center mb-8">
            <div className="w-24 h-24 mx-auto mb-4 flex items-center justify-center shadow-2xl rounded-2xl overflow-hidden bg-gradient-to-br from-blue-600 to-purple-600 p-1">
              <div className="w-full h-full bg-white rounded-xl flex items-center justify-center overflow-hidden">
                <img src="https://lh3.googleusercontent.com/d/1ckXgbXxpjGa3E-zfuF9QJc17mYtABqtm" alt="SecureVault Logo" className="w-full h-full object-contain p-2" />
              </div>
            </div>
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">SecureVault Pro</h1>
            <p className="text-gray-500">Enterprise Document Management</p>
          </div>
          <form id="loginForm" onSubmit={window.handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Username</label>
              <div className="relative">
                <i className="fa-solid fa-user absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <input type="text" id="username" className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="admin atau guest" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <div className="relative">
                <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <input type="password" id="password" className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="••••••••" required />
              </div>
            </div>
            <button type="submit" id="loginBtn" className="btn-primary w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2">
              <span id="loginText">Sign In</span>
              <div id="loginLoader" className="loader hidden"></div>
            </button>
          </form>
          <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <p className="text-xs text-blue-800 mb-2 font-semibold">💡 Login Credentials:</p>
            <div className="text-xs space-y-1 text-blue-700">
              <div className="flex justify-between"><span>Guest:</span> <code className="bg-white/50 px-2 py-0.5 rounded">guest / guest123</code></div>
            </div>
          </div>
        </div>
      </div>

      <div id="main-app" className="hidden">
        <div id="overlay" className="fixed inset-0 bg-black/50 z-40 hidden" onClick={() => window.closeSidebar && window.closeSidebar()}></div>
        
        <aside className="sidebar-desktop-only fixed left-0 top-0 h-full w-72 glass z-50 overflow-y-auto">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg overflow-hidden bg-gradient-to-br from-blue-600 to-purple-600 p-0.5">
                <div className="w-full h-full bg-white rounded-lg flex items-center justify-center overflow-hidden">
                  <img src="https://lh3.googleusercontent.com/d/1ckXgbXxpjGa3E-zfuF9QJc17mYtABqtm" alt="Logo" className="w-full h-full object-contain p-0.5" />
                </div>
              </div>
              <div>
                <h2 className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">SecureVault</h2>
                <p className="text-xs text-gray-500">Developed by @Raiganet</p>
              </div>
            </div>
          </div>
          <nav className="p-4 space-y-2">
            <button onClick={() => window.showSection('dashboard')} className="sidebar-item active w-full flex items-center gap-3 px-4 py-3 text-left"><i className="fa-solid fa-chart-pie w-5"></i><span>Dashboard</span></button>
            <button onClick={() => window.showSection('upload')} className="sidebar-item w-full flex items-center gap-3 px-4 py-3 text-left"><i className="fa-solid fa-cloud-arrow-up w-5"></i><span>Upload</span></button>
            <button onClick={() => window.showSection('documents')} className="sidebar-item w-full flex items-center gap-3 px-4 py-3 text-left"><i className="fa-solid fa-folder-open w-5"></i><span>Documents</span></button>
            <button onClick={() => window.showSection('activity')} className="sidebar-item w-full flex items-center gap-3 px-4 py-3 text-left"><i className="fa-solid fa-clock-rotate-left w-5"></i><span>Activity Log</span></button>
            <button onClick={() => window.showSection('settings')} className="sidebar-item w-full flex items-center gap-3 px-4 py-3 text-left"><i className="fa-solid fa-gear w-5"></i><span>Settings</span></button>
          </nav>
          <div className="px-4 py-3 mx-4 mb-4 p-4 rounded-xl bg-gray-100">
            <div className="flex justify-between text-sm mb-2"><span className="font-medium">Storage</span><span id="storageText" className="text-blue-600 font-semibold">0 MB / 15 GB</span></div>
            <div className="w-full h-2 bg-gray-300 rounded-full overflow-hidden"><div id="storageBar" className="storage-bar h-full rounded-full" style={{width: '0%'}}></div></div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
            <div className="flex items-center gap-3 px-4 py-3 mb-2">
              <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center"><i className="fa-solid fa-user text-white"></i></div>
              <div className="flex-1 min-w-0"><p className="font-medium truncate" id="sidebarUserName">User</p><p className="text-xs text-gray-500" id="sidebarUserRole">Guest</p></div>
            </div>
            <button onClick={() => window.logout && window.logout()} className="w-full px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition flex items-center justify-center gap-2"><i className="fa-solid fa-right-from-bracket"></i><span>Logout</span></button>
          </div>
        </aside>

        <aside id="mobileSidebar" className="sidebar-mobile-only fixed left-0 top-0 h-full w-72 glass z-50 overflow-y-auto" style={{transform: 'translateX(-100%)', transition: 'transform 0.3s ease'}}>
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg overflow-hidden bg-gradient-to-br from-blue-600 to-purple-600 p-0.5">
                <div className="w-full h-full bg-white rounded-lg flex items-center justify-center overflow-hidden">
                  <img src="https://lh3.googleusercontent.com/d/1ckXgbXxpjGa3E-zfuF9QJc17mYtABqtm" alt="Logo" className="w-full h-full object-contain p-0.5" />
                </div>
              </div>
              <div>
                <h2 className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">SecureVault</h2>
                <p className="text-xs text-gray-500">Developed by @Raiganet</p>
              </div>
            </div>
            <button onClick={() => window.closeSidebar && window.closeSidebar()} className="text-gray-400 hover:text-gray-900 p-2"><i className="fa-solid fa-xmark text-xl"></i></button>
          </div>
          <nav className="p-4 space-y-2">
            <button onClick={() => {window.showSection('dashboard'); window.closeSidebar();}} className="sidebar-item w-full flex items-center gap-3 px-4 py-3 text-left"><i className="fa-solid fa-chart-pie w-5"></i><span>Dashboard</span></button>
            <button onClick={() => {window.showSection('upload'); window.closeSidebar();}} className="sidebar-item w-full flex items-center gap-3 px-4 py-3 text-left"><i className="fa-solid fa-cloud-arrow-up w-5"></i><span>Upload</span></button>
            <button onClick={() => {window.showSection('documents'); window.closeSidebar();}} className="sidebar-item w-full flex items-center gap-3 px-4 py-3 text-left"><i className="fa-solid fa-folder-open w-5"></i><span>Documents</span></button>
            <button onClick={() => {window.showSection('activity'); window.closeSidebar();}} className="sidebar-item w-full flex items-center gap-3 px-4 py-3 text-left"><i className="fa-solid fa-clock-rotate-left w-5"></i><span>Activity Log</span></button>
            <button onClick={() => {window.showSection('settings'); window.closeSidebar();}} className="sidebar-item w-full flex items-center gap-3 px-4 py-3 text-left"><i className="fa-solid fa-gear w-5"></i><span>Settings</span></button>
          </nav>
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3 px-4 py-3 mb-2">
              <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center"><i className="fa-solid fa-user text-white"></i></div>
              <div className="flex-1 min-w-0"><p className="font-medium truncate" id="mobileUserName">User</p><p className="text-xs text-gray-500" id="mobileUserRole">Guest</p></div>
            </div>
            <button onClick={() => {window.logout(); window.closeSidebar();}} className="w-full px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition flex items-center justify-center gap-2"><i className="fa-solid fa-right-from-bracket"></i><span>Logout</span></button>
          </div>
        </aside>

        <main className="main-content lg:ml-72 min-h-screen">
          <header className="glass sticky top-0 z-30 px-4 lg:px-8 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button onClick={() => window.openSidebar && window.openSidebar()} className="lg:hidden text-gray-600 hover:text-gray-900 p-2" id="hamburgerBtn"><i className="fa-solid fa-bars text-xl"></i></button>
              <div>
                <h1 className="text-2xl font-bold" id="pageTitle">Dashboard</h1>
                <p className="text-sm text-gray-500" id="currentDate"></p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => window.toggleTheme && window.toggleTheme()} className="p-2 rounded-xl hover:bg-gray-100 transition" title="Toggle Theme">
                <i className="fa-solid fa-sun text-xl text-yellow-500" id="themeIconSun"></i>
                <i className="fa-solid fa-moon text-xl text-blue-400 hidden" id="themeIconMoon"></i>
              </button>
              <button onClick={() => window.showSection && window.showSection('upload')} className="btn-primary px-4 lg:px-6 py-2.5 rounded-xl font-medium text-white flex items-center gap-2"><i className="fa-solid fa-plus"></i><span className="hidden sm:inline">New Upload</span></button>
            </div>
          </header>
          
          <div className="p-4 lg:p-8">
            <div id="dashboard-section" className="space-y-6 fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center"><i className="fa-solid fa-file text-white text-xl"></i></div>
                    <span className="text-3xl font-bold" id="stat-total">0</span>
                  </div>
                  <p className="text-gray-500 text-sm">Total Documents</p>
                </div>
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl gradient-success flex items-center justify-center"><i className="fa-solid fa-database text-white text-xl"></i></div>
                    <span className="text-3xl font-bold" id="stat-size">0 MB</span>
                  </div>
                  <p className="text-gray-500 text-sm">Storage Used</p>
                </div>
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center"><i className="fa-solid fa-tags text-white text-xl"></i></div>
                    <span className="text-3xl font-bold" id="stat-types">0</span>
                  </div>
                  <p className="text-gray-500 text-sm">File Types</p>
                </div>
                <div className="card p-6 cursor-pointer hover:shadow-xl transition" onClick={() => window.exportData && window.exportData()}>
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
                  <div className="chart-container"><canvas id="statsChart"></canvas></div>
                </div>
                <div className="card p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">Recent Documents</h3>
                    <button onClick={() => window.showSection && window.showSection('documents')} className="text-blue-600 text-sm hover:underline">View All</button>
                  </div>
                  <div id="recentDocs" className="space-y-3"><p className="text-gray-500 text-center py-8">Loading...</p></div>
                </div>
              </div>
            </div>

            <div id="upload-section" className="hidden fade-in max-w-3xl mx-auto">
              <div className="card p-6 lg:p-8">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                  <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center"><i className="fa-solid fa-cloud-arrow-up text-white"></i></div>
                  Upload Documents
                </h2>
                <form id="uploadForm" onSubmit={(e) => window.handleUpload && window.handleUpload(e)}>
                  <div id="dropZone" className="border-2 border-dashed border-gray-300 rounded-2xl p-8 lg:p-12 text-center hover:border-blue-500 transition cursor-pointer bg-gray-50" onClick={() => document.getElementById('fileInput').click()}>
                    <i className="fa-solid fa-cloud-arrow-up text-6xl text-gray-400 mb-4"></i>
                    <p className="text-lg font-medium mb-2">Click to upload or drag and drop</p>
                    <p className="text-sm text-gray-500 mb-4">PDF, JPG, PNG, DOC, XLS, CSV (Max 10MB each)</p>
                    <input type="file" id="fileInput" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.csv" multiple onChange={() => window.previewFiles && window.previewFiles()} />
                    <div id="filePreview" className="mt-6 space-y-2 text-left"></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">File Type *</label>
                      <select id="category" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none" required>
                        <option value="">Select type...</option>
                        <option value="PDF">PDF</option>
                        <option value="JPG">JPG / JPEG</option>
                        <option value="PNG">PNG</option>
                        <option value="DOC">DOC / DOCX</option>
                        <option value="XLS">XLS / XLSX</option>
                        <option value="CSV">CSV</option>
                        <option value="Lainnya">Others</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">File Name</label>
                      <input type="text" id="customName" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Optional" />
                    </div>
                  </div>
                  <div className="mt-6">
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <textarea id="description" rows="3" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Add notes..."></textarea>
                  </div>
                  <button type="submit" className="btn-primary w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 mt-6">
                    <span id="btnText">Upload Documents</span>
                    <div id="btnLoader" className="loader hidden"></div>
                  </button>
                </form>
              </div>
            </div>

            <div id="documents-section" className="hidden fade-in space-y-6">
              <div className="card p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2 relative">
                    <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                    <input type="text" id="searchInput" placeholder="Search documents..." className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none" onInput={() => window.applyFilters && window.applyFilters()} />
                  </div>
                  <select id="categoryFilter" className="px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none" onChange={() => window.applyFilters && window.applyFilters()}>
                    <option value="">All Types</option>
                  </select>
                  <select id="sortFilter" className="px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none" onChange={() => window.applyFilters && window.applyFilters()}>
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="name_asc">Name A-Z</option>
                    <option value="name_desc">Name Z-A</option>
                  </select>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center hidden" id="bulkActions">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="selectAll" className="w-5 h-5 rounded" onChange={() => window.toggleSelectAll && window.toggleSelectAll()} />
                    <label htmlFor="selectAll" className="cursor-pointer">Select All</label>
                    <span id="selectedCount" className="text-sm text-gray-500 hidden">(0 selected)</span>
                  </div>
                  <button onClick={() => window.bulkDelete && window.bulkDelete()} id="bulkDeleteBtn" className="btn-delete px-4 py-2 rounded-lg transition hidden" disabled>
                    <i className="fa-solid fa-trash mr-2"></i>Delete Selected
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="documentsGrid">
                <div className="card p-6 col-span-full text-center">
                  <i className="fa-solid fa-circle-notch fa-spin text-4xl text-blue-500 mb-3"></i>
                  <p className="text-gray-500">Loading documents...</p>
                </div>
              </div>
            </div>

            <div id="activity-section" className="hidden fade-in">
              <div className="card p-6">
                <h3 className="font-bold text-xl mb-6">Recent Activity</h3>
                <div id="activityLog" className="space-y-4"><p className="text-gray-500 text-center py-8">No activity yet</p></div>
              </div>
            </div>

            <div id="settings-section" className="hidden fade-in max-w-2xl mx-auto">
              <div className="card p-6">
                <h3 className="font-bold text-xl mb-6">Settings</h3>
                <div className="space-y-6">
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-medium">Auto-logout Timer</p>
                      <p className="text-sm text-gray-500">Automatically logout after 10 minutes of inactivity</p>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">Enabled</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-medium">Dark Mode</p>
                      <p className="text-sm text-gray-500">Toggle dark/light theme</p>
                    </div>
                    <button onClick={() => window.toggleTheme && window.toggleTheme()} className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium">Toggle</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <nav className="mobile-nav fixed bottom-0 left-0 right-0 glass border-t border-gray-200 z-30" style={{display: 'none'}}>
          <div className="flex justify-around items-center py-2">
            <button onClick={() => window.showSection && window.showSection('dashboard')} className="flex flex-col items-center gap-1 px-4 py-2 text-gray-600 hover:text-blue-600 transition"><i className="fa-solid fa-chart-pie text-xl"></i><span className="text-xs">Home</span></button>
            <button onClick={() => window.showSection && window.showSection('upload')} className="flex flex-col items-center gap-1 px-4 py-2 text-gray-600 hover:text-blue-600 transition"><i className="fa-solid fa-cloud-arrow-up text-xl"></i><span className="text-xs">Upload</span></button>
            <button onClick={() => window.exportData && window.exportData()} className="flex flex-col items-center gap-1 px-4 py-2 text-gray-600 hover:text-orange-600 transition"><i className="fa-solid fa-download text-xl"></i><span className="text-xs">Backup</span></button>
            <button onClick={() => window.showSection && window.showSection('documents')} className="flex flex-col items-center gap-1 px-4 py-2 text-gray-600 hover:text-blue-600 transition"><i className="fa-solid fa-folder-open text-xl"></i><span className="text-xs">Docs</span></button>
            <button onClick={() => window.logout && window.logout()} className="flex flex-col items-center gap-1 px-4 py-2 text-gray-600 hover:text-red-600 transition"><i className="fa-solid fa-right-from-bracket text-xl"></i><span className="text-xs">Logout</span></button>
          </div>
        </nav>
      </div>
      
      <div id="toastContainer"></div>
    </>
  );
}