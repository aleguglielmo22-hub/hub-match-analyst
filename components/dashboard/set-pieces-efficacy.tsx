import Link from "next/link";
import { Activity, ArrowUpRight } from "lucide-react";
import { loadDashboardKpis } from "@/app/(app)/dashboard-queries";
import { LoadErrorBox } from "@/components/app/load-error";

/**
 * Widget di analisi rapida sull'efficacia dei calci piazzati.
 * Calcola la percentuale di schemi con esito GOL sul totale di quelli
 * con esito tracciato (esclude i null che falserebbero la statistica).
 */
export async function SetPiecesEfficacyWidget() {
  let k: Awaited<ReturnType<typeof loadDashboardKpis>>;
  try {
    k = await loadDashboardKpis();
  } catch {
    return <LoadErrorBox />;
  }

  const ratioBase = k.setPiecesConEsito;
  const pct =
    ratioBase > 0 ? Math.round((k.setPiecesGol / ratioBase) * 100) : null;

  // Nessun esito tracciato → mostriamo una variante con CTA invece di numeri vuoti.
  const hasData = ratioBase > 0;

  return (
    <section className="rounded-2xl border border-border/60 bg-gradient-to-br from-tone-success-soft via-card/40 to-card/40 p-5">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-tone-success-soft text-tone-success-fg ring-1 ring-tone-success/40">
            <Activity className="h-4 w-4" />
          </span>
          <h2 className="text-sm font-semibold tracking-tight">
            Efficacia calci piazzati
          </h2>
        </div>
        <Link
          href="/set-pieces?esito=GOL"
          className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
        >
          Schemi con gol
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </header>

      {!hasData ? (
        <div className="grid place-items-center gap-2 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            Nessuno schema con esito tracciato.
          </p>
          <Link
            href="/set-pieces/nuovo"
            className="text-xs text-primary hover:underline"
          >
            Aggiungi il primo schema →
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)]">
          {/* Big percentage */}
          <div className="space-y-1">
            <p className="text-4xl font-semibold tabular-nums tracking-tight text-tone-success-fg">
              {pct}
              <span className="ml-0.5 text-2xl text-tone-success-fg">%</span>
            </p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Conversione in gol
            </p>
          </div>

          {/* Breakdown */}
          <div className="flex flex-col justify-center gap-2 text-xs">
            <p className="text-foreground/90">
              <span className="font-semibold text-tone-success-fg">
                {k.setPiecesGol}
              </span>{" "}
              gol su{" "}
              <span className="font-semibold">{k.setPiecesConEsito}</span>{" "}
              schemi con esito tracciato.
            </p>
            <p className="text-muted-foreground">
              {k.setPiecesTotal - k.setPiecesConEsito} schemi non ancora
              etichettati con un esito.
            </p>

            {/* Barra di progresso visiva */}
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
              <div
                className="h-full rounded-full bg-tone-success transition-all"
                style={{ width: `${pct ?? 0}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
