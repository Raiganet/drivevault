'use client';
import { useState } from 'react';
import { FILE_CATEGORIES, SORT_OPTIONS, VIEW_MODES } from '@/utils/constants';
import { confirmDialog, showToast } from '@/utils/helpers';
import DocumentCard from './DocumentCard';
import EmptyState from './EmptyState';
import { SkeletonDocumentCard, SkeletonList } from './LoadingSkeleton';

export default function Documents({
  filteredDocs,
  isLoading,
  searchTerm,
  setSearchTerm,
  categoryFilter,
  setCategoryFilter,
  sortFilter,
  setSortFilter,
  viewMode,
  setViewMode,
  stats,
  currentUser,
  selectedDocs,
  setSelectedDocs,
  onViewDoc,
  onDownloadDoc,
  onDeleteDoc,
  onBulkDelete,
}) {
  const [isSelectAll, setIsSelectAll] = useState(false);

  const handleToggleSelect = (id) => {
    const newSet = new Set(selectedDocs);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedDocs(newSet);
    setIsSelectAll(newSet.size === filteredDocs.length);
  };

  const handleSelectAll = () => {
    if (isSelectAll) {
      setSelectedDocs(new Set());
      setIsSelectAll(false);
    } else {
      setSelectedDocs(new Set(filteredDocs.map(d => d.id)));
      setIsSelectAll(true);
    }
  };

  const handleDelete = (doc) => {
    confirmDialog(`Are you sure you want to delete "${doc.fileName}"?`, () => {
      onDeleteDoc(doc);
    });
  };

  const handleBulkDelete = () => {
    if (selectedDocs.size === 0) {
      showToast('No documents selected', 'warning');
      return;
    }
    confirmDialog(`Delete ${selectedDocs.size} document(s)?`, () => {
      onBulkDelete(Array.from(selectedDocs));
      setSelectedDocs(new Set());
      setIsSelectAll(false);
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Filters Bar */}
      <div className="card p-4 lg:p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative md:col-span-2">
            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, category, or description..." 
              className="input pl-12"
              aria-label="Search documents"
            />
          </div>
          
          {/* Category Filter */}
          <select 
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="select"
            aria-label="Filter by category"
          >
            <option value="">All Categories</option>
            {Object.keys(stats.categories || {}).map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
            {FILE_CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
          
          {/* Sort */}
          <select 
            value={sortFilter}
            onChange={(e) => setSortFilter(e.target.value)}
            className="select"
            aria-label="Sort documents"
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* View Mode & Bulk Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            {currentUser?.role === 'admin' && (
              <>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={isSelectAll}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm font-medium">Select All</span>
                </label>
                {selectedDocs.size > 0 && (
                  <span className="badge badge-primary">
                    {selectedDocs.size} selected
                  </span>
                )}
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode(VIEW_MODES.GRID)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  viewMode === VIEW_MODES.GRID 
                    ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' 
                    : 'text-gray-600 dark:text-gray-400'
                }`}
                aria-label="Grid view"
              >
                <i className="fa-solid fa-grid-2"></i>
              </button>
              <button
                onClick={() => setViewMode(VIEW_MODES.LIST)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  viewMode === VIEW_MODES.LIST 
                    ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' 
                    : 'text-gray-600 dark:text-gray-400'
                }`}
                aria-label="List view"
              >
                <i className="fa-solid fa-list"></i>
              </button>
            </div>

            {/* Bulk Delete */}
            {currentUser?.role === 'admin' && selectedDocs.size > 0 && (
              <button 
                onClick={handleBulkDelete}
                className="btn-danger text-sm"
              >
                <i className="fa-solid fa-trash mr-1"></i>
                Delete Selected
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results Info */}
      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <span>
          Showing <span className="font-semibold text-gray-900 dark:text-white">{filteredDocs.length}</span> of{' '}
          <span className="font-semibold text-gray-900 dark:text-white">{filteredDocs.length}</span> documents
        </span>
      </div>

      {/* Documents Grid/List */}
      {isLoading ? (
        viewMode === VIEW_MODES.GRID ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
            {[...Array(8)].map((_, i) => (
              <SkeletonDocumentCard key={i} />
            ))}
          </div>
        ) : (
          <SkeletonList />
        )
      ) : filteredDocs.length === 0 ? (
        <EmptyState 
          icon="fa-folder-open"
          title={searchTerm || categoryFilter ? 'No matching documents' : 'No documents yet'}
          description={
            searchTerm || categoryFilter 
              ? 'Try adjusting your search or filter criteria.'
              : 'Upload your first document to get started.'
          }
          action={!searchTerm && !categoryFilter && (
            <button className="btn-primary">
              <i className="fa-solid fa-cloud-arrow-up mr-2"></i>
              Upload Document
            </button>
          )}
        />
      ) : viewMode === VIEW_MODES.GRID ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
          {filteredDocs.map(doc => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              viewMode="grid"
              onView={onViewDoc}
              onDownload={onDownloadDoc}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDocs.map(doc => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              viewMode="list"
              onView={onViewDoc}
              onDownload={onDownloadDoc}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
