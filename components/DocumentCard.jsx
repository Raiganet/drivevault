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

  // LIST VIEW
  if (viewMode === 'list') {
    return (
      <div className="file-card flex items-center gap-3 lg:gap-4 p-3 lg:p-4 animate-slide-up">
        <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br ${gradientMap[fileColor]} flex items-center justify-center flex-shrink-0`}>
          <i className={`fa-solid ${fileIcon} text-white text-sm lg:text-lg`}></i>
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-xs lg:text-sm truncate" title={doc.fileName}>
            {truncateText(doc.fileName, 40)}
          </h3>
          <div className="flex items-center gap-2 lg:gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
            <span><i className="fa-solid fa-tag mr-1"></i>{doc.category}</span>
            <span className="hidden sm:inline"><i className="fa-solid fa-database mr-1"></i>{doc.sizeFormatted}</span>
            <span className="hidden md:inline"><i className="fa-regular fa-clock mr-1"></i>{formatRelativeTime(doc.date)}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 lg:gap-2">
          <button 
            onClick={() => onDownload && onDownload(doc)}
            className="btn-primary px-3 py-2 text-xs whitespace-nowrap"
            aria-label="Download"
          >
            <i className="fa-solid fa-download mr-1"></i>
            Download
          </button>
          <button 
            onClick={() => onDelete && onDelete(doc)}
            className="btn-danger px-2 py-2 text-xs"
            aria-label="Delete"
          >
            <i className="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    );
  }

  // GRID VIEW
  return (
    <div className="file-card p-3 lg:p-4 animate-slide-up group">
      {/* Favorite Button */}
      {onFavorite && (
        <button 
          onClick={(e) => { e.stopPropagation(); onFavorite(doc); }}
          className={`absolute top-2 right-2 z-10 p-1.5 rounded-lg transition ${
            isFavorite ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' : 'text-gray-400 hover:text-yellow-500 opacity-0 group-hover:opacity-100'
          }`}
          aria-label="Favorite"
        >
          <i className={`fa-${isFavorite ? 'solid' : 'regular'} fa-star text-xs`}></i>
        </button>
      )}

      {/* File Icon */}
      <div className={`w-10 h-10 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl bg-gradient-to-br ${gradientMap[fileColor]} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg`}>
        <i className={`fa-solid ${fileIcon} text-white text-sm lg:text-xl`}></i>
      </div>

      {/* Content */}
      <div className="mb-3">
        <h3 className="font-semibold text-xs lg:text-sm line-clamp-2 mb-1" title={doc.fileName}>
          {truncateText(doc.fileName, 20)}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 hidden lg:block">
          {doc.description || 'No description'}
        </p>
      </div>

      {/* Meta */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
        <span className="badge badge-primary text-xs">
          {doc.category}
        </span>
        <span className="hidden lg:inline">
          {doc.sizeFormatted}
        </span>
      </div>

      {/* Actions - Responsive: Icon only on mobile, full text on desktop */}
      <div className="flex gap-1.5">
        <button 
          onClick={() => onView && onView(doc)}
          className="flex-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 px-2 py-2 rounded-lg text-xs font-medium hover:border-primary hover:text-primary transition flex items-center justify-center gap-1 whitespace-nowrap"
          aria-label="View"
        >
          <i className="fa-solid fa-eye"></i>
          <span className="hidden sm:inline">View</span>
        </button>
        <button 
          onClick={() => onDownload && onDownload(doc)}
          className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-2 py-2 rounded-lg text-xs font-medium hover:from-blue-600 hover:to-blue-700 transition flex items-center justify-center gap-1 shadow-lg shadow-blue-500/30 whitespace-nowrap"
          aria-label="Download"
        >
          <i className="fa-solid fa-download"></i>
          <span className="hidden sm:inline">Download</span>
        </button>
        <button 
          onClick={() => onDelete && onDelete(doc)}
          className="bg-red-500 hover:bg-red-600 text-white px-2 py-2 rounded-lg text-xs transition shadow-lg shadow-red-500/30"
          aria-label="Delete"
        >
          <i className="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>
  );
}
