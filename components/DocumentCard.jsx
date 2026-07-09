'use client';
import { getFileIcon, getFileColor, formatRelativeTime, truncateText } from '@/utils/helpers';

export default function DocumentCard({ doc, onView, onDownload, onDelete, onFavorite, isFavorite, viewMode = 'grid' }) {
  const fileIcon = getFileIcon(doc.fileName);
  const fileColor = getFileColor(doc.fileName);
  
  const gradientMap = {
    primary: 'from-indigo-500 to-purple-500',
    secondary: 'from-gray-500 to-gray-600',
    success: 'from-emerald-500 to-teal-500',
    warning: 'from-amber-500 to-orange-500',
    danger: 'from-red-500 to-pink-500',
    info: 'from-blue-500 to-cyan-500',
    purple: 'from-purple-500 to-pink-500',
    pink: 'from-pink-500 to-rose-500',
  };

  if (viewMode === 'list') {
    return (
      <div className="file-card flex items-center gap-4 p-4 animate-slide-up">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradientMap[fileColor]} flex items-center justify-center flex-shrink-0`}>
          <i className={`fa-solid ${fileIcon} text-white text-lg`}></i>
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate" title={doc.fileName}>
            {truncateText(doc.fileName, 40)}
          </h3>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
            <span><i className="fa-solid fa-tag mr-1"></i>{doc.category}</span>
            <span><i className="fa-solid fa-database mr-1"></i>{doc.sizeFormatted}</span>
            <span><i className="fa-regular fa-clock mr-1"></i>{formatRelativeTime(doc.date)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => onFavorite && onFavorite(doc)}
            className={`p-2 rounded-lg transition ${isFavorite ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`}
            aria-label="Favorite"
          >
            <i className={`fa-${isFavorite ? 'solid' : 'regular'} fa-star`}></i>
          </button>
          <button 
            onClick={() => onView && onView(doc)}
            className="btn-secondary px-3 py-2 text-xs"
            aria-label="View"
          >
            <i className="fa-solid fa-eye mr-1"></i>
            <span className="hidden sm:inline">View</span>
          </button>
          <button 
            onClick={() => onDownload && onDownload(doc)}
            className="btn-primary px-3 py-2 text-xs"
            aria-label="Download"
          >
            <i className="fa-solid fa-download mr-1"></i>
            <span className="hidden sm:inline">Download</span>
          </button>
          <button 
            onClick={() => onDelete && onDelete(doc)}
            className="btn-danger px-3 py-2 text-xs"
            aria-label="Delete"
          >
            <i className="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="file-card animate-slide-up group">
      {/* Favorite Button */}
      {onFavorite && (
        <button 
          onClick={(e) => { e.stopPropagation(); onFavorite(doc); }}
          className={`absolute top-3 right-3 z-10 p-2 rounded-lg transition ${
            isFavorite ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' : 'text-gray-400 hover:text-yellow-500 opacity-0 group-hover:opacity-100'
          }`}
          aria-label="Favorite"
        >
          <i className={`fa-${isFavorite ? 'solid' : 'regular'} fa-star`}></i>
        </button>
      )}

      {/* File Icon */}
      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradientMap[fileColor]} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
        <i className={`fa-solid ${fileIcon} text-white text-2xl`}></i>
      </div>

      {/* Content */}
      <div className="mb-4">
        <h3 className="font-semibold text-sm line-clamp-2 mb-2" title={doc.fileName}>
          {truncateText(doc.fileName, 30)}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
          {doc.description || 'No description'}
        </p>
      </div>

      {/* Meta */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
        <span className="badge badge-primary">
          <i className="fa-solid fa-tag mr-1"></i>{doc.category}
        </span>
        <span>
          <i className="fa-solid fa-database mr-1"></i>{doc.sizeFormatted}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button 
          onClick={() => onView && onView(doc)}
          className="btn-secondary flex-1 px-3 py-2 rounded-lg text-xs font-medium"
          aria-label="View"
        >
          <i className="fa-solid fa-eye mr-1"></i>View
        </button>
        <button 
          onClick={() => onDownload && onDownload(doc)}
          className="btn-primary flex-1 px-3 py-2 rounded-lg text-xs font-medium"
          aria-label="Download"
        >
          <i className="fa-solid fa-download mr-1"></i>Download
        </button>
        <button 
          onClick={() => onDelete && onDelete(doc)}
          className="btn-danger px-3 py-2 rounded-lg"
          aria-label="Delete"
        >
          <i className="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>
  );
}
