import Link from "next/link";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { Pencil, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { LoadErrorBox } from "@/components/app/load-error";
import { LinkPendingIcon } from "@/components/app/link-pending-icon";
import { TONE, ratingTone } from "@/lib/tones";
import { cn } from "@/lib/utils";
import { RUOLO_LABEL } from "@/lib/types/scouting";
import { summarizeObservations } from "@/lib/scouting/observations";
import type { ObservationItem } from "@/app/(app)/scouting/osservazioni/actions";
import { VoteSparkline } from "./vote-sparkline";
import { DeleteObservationButton } from "./delete-observation-button";

const fmtDate = (iso: string) => format(parseISO(iso), "d MMM yyyy", { locale: it });

function matchLabel(o: ObservationItem): string | null {
  const teams =
    o.team_casa && o.team_ospite
      ? `${o.team_casa} – ${o.team_ospite}`
      : (o.team_casa ?? o.team_ospite);
  return [teams, o.competizione].filter(Boolean).join(" · ") || null;
}

/** Sezione "Osservazioni" della scheda giocatore: riepilogo + storico. */
export function ObservationsSection({
  playerId,
  observations,
}: {
  playerId: string;
  /** null = errore di caricamento. */
  observations: ObservationItem[] | null;
}) {
  const addHref = `/scouting/osservazioni/nuova?giocatore=${playerId}`;

  return (
    <section className="space-y-4 rounded-2xl border border-border/60 bg-card/40 p-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Osservazioni{observations ? ` (${observations.length})` : ""}
        </h2>
        <Link href={addHref} className={buttonVariants({ size: "default" })}>
          <LinkPendingIcon className="mr-2 h-4 w-4">
            <Plus className="mr-2 h-4 w-4" />
          </LinkPendingIcon>
          Osservazione
        </Link>
      </header>

      {observations === null ? (
        <LoadErrorBox />
      ) : observations.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
          Nessuna osservazione. Aggiungi la prima dopo una partita: bastano data, voto o nota.
        </p>
      ) : (
        <>
          <Summary observations={observations} />
          <ol className="divide-y divide-border/50">
            {observations.map((o) => (
              <ObservationRow key={o.id} o={o} />
            ))}
          </ol>
        </>
      )}
    </section>
  );
}

function Summary({ observations }: { observations: ObservationItem[] }) {
  const s = summarizeObservations(observations);
  const stats: { label: string; value: React.ReactNode }[] = [
    { label: "Osservazioni", value: s.count },
    { label: "Media voto", value: s.average != null ? s.average.toFixed(1).replace(".", ",") : "—" },
    {
      label: "Ultimo voto",
      value:
        s.lastVoto != null ? (
          <span className={TONE[ratingTone(s.lastVoto)].text}>{s.lastVoto}</span>
        ) : (
          "—"
        ),
    },
    { label: "Ultima osservazione", value: s.lastDate ? fmtDate(s.lastDate) : "—" },
  ];
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        {stats.map((st) => (
          <div key={st.label} className="space-y-0.5">
            <dt className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              {st.label}
            </dt>
            <dd className="text-lg font-semibold tabular-nums">{st.value}</dd>
          </div>
        ))}
      </dl>
      <VoteSparkline points={s.trend} />
    </div>
  );
}

function ObservationRow({ o }: { o: ObservationItem }) {
  const match = matchLabel(o);
  return (
    <li className="flex gap-3 py-3">
      <span
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-lg text-base font-semibold tabular-nums ring-1",
          o.voto != null ? TONE[ratingTone(o.voto)].badge : "bg-muted text-muted-foreground ring-border",
        )}
        title={o.voto != null ? `Voto ${o.voto}` : "Senza voto"}
      >
        {o.voto ?? "—"}
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{fmtDate(o.data_osservazione)}</span>
          {match && <> · {match}</>}
          {o.ruolo_giocato && (
            <>
              {" "}
              · <span title={RUOLO_LABEL[o.ruolo_giocato]}>{o.ruolo_giocato}</span>
            </>
          )}
          {o.importata && <> · importata dalle note rapide</>}
        </p>
        {o.nota && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{o.nota}</p>
        )}
      </div>
      {o.can_edit && (
        <div className="flex shrink-0 items-start gap-1">
          <Link
            href={`/scouting/osservazioni/${o.id}/modifica`}
            aria-label="Modifica osservazione"
            title="Modifica"
            className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground max-md:h-11 max-md:w-11"
          >
            <Pencil className="h-4 w-4" />
          </Link>
          <DeleteObservationButton id={o.id} dateLabel={fmtDate(o.data_osservazione)} />
        </div>
      )}
    </li>
  );
}
