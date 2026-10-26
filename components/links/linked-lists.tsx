import { LoadErrorBox } from "@/components/app/load-error";
import { Badge } from "@/components/ui/badge";
import { ESITO_TONE, TONE } from "@/lib/tones";
import { cn } from "@/lib/utils";
import { esitoLabel } from "@/lib/types/set-pieces";
import { SET_PIECE_ROLE_LABEL } from "@/lib/set-pieces/player-roles";
import type { PlayerSetPiece, SetPiecePlayer } from "@/app/(app)/collegamenti/actions";
import { LinkRow } from "./link-picker";

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number | null;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-2xl border border-border/60 bg-card/40 p-5">
      <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {title}
        {count !== null ? ` (${count})` : ""}
      </h2>
      {children}
    </section>
  );
}

/** Dettaglio del piazzato: giocatori coinvolti con il ruolo (si modificano dal form). */
export function SetPiecePlayersList({
  players,
  editHint,
}: {
  players: SetPiecePlayer[] | null;
  editHint?: string;
}) {
  return (
    <Section title="Giocatori coinvolti" count={players?.length ?? null}>
      {players === null ? (
        <LoadErrorBox />
      ) : players.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nessun giocatore collegato.{editHint ? ` ${editHint}` : ""}
        </p>
      ) : (
        <ul className="divide-y divide-border/40">
          {players.map((p) => (
            <LinkRow key={`${p.id}|${p.ruolo}`} target={p}>
              <Badge variant="outline" className="shrink-0 text-[10px]">
                {SET_PIECE_ROLE_LABEL[p.ruolo]}
              </Badge>
            </LinkRow>
          ))}
        </ul>
      )}
    </Section>
  );
}

/** Dettaglio del giocatore: piazzati in cui compare, con ruolo ed esito colorato. */
export function PlayerSetPiecesList({ setPieces }: { setPieces: PlayerSetPiece[] | null }) {
  return (
    <Section title="Piazzati" count={setPieces?.length ?? null}>
      {setPieces === null ? (
        <LoadErrorBox />
      ) : setPieces.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Non compare in nessun piazzato. Si collega dal form del piazzato, in “Giocatori coinvolti”.
        </p>
      ) : (
        <ul className="divide-y divide-border/40">
          {setPieces.map((s) => (
            <LinkRow key={`${s.id}|${s.ruolo}`} target={s}>
              <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center">
                <Badge variant="outline" className="text-[10px]">
                  {SET_PIECE_ROLE_LABEL[s.ruolo]}
                </Badge>
                {s.esito_finale && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "border-transparent text-[10px] ring-1",
                      // Colore = esito per la mia squadra (si inverte nei piazzati difensivi).
                      TONE[ESITO_TONE[s.fase][s.esito_finale]].badge,
                    )}
                  >
                    {esitoLabel(s.esito_finale, s.fase)}
                  </Badge>
                )}
              </div>
            </LinkRow>
          ))}
        </ul>
      )}
    </Section>
  );
}
