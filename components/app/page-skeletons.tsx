/**
 * Scheletri a pagina intera per i loading.tsx: compaiono subito al tocco,
 * mentre il server prepara la pagina. Stesso stile degli scheletri della
 * Dashboard (components/dashboard/dashboard-skeletons.tsx) e stessi contenitori
 * delle pagine reali, per evitare salti di layout.
 */

function Bar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-muted/40 ${className}`} />;
}

function HeaderSkeleton({ withAction = true }: { withAction?: boolean }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <div className="h-9 w-9 animate-pulse rounded-lg bg-primary/15" />
        <div className="space-y-2">
          <Bar className="h-2.5 w-16" />
          <Bar className="h-7 w-44" />
        </div>
      </div>
      {withAction && (
        <div className="h-9 w-40 animate-pulse rounded-lg bg-muted/30" />
      )}
    </div>
  );
}

function CardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-44 animate-pulse rounded-2xl border border-border/40 bg-card/30"
        />
      ))}
    </div>
  );
}

/** Liste di sezione (Scouting, Set Pieces, Training, Cloud, Cestino). */
export function ListPageSkeleton({ withFilters = true }: { withFilters?: boolean }) {
  const list = (
    <div className="flex flex-col gap-4">
      <div className="h-9 animate-pulse rounded-lg border border-border/40 bg-card/20" />
      <Bar className="h-3 w-24" />
      <CardsSkeleton />
    </div>
  );
  return (
    <div
      className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-10"
      aria-busy="true"
      aria-label="Caricamento"
    >
      <HeaderSkeleton withAction={withFilters} />
      {withFilters ? (
        <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <div className="hidden h-[28rem] animate-pulse rounded-2xl border border-border/40 bg-card/30 lg:block" />
          {list}
        </div>
      ) : (
        list
      )}
    </div>
  );
}

/** Pagine di dettaglio (giocatore, piazzato, esercitazione, elemento Cloud). */
export function DetailPageSkeleton() {
  return (
    <div
      className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-8 sm:py-10"
      aria-busy="true"
      aria-label="Caricamento"
    >
      <Bar className="h-3 w-32" />
      <div className="h-40 animate-pulse rounded-2xl border border-border/40 bg-card/30" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-56 animate-pulse rounded-2xl border border-border/40 bg-card/30" />
        <div className="h-56 animate-pulse rounded-2xl border border-border/40 bg-card/30" />
      </div>
      <div className="h-48 animate-pulse rounded-2xl border border-border/40 bg-card/30" />
    </div>
  );
}

/** Form di inserimento/modifica. */
export function FormPageSkeleton() {
  return (
    <div
      className="mx-auto max-w-4xl space-y-5 px-4 py-6 sm:px-8 sm:py-10"
      aria-busy="true"
      aria-label="Caricamento"
    >
      <div className="space-y-2">
        <Bar className="h-3 w-32" />
        <Bar className="h-8 w-56" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="h-52 animate-pulse rounded-2xl border border-border/40 bg-card/30"
        />
      ))}
    </div>
  );
}
