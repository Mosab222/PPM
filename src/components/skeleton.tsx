export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-background ${className}`} />;
}

export function SkeletonFilterBar({ fields = 4 }: { fields?: number }) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="flex flex-col gap-1">
          <SkeletonBlock className="h-3 w-16" />
          <SkeletonBlock className="h-8 w-32" />
        </div>
      ))}
      <SkeletonBlock className="h-8 w-20" />
    </div>
  );
}

export function SkeletonSummaryCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-4">
          <SkeletonBlock className="h-3 w-20" />
          <SkeletonBlock className="mt-2 h-7 w-12" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 8, columns = 6 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex gap-4 border-b border-border p-4">
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonBlock key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 border-b border-border p-4 last:border-0">
          {Array.from({ length: columns }).map((_, c) => (
            <SkeletonBlock key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonChartArea({ className = "h-64" }: { className?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <SkeletonBlock className="mb-4 h-5 w-40" />
      <SkeletonBlock className={`w-full ${className}`} />
    </div>
  );
}
