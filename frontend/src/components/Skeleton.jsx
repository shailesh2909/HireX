import React from 'react';

export const Skeleton = ({ className }) => (
  <div className={`skeleton ${className}`} />
);

export const PostSkeleton = () => (
  <div className="rounded-sm border border-[#e2e8f0] bg-white p-6 shadow-sm mb-4">
    <div className="flex items-center gap-3">
      <Skeleton className="h-10 w-10 rounded-sm" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
    <div className="mt-4 space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-4/6" />
    </div>
    <div className="mt-6 flex gap-4">
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-8 w-16" />
    </div>
  </div>
);

export const NetworkCardSkeleton = () => (
  <div className="rounded-sm border border-[#e2e8f0] bg-white p-6 shadow-sm">
    <div className="flex flex-col items-center text-center">
      <Skeleton className="h-20 w-20 rounded-sm" />
      <Skeleton className="mt-4 h-5 w-32" />
      <Skeleton className="mt-2 h-4 w-48" />
      <Skeleton className="mt-6 h-9 w-full" />
    </div>
  </div>
);

export const ListSkeleton = () => (
  <div className="space-y-4">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="flex items-center gap-4 rounded-sm border border-[#e2e8f0] bg-white p-4">
        <Skeleton className="h-12 w-12 rounded-sm" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-8 w-20" />
      </div>
    ))}
  </div>
);
