/**
 * Skeletons usati come fallback dei <Suspense> nella dashboard.
 * Mantengono la stessa altezza dei componenti reali per evitare layout-shift.
 */

export function KpiCardsSkeleton() {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-36 animate-pulse rounded-2xl border border-border/40 bg-card/30"
        />
      ))}
    </div>
  );
}

export function RecentActivitySkeleton() {
  return (
    <section className="rounded-2xl border border-border/60 bg-card/40 p-5">
      <div className="mb-4 h-4 w-32 animate-pulse rounded bg-muted/40" />
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="h-2.5 w-20 animate-pulse rounded bg-muted/30" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-lg border border-border/30 bg-card/20"
            />
          ))}
        </div>
        <div className="space-y-2">
          <div className="h-2.5 w-32 animate-pulse rounded bg-muted/30" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-lg border border-border/30 bg-card/20"
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export function EfficacyWidgetSkeleton() {
  return (
    <section className="h-32 animate-pulse rounded-2xl border border-border/40 bg-card/30" />
  );
}
