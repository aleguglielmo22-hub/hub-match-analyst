import Link from "next/link";
import { Activity, ArrowUpRight } from "lucide-react";
import { loadSetPiecesEfficacy } from "@/app/(app)/dashboard-queries";
import { LoadErrorBox } from "@/components/app/load-error";
import { cn } from "@/lib/utils";
import { FASE_SET_PIECE_TONE, TONE } from "@/lib/tones";
import type { EfficacyStats, PhaseEfficacy } from "@/lib/set-pieces/efficacy";
import { TIPO_PIAZZATO_LABEL } from "@/lib/types/set-pieces";

/**
 * Widget di analisi rapida sull'efficacia dei calci piazzati, separata per
 * fase: offensivi (esiti positivi, gol fatti) e difensivi (piazzati difesi
 * senza esito negativo, gol subiti). Calcolo in lib/set-pieces/efficacy.ts.
 */
export async function SetPiecesEfficacyWidget() {
  let e: Awaited<ReturnType<typeof loadSetPiecesEfficacy>>;
  try {
    e = await loadSetPiecesEfficacy();
  } catch {
    return <LoadErrorBox />;
  }

  return (
    <section className="rounded-2xl border border-border/60 bg-card/40 p-5">
      <header className="mb-4 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/30">
          <Activity className="h-4 w-4" />
        </span>
        <h2 className="text-sm font-semibold tracking-tight">
          Efficacia calci piazzati
        </h2>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <PhaseBlock
          data={e.OFFENSIVO}
          title="Efficacia offensiva"
          riuscitiLabel="esiti positivi"
          golLabel="gol fatti"
        />
        <PhaseBlock
          data={e.DIFENSIVO}
          title="Tenuta difensiva"
          riuscitiLabel="difesi senza esito negativo"
          golLabel="gol subiti"
        />
      </div>
    </section>
  );
}

/** Blocco di una fase. `linkToList = false` nelle anteprime con dati di esempio (landing). */
export function PhaseBlock({
  data,
  title,
  riuscitiLabel,
  golLabel,
  linkToList = true,
}: {
  data: PhaseEfficacy;
  title: string;
  riuscitiLabel: string;
  golLabel: string;
  linkToList?: boolean;
}) {
  const fase = TONE[FASE_SET_PIECE_TONE[data.fase]];
  // Gol fatti = positivo, gol subiti = negativo (come in ESITO_TONE).
  const golTone = TONE[data.fase === "OFFENSIVO" ? "success" : "danger"];
  const untracked = data.total - data.tracked;

  return (
    <div className={cn("flex flex-col gap-4 rounded-xl border bg-card/40 p-4", fase.border)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", fase.solid)} />
          <h3 className={cn("text-sm font-semibold tracking-tight", fase.text)}>
            {title}
          </h3>
        </div>
        {linkToList && data.total > 0 && (
          <Link
            href={`/set-pieces?fase=${data.fase}`}
            className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
          >
            Schemi
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {data.total === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Nessun piazzato registrato
        </p>
      ) : data.tracked === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Nessun esito registrato su {data.total}{" "}
          {data.total === 1 ? "piazzato" : "piazzati"}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-end gap-x-4 gap-y-2">
            <p className={cn("text-4xl font-semibold tabular-nums tracking-tight", TONE.success.text)}>
              {data.riuscitiPct}
              <span className="ml-0.5 text-2xl">%</span>
            </p>
            <div className="space-y-0.5 pb-1 text-xs">
              <p className="text-foreground/90">
                <span className="font-semibold tabular-nums">
                  {data.riusciti} su {data.tracked}
                </span>{" "}
                {riuscitiLabel}
              </p>
              <p className="text-foreground/90">
                <span className={cn("font-semibold tabular-nums", golTone.text)}>
                  {data.gol} {golLabel}
                </span>{" "}
                <span className="text-muted-foreground tabular-nums">
                  ({data.golPct}%)
                </span>
              </p>
            </div>
            <Bar pct={data.riuscitiPct} className="col-span-2" />
          </div>

          {data.perTipo.length > 0 && (
            <ul className="divide-y divide-border/50 border-t border-border/50 text-xs">
              {data.perTipo.map((t) => (
                <TipoRow
                  key={t.tipo}
                  label={TIPO_PIAZZATO_LABEL[t.tipo]}
                  stats={t}
                  golLabel={golLabel}
                  golClass={golTone.text}
                />
              ))}
            </ul>
          )}

          {untracked > 0 && (
            <p className="text-[11px] text-muted-foreground">
              {untracked} {untracked === 1 ? "piazzato" : "piazzati"} senza
              esito, esclusi dal calcolo.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function TipoRow({
  label,
  stats,
  golLabel,
  golClass,
}: {
  label: string;
  stats: EfficacyStats;
  golLabel: string;
  golClass: string;
}) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-2">
      <span className="truncate font-medium">{label}</span>
      <span className={cn("font-semibold tabular-nums", TONE.success.text)}>
        {stats.riuscitiPct}%
      </span>
      <span className="text-muted-foreground tabular-nums">
        {stats.riusciti} su {stats.tracked} ·{" "}
        <span className={golClass}>
          {stats.gol} {golLabel}
        </span>{" "}
        ({stats.golPct}%)
      </span>
      <Bar pct={stats.riuscitiPct} className="w-16 justify-self-end" />
    </li>
  );
}

function Bar({ pct, className }: { pct: number | null; className?: string }) {
  return (
    <div className={cn("h-1.5 overflow-hidden rounded-full bg-muted/40", className)}>
      <div
        className={cn("h-full rounded-full transition-all", TONE.success.solid)}
        style={{ width: `${pct ?? 0}%` }}
      />
    </div>
  );
}
