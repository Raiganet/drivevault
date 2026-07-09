'use client';

export function SkeletonCard() {
  return (
    <div className="card p-6 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-xl skeleton"></div>
        <div className="w-16 h-6 rounded-full skeleton"></div>
      </div>
      <div className="w-24 h-8 rounded skeleton mb-2"></div>
      <div className="w-32 h-4 rounded skeleton"></div>
    </div>
  );
}

export function SkeletonDocumentCard() {
  return (
    <div className="file-card p-6 animate-pulse">
      <div className="w-16 h-16 rounded-2xl skeleton mb-4"></div>
      <div className="w-full h-4 rounded skeleton mb-2"></div>
      <div className="w-3/4 h-3 rounded skeleton mb-4"></div>
      <div className="flex justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="w-16 h-5 rounded skeleton"></div>
        <div className="w-12 h-4 rounded skeleton"></div>
      </div>
      <div className="flex gap-2">
        <div className="flex-1 h-9 rounded skeleton"></div>
        <div className="flex-1 h-9 rounded skeleton"></div>
        <div className="w-9 h-9 rounded skeleton"></div>
      </div>
    </div>
  );
}

export function SkeletonList() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 card animate-pulse">
          <div className="w-12 h-12 rounded-xl skeleton"></div>
          <div className="flex-1">
            <div className="w-48 h-4 rounded skeleton mb-2"></div>
            <div className="w-32 h-3 rounded skeleton"></div>
          </div>
          <div className="flex gap-2">
            <div className="w-20 h-8 rounded skeleton"></div>
            <div className="w-20 h-8 rounded skeleton"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Banner Skeleton */}
      <div className="card-elevated p-8 animate-pulse">
        <div className="w-64 h-8 rounded skeleton mb-3"></div>
        <div className="w-96 h-4 rounded skeleton"></div>
      </div>

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      {/* Charts & Recent Docs Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6 animate-pulse">
          <div className="w-48 h-6 rounded skeleton mb-6"></div>
          <div className="w-full h-64 rounded-full skeleton"></div>
        </div>
        <div className="card p-6 animate-pulse">
          <div className="w-48 h-6 rounded skeleton mb-6"></div>
          <SkeletonList />
        </div>
      </div>
    </div>
  );
}
