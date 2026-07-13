export const APP_NAME = 'DriveVault Pro';
export const APP_VERSION = '2.0.0';
export const DEVELOPER = '@Raiganet';

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const STORAGE_LIMIT = 15 * 1024 * 1024 * 1024; // 15GB

export const FILE_CATEGORIES = [
  { value: 'PDF', label: 'PDF', icon: 'fa-file-pdf', color: 'danger' },
  { value: 'JPG', label: 'JPG / JPEG', icon: 'fa-file-image', color: 'warning' },
  { value: 'PNG', label: 'PNG', icon: 'fa-file-image', color: 'info' },
  { value: 'DOC', label: 'DOC / DOCX', icon: 'fa-file-word', color: 'primary' },
  { value: 'XLS', label: 'XLS / XLSX', icon: 'fa-file-excel', color: 'success' },
  { value: 'CSV', label: 'CSV', icon: 'fa-file-csv', color: 'info' },
  { value: 'RAR', label: 'RAR / ZIP', icon: 'fa-file-archive', color: 'warning' },
  { value: 'Lainnya', label: 'Others', icon: 'fa-file', color: 'secondary' },
];

export const NAVIGATION_ITEMS = [
  { id: 'dashboard', icon: 'fa-chart-pie', label: 'Dashboard' },
  { id: 'upload', icon: 'fa-cloud-arrow-up', label: 'Upload' },
  { id: 'scanner', icon: 'fa-camera', label: 'Scanner' },
  { id: 'pdf-tools', icon: 'fa-file-pdf', label: 'PDF Tools' },
  { id: 'ocr', icon: 'fa-eye', label: 'OCR Scanner' },
  { id: 'qr-generator', icon: 'fa-qrcode', label: 'QR Generator' },  // ← TAMBAH INI
  { id: 'documents', icon: 'fa-folder-open', label: 'Documents' },
  { id: 'activity', icon: 'fa-clock-rotate-left', label: 'Activity Log' },
  { id: 'settings', icon: 'fa-gear', label: 'Settings' },
];

export const QUICK_ACTIONS = [
  { id: 'upload', icon: 'fa-cloud-arrow-up', label: 'Upload File', color: 'primary' },
  { id: 'folder', icon: 'fa-folder-plus', label: 'Create Folder', color: 'info' },
  { id: 'ocr', icon: 'fa-eye', label: 'OCR Scan', color: 'success' },
  { id: 'export', icon: 'fa-file-export', label: 'Export CSV', color: 'warning' },
  { id: 'backup', icon: 'fa-database', label: 'Backup', color: 'purple' },
  { id: 'share', icon: 'fa-share-nodes', label: 'Share Link', color: 'pink' },
];

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'name_asc', label: 'Name A-Z' },
  { value: 'name_desc', label: 'Name Z-A' },
  { value: 'size_asc', label: 'Size (Small to Large)' },
  { value: 'size_desc', label: 'Size (Large to Small)' },
];

export const VIEW_MODES = {
  GRID: 'grid',
  LIST: 'list',
};

export const THEME_COLORS = {
  primary: '#4F46E5',
  secondary: '#7C3AED',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
};

export const DARK_THEME = {
  background: '#0F172A',
  card: '#1E293B',
  border: '#334155',
  text: '#F8FAFC',
};

export const LIGHT_THEME = {
  background: '#F8FAFC',
  card: '#FFFFFF',
  border: '#E2E8F0',
  text: '#0F172A',
};
