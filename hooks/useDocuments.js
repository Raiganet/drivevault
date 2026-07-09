import { useState, useEffect, useCallback, useMemo } from 'react';
import { showToast } from '@/utils/helpers';

export function useDocuments() {
  const [allDocs, setAllDocs] = useState([]);
  const [stats, setStats] = useState({
    totalFiles: 0,
    totalSize: 0,
    totalSizeFormatted: '0 MB',
    categories: {},
  });
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortFilter, setSortFilter] = useState('newest');
  const [viewMode, setViewMode] = useState('grid');

  const loadDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/documents');
      const data = await res.json();
      
      if (data.success) {
        setAllDocs(data.data || []);
        setStats(data.stats || {
          totalFiles: 0,
          totalSize: 0,
          totalSizeFormatted: '0 MB',
          categories: {},
        });
      } else {
        showToast('Failed to load documents: ' + data.message, 'error');
      }
    } catch (error) {
      showToast('Error loading documents: ' + error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const filteredDocs = useMemo(() => {
    let result = [...allDocs];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(doc =>
        doc.fileName.toLowerCase().includes(term) ||
        (doc.description && doc.description.toLowerCase().includes(term)) ||
        doc.category.toLowerCase().includes(term)
      );
    }

    if (categoryFilter) {
      result = result.filter(doc => doc.category === categoryFilter);
    }

    result.sort((a, b) => {
      switch (sortFilter) {
        case 'newest':
          return new Date(b.date) - new Date(a.date);
        case 'oldest':
          return new Date(a.date) - new Date(b.date);
        case 'name_asc':
          return a.fileName.localeCompare(b.fileName);
        case 'name_desc':
          return b.fileName.localeCompare(a.fileName);
        case 'size_asc':
          return (a.size || 0) - (b.size || 0);
        case 'size_desc':
          return (b.size || 0) - (a.size || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [allDocs, searchTerm, categoryFilter, sortFilter]);

  const deleteDoc = useCallback(async (id, name) => {
    try {
      const res = await fetch('/api/documents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      });
      const data = await res.json();
      
      if (data.success) {
        showToast(data.message, 'success');
        loadDocuments();
      } else {
        showToast(data.message, 'error');
      }
    } catch (error) {
      showToast('Delete error: ' + error.message, 'error');
    }
  }, [loadDocuments]);

  const bulkDelete = useCallback(async (ids) => {
    try {
      const res = await fetch('/api/documents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      
      if (data.success) {
        showToast(data.message, 'success');
        loadDocuments();
      } else {
        showToast(data.message, 'error');
      }
    } catch (error) {
      showToast('Delete error: ' + error.message, 'error');
    }
  }, [loadDocuments]);

  const exportData = useCallback(() => {
    window.open('/api/export/csv', '_blank');
    showToast('CSV downloaded successfully!', 'success');
  }, []);

  const handleDownload = useCallback(async (doc) => {
    try {
      const urlParts = doc.url.split('/');
      const fileIdIndex = urlParts.indexOf('d') + 1;
      const fileId = urlParts[fileIdIndex];
      
      if (!fileId) {
        throw new Error('Invalid file URL');
      }

      showToast(`Downloading ${doc.fileName}...`, 'info');
      
      const downloadUrl = `/api/download?fileId=${fileId}&name=${encodeURIComponent(doc.fileName)}`;
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = doc.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast('Download started!', 'success');
    } catch (error) {
      showToast('Download failed: ' + error.message, 'error');
    }
  }, []);

  return {
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
  };
}
