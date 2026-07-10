/**
 * Extract File ID from Google Drive URL
 * @param {string} url - Google Drive file URL
 * @returns {string|null} - File ID or null
 */
export function extractFileIdFromUrl(url) {
  if (!url) {
    console.error('URL is empty or undefined');
    return null;
  }

  try {
    // Format 1: https://drive.google.com/file/d/FILE_ID/view
    // atau https://drive.google.com/file/d/FILE_ID/view?usp=drivesdk
    const match1 = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match1 && match1[1]) {
      return match1[1];
    }

    // Format 2: https://drive.google.com/open?id=FILE_ID
    const match2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match2 && match2[1]) {
      return match2[1];
    }

    // Format 3: https://drive.google.com/uc?id=FILE_ID
    const match3 = url.match(/uc\?id=([a-zA-Z0-9_-]+)/);
    if (match3 && match3[1]) {
      return match3[1];
    }

    // Format 4: Direct file ID (jika sudah berupa ID)
    if (/^[a-zA-Z0-9_-]{20,}$/.test(url.trim())) {
      return url.trim();
    }

    // Format 5: Manual parsing
    const urlParts = url.split('/');
    const dIndex = urlParts.indexOf('d');
    if (dIndex !== -1 && dIndex + 1 < urlParts.length) {
      return urlParts[dIndex + 1].split('?')[0].split('&')[0];
    }

    console.error('Could not extract file ID from URL:', url);
    return null;
  } catch (error) {
    console.error('Error extracting file ID:', error);
    return null;
  }
}

/**
 * Format bytes to human-readable format
 */
export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format date to Indonesian locale
 */
export function formatDate(dateString) {
  if (!dateString) return 'Unknown';
  try {
    const date = new Date(dateString);
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    return dateString;
  }
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(dateString) {
  if (!dateString) return 'Unknown';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return formatDate(dateString);
  } catch (e) {
    return dateString;
  }
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename) {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2).toUpperCase();
}

/**
 * Get appropriate icon for file type
 */
export function getFileIcon(filename) {
  const ext = getFileExtension(filename).toLowerCase();
  const iconMap = {
    pdf: 'fa-file-pdf',
    jpg: 'fa-file-image',
    jpeg: 'fa-file-image',
    png: 'fa-file-image',
    gif: 'fa-file-image',
    doc: 'fa-file-word',
    docx: 'fa-file-word',
    xls: 'fa-file-excel',
    xlsx: 'fa-file-excel',
    csv: 'fa-file-csv',
    zip: 'fa-file-archive',
    rar: 'fa-file-archive',
    '7z': 'fa-file-archive',
    mp4: 'fa-file-video',
    avi: 'fa-file-video',
    mov: 'fa-file-video',
    mp3: 'fa-file-audio',
    wav: 'fa-file-audio',
    txt: 'fa-file-lines',
  };
  return iconMap[ext] || 'fa-file';
}

/**
 * Get color scheme for file type
 */
export function getFileColor(filename) {
  const ext = getFileExtension(filename).toLowerCase();
  const colorMap = {
    pdf: 'danger',
    jpg: 'warning',
    jpeg: 'warning',
    png: 'info',
    gif: 'info',
    doc: 'primary',
    docx: 'primary',
    xls: 'success',
    xlsx: 'success',
    csv: 'info',
    zip: 'warning',
    rar: 'warning',
    mp4: 'purple',
    mp3: 'pink',
  };
  return colorMap[ext] || 'secondary';
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text, maxLength = 50) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Debounce function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Generate unique document ID
 */
export function generateId() {
  return 'DOC-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

/**
 * Show toast notification
 */
export function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toastContainer');
  if (!container) {
    console.log('Toast:', message, type);
    return;
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icons = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle',
  };
  
  toast.innerHTML = `
    <i class="fa-solid ${icons[type]} text-xl"></i>
    <span class="flex-1">${message}</span>
    <button onclick="this.parentElement.remove()" class="ml-2 opacity-70 hover:opacity-100">
      <i class="fa-solid fa-xmark"></i>
    </button>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Show confirmation dialog
 */
export function confirmDialog(message, onConfirm) {
  const container = document.getElementById('modalContainer');
  if (!container) {
    if (window.confirm(message)) {
      onConfirm();
    }
    return;
  }

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content p-6 max-w-md w-full mx-4">
      <div class="flex items-start gap-4">
        <div class="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
          <i class="fa-solid fa-triangle-exclamation text-red-500 text-xl"></i>
        </div>
        <div class="flex-1">
          <h3 class="text-lg font-semibold mb-2">Confirm Action</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">${message}</p>
        </div>
      </div>
      <div class="flex gap-3 mt-6 justify-end">
        <button class="btn-secondary" id="cancelBtn">Cancel</button>
        <button class="btn-danger" id="confirmBtn">Confirm</button>
      </div>
    </div>
  `;
  
  container.appendChild(modal);
  
  modal.querySelector('#cancelBtn').onclick = () => modal.remove();
  modal.querySelector('#confirmBtn').onclick = () => {
    modal.remove();
    onConfirm();
  };
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };
}

/**
 * Copy text to clipboard
 */
export function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copied to clipboard!', 'success');
  }).catch(() => {
    showToast('Failed to copy', 'error');
  });
}

/**
 * Trigger file download
 */
export function downloadFile(url, filename) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Parse JWT token
 */
export function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

/**
 * Check if JWT token is expired
 */
export function isTokenExpired(token) {
  const decoded = parseJwt(token);
  if (!decoded || !decoded.exp) return true;
  return Date.now() >= decoded.exp * 1000;
}

/**
 * Calculate storage percentage
 */
export function getStoragePercentage(used, total) {
  return Math.min((used / total) * 100, 100);
}

/**
 * Get storage status based on percentage
 */
export function getStorageStatus(percentage) {
  if (percentage < 50) return { label: 'Good', color: 'success' };
  if (percentage < 75) return { label: 'Moderate', color: 'warning' };
  if (percentage < 90) return { label: 'High', color: 'warning' };
  return { label: 'Critical', color: 'danger' };
}
