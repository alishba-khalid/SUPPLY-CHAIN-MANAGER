export default function DashboardLoading() {
  return (
    <div className="space-y-8 p-8 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-64 rounded-md bg-(--color-surface-secondary)" />
        <div className="h-4 w-96 rounded-md bg-(--color-surface-secondary)" />
      </div>

      {/* KPI Cards skeleton */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-24 rounded-xl border border-(--color-border) bg-(--color-surface) p-4 space-y-2">
            <div className="h-3 w-20 rounded bg-(--color-surface-secondary)" />
            <div className="h-7 w-14 rounded bg-(--color-surface-secondary)" />
          </div>
        ))}
      </div>

      {/* Main panel skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-80 rounded-xl border border-(--color-border) bg-(--color-surface) p-6 space-y-4">
          <div className="h-5 w-32 rounded bg-(--color-surface-secondary)" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-(--color-surface-secondary)" />
            ))}
          </div>
        </div>
        <div className="h-80 rounded-xl border border-(--color-border) bg-(--color-surface) p-6 space-y-4">
          <div className="h-5 w-36 rounded bg-(--color-surface-secondary)" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-(--color-surface-secondary)" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
