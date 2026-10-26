import Link from "next/link";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { Calendar, Eye, MapPin, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_OSSERVAZIONE_TONE, TONE, potentialTone } from "@/lib/tones";
import {
  PIEDE_LABEL,
  RUOLO_LABEL,
  STATUS_OSSERVAZIONE_LABEL,
  VOTO_POTENZIALE_LABEL,
  calcolaEta,
  type PlayerListItem,
} from "@/lib/types/scouting";

function PhotoAvatar({
  src,
  initials,
}: {
  src: string | null;
  initials: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        loading="lazy"
        className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-1 ring-border/50"
      />
    );
  }
  return (
    <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary/25 via-primary/10 to-transparent ring-1 ring-primary/30 text-lg font-bold uppercase tracking-tight text-primary">
      {initials}
    </span>
  );
}

export function PlayerCard({
  player,
  canEdit = false,
}: {
  player: PlayerListItem;
  canEdit?: boolean;
}) {
  const eta = calcolaEta(player.data_nascita);
  const initials = `${(player.nome ?? "").charAt(0)}${(player.cognome ?? "").charAt(0)}`;
  // Stato di osservazione e voto potenziale: colori con significato (lib/tones.ts).
  const status = TONE[STATUS_OSSERVAZIONE_TONE[player.status_osservazione]];
  const votoCls = player.voto_potenziale
    ? TONE[potentialTone(player.voto_potenziale)].badge
    : TONE.neutral.badge;

  const scadenzaFmt = player.scadenza_contratto
    ? format(parseISO(player.scadenza_contratto), "MMM yyyy", { locale: it })
    : null;

  return (
    <div className="relative">
      {canEdit && (
        <Link
          href={`/scouting/${player.id}/modifica`}
          aria-label={`Modifica ${player.nome} ${player.cognome}`}
          title="Modifica rapida"
          className="absolute bottom-2.5 right-2.5 z-10 grid h-8 w-8 place-items-center rounded-lg border border-border/60 bg-background/80 text-muted-foreground opacity-70 backdrop-blur transition-all hover:border-primary/50 hover:bg-background hover:text-primary hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Link>
      )}
      <Link
        href={`/scouting/${player.id}`}
        className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/50 transition-all hover:border-primary/40 hover:bg-card/80 hover:shadow-lg hover:shadow-overlay/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
      <div className="flex items-start gap-3 p-4">
        <PhotoAvatar src={player.foto_url} initials={initials || "??"} />
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            {player.nome}
          </p>
          <p
            className="truncate text-lg font-semibold tracking-tight uppercase text-foreground group-hover:text-primary"
            title={player.cognome}
          >
            {player.cognome}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            {eta !== null && <span>{eta} anni</span>}
            {eta !== null && player.ruolo_principale && (
              <span className="opacity-30">·</span>
            )}
            {player.ruolo_principale && (
              <span
                className="font-medium text-foreground"
                title={RUOLO_LABEL[player.ruolo_principale]}
              >
                {player.ruolo_principale}
              </span>
            )}
            {player.piede && (
              <>
                <span className="opacity-30">·</span>
                <span>{PIEDE_LABEL[player.piede]}</span>
              </>
            )}
          </div>
        </div>

        <span
          className={cn(
            "shrink-0 rounded-lg px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ring-1",
            votoCls,
          )}
          title={
            player.voto_potenziale
              ? VOTO_POTENZIALE_LABEL[player.voto_potenziale]
              : "Voto potenziale non assegnato"
          }
        >
          {player.voto_potenziale ?? "—"}
        </span>
      </div>

      <div className="mt-auto space-y-1.5 border-t border-border/40 px-4 py-3 text-[11px]">
        {(player.squadra_attuale || player.campionato) && (
          <p className="flex items-center gap-1.5 text-foreground/80">
            <MapPin className="h-3 w-3 text-muted-foreground" />
            <span className="truncate font-medium">
              {player.squadra_attuale ?? "—"}
            </span>
            {player.campionato && (
              <>
                <span className="text-muted-foreground/50">·</span>
                <span className="truncate text-muted-foreground">
                  {player.campionato}
                </span>
              </>
            )}
          </p>
        )}
        {scadenzaFmt && (
          <p className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>
              Scadenza <span className="capitalize">{scadenzaFmt}</span>
            </span>
          </p>
        )}
        <p className="flex items-center gap-1.5 text-muted-foreground">
          <Eye className="h-3 w-3" />
          {player.ultima_osservazione ? (
            <span>
              Ultima osservazione {format(parseISO(player.ultima_osservazione), "d MMM", { locale: it })}
              {" · "}
              {player.numero_osservazioni === 1
                ? "1 osservazione"
                : `${player.numero_osservazioni} osservazioni`}
            </span>
          ) : (
            <span>Nessuna osservazione</span>
          )}
        </p>
        <p
          className={cn(
            "flex items-center gap-1.5 text-[10px] uppercase tracking-wider",
            status.text,
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", status.solid)} />
          {STATUS_OSSERVAZIONE_LABEL[player.status_osservazione]}
        </p>
      </div>
      </Link>
    </div>
  );
}
