import { useState, useEffect, useCallback, useMemo } from 'react';
import { showToast, extractFileIdFromUrl } from '@/utils/helpers';

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
    console.log('️ Deleting document:', id, name);
    
    const res = await fetch('/api/documents', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id] }),
    });
    const data = await res.json();
    
    if (data.success) {
      showToast(data.message, 'success');
      // Reload documents setelah delete
      await loadDocuments();
    } else {
      showToast(data.message, 'error');
    }
  } catch (error) {
    console.error('❌ Delete error:', error);
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
      console.log('📥 Download attempt for document:', doc);
      console.log('Document URL:', doc.url);
      
      // Extract file ID using the imported function
      const fileId = extractFileIdFromUrl(doc.url);
      
      if (!fileId) {
        console.error('❌ Could not extract file ID from URL:', doc.url);
        showToast('Invalid file URL. Please check the document.', 'error');
        return;
      }

      console.log('✅ File ID extracted:', fileId);
      showToast(`Downloading ${doc.fileName}...`, 'info');
      
      // Create download URL
      const downloadUrl = `/api/download?fileId=${encodeURIComponent(fileId)}&name=${encodeURIComponent(doc.fileName)}`;
      
      console.log('🔗 Download URL:', downloadUrl);
      
      // Create link and trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = doc.fileName;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);
      
      showToast('Download started!', 'success');
    } catch (error) {
      console.error('❌ Download error:', error);
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
