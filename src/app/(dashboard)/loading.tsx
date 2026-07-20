function SkeletonBlock({ className }: { className: string }) {
  return <div className={`rounded-md bg-muted ${className}`} />;
}

export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-label="Loading section">
      <div className="space-y-3">
        <SkeletonBlock className="h-8 w-56 max-w-full" />
        <SkeletonBlock className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-md border bg-surface p-4">
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="mt-4 h-8 w-32" />
            <SkeletonBlock className="mt-3 h-3 w-36" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-md border bg-surface p-4">
          <SkeletonBlock className="h-5 w-40" />
          <div className="mt-6 space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-10 w-full" />
            ))}
          </div>
        </div>
        <div className="rounded-md border bg-surface p-4">
          <SkeletonBlock className="h-5 w-44" />
          <SkeletonBlock className="mt-6 h-72 w-full" />
        </div>
      </div>
    </div>
  );
}
