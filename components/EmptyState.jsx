'use client';

export default function EmptyState({ icon = 'fa-folder-open', title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
      <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-6">
        <i className={`fa-solid ${icon} text-4xl text-gray-400 dark:text-gray-500`}></i>
      </div>
      <h3 className="text-xl font-semibold mb-2 text-gray-700 dark:text-gray-300">
        {title || 'No items found'}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mb-6">
        {description || 'Get started by creating your first item.'}
      </p>
      {action && (
        <div className="flex gap-3">
          {action}
        </div>
      )}
    </div>
  );
}
