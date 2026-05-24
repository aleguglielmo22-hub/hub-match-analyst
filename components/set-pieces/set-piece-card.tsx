import Link from "next/link";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import {
  ArrowUp,
  Shield,
  Clock,
  Goal,
  Target,
  CornerUpRight,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ESITO_FINALE_LABEL,
  ESITO_TINT,
  FASE_LABEL,
  TIPO_PIAZZATO_LABEL,
  type EsitoFinaleEnum,
  type SetPieceListItem,
  type TipoPiazzatoEnum,
} from "@/lib/types/set-pieces";

const TIPO_ICON: Record<TipoPiazzatoEnum, typeof Target> = {
  ANGOLO: CornerUpRight,
  PUNIZIONE: Target,
  RIMESSA_LATERALE: ArrowUp,
  RIGORE: Goal,
};

const ESITO_CLASS: Record<EsitoFinaleEnum, string> = {
  GOL: "bg-emerald-500/20 text-emerald-200 ring-emerald-400/40",
  TIRO_IN_PORTA: "bg-emerald-500/10 text-emerald-200 ring-emerald-400/20",
  TIRO_FUORI: "bg-slate-500/15 text-slate-300 ring-slate-400/20",
  LIBERATO_DIFESA: "bg-slate-500/15 text-slate-300 ring-slate-400/20",
  FALLO_COMMESSO: "bg-rose-500/15 text-rose-200 ring-rose-400/30",
  FALLO_SUBITO: "bg-amber-500/15 text-amber-200 ring-amber-400/30",
  FUORIGIOCO: "bg-slate-500/15 text-slate-300 ring-slate-400/20",
  TRANSIZIONE_SUBITA: "bg-rose-500/20 text-rose-200 ring-rose-400/40",
};

export function SetPieceCard({ item }: { item: SetPieceListItem }) {
  const Icon = TIPO_ICON[item.tipo_piazzato] ?? Target;
  const fasePos = item.fase === "OFFENSIVO";
  const dataFmt = item.data_evento
    ? format(parseISO(item.data_evento), "d MMM yyyy", { locale: it })
    : null;
  const matchup =
    item.squadra_esecutrice && item.squadra_avversaria
      ? `${item.squadra_esecutrice} vs ${item.squadra_avversaria}`
      : (item.squadra_esecutrice ?? item.squadra_avversaria ?? null);

  return (
    <Link
      href={`/set-pieces/${item.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/50 transition-all hover:border-primary/40 hover:bg-card/80 hover:shadow-lg hover:shadow-black/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {/* Anteprima lavagna tattica, se presente; altrimenti banda colorata. */}
      <div className="relative h-32 overflow-hidden bg-gradient-to-br from-slate-900 to-slate-950">
        {item.lavagna_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.lavagna_image_url}
            alt={`Lavagna tattica: ${item.titolo}`}
            loading="lazy"
            className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Icon className="h-10 w-10 text-muted-foreground/40" />
            <ImageIcon className="absolute right-3 top-3 h-3.5 w-3.5 text-muted-foreground/30" />
          </div>
        )}
        {/* Badge fase Off/Dif sovrapposto in alto a sinistra. */}
        <span
          className={cn(
            "absolute left-3 top-3 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-sm ring-1",
            fasePos
              ? "bg-emerald-500/15 text-emerald-200 ring-emerald-400/30"
              : "bg-sky-500/15 text-sky-200 ring-sky-400/30",
          )}
        >
          {fasePos ? <Goal className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
          {FASE_LABEL[item.fase]}
        </span>
        {/* Badge esito in alto a destra. */}
        {item.esito_finale && (
          <span
            className={cn(
              "absolute right-3 top-3 inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-sm ring-1",
              ESITO_CLASS[item.esito_finale],
            )}
            title={ESITO_FINALE_LABEL[item.esito_finale]}
          >
            {ESITO_FINALE_LABEL[item.esito_finale]}
          </span>
        )}
        {item.video_url && (
          // Indicatore "ha un video allegato"
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-md bg-black/40 px-1.5 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-sm">
            ▶ Video
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {TIPO_PIAZZATO_LABEL[item.tipo_piazzato]}
            </p>
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-primary">
              {item.titolo}
            </h3>
          </div>
        </div>

        {matchup && (
          <p className="truncate text-xs text-foreground/80" title={matchup}>
            {matchup}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          {dataFmt && <span className="capitalize">{dataFmt}</span>}
          {typeof item.minuto === "number" && (
            <>
              <span className="opacity-30">·</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {item.minuto}&apos;
              </span>
            </>
          )}
          {item.punteggio && (
            <>
              <span className="opacity-30">·</span>
              <span className="font-mono">{item.punteggio}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

// Esito helper exports for badge classes; non rotti se non importati.
void ESITO_TINT;
