import { useState } from "react";
import { Info, Lock } from "lucide-react";
import type { MatchListItem } from "@shared/api";
import { FAMILIES, findEvent, type ActionPair, type OpenRecording, type Panel, type Side, type Tag } from "@shared/panel";
import type { EventKeys } from "@shared/panel-shortcuts";
import { comboLabel } from "@shared/shortcuts";
import { formatTimecode } from "@shared/time";
import { cn } from "../lib/api";
import { ActionCard } from "./ActionCard";

/** Colonna destra: squadra, evento in registrazione, pulsanti degli eventi, scheda dell'azione. */
export function CodingPanel({
  panel,
  match,
  preferred,
  onPreferred,
  lockMessage,
  eventKeys,
  open,
  nowMs,
  onPress,
  selected,
  onUpdateTag,
  onDelete,
  onSeek,
}: {
  panel: Panel | null | undefined;
  match: MatchListItem;
  preferred: Side | null;
  onPreferred: (s: Side) => void;
  lockMessage: string | null;
  eventKeys: EventKeys;
  open: OpenRecording[];
  nowMs: number;
  onPress: (code: string) => void;
  selected: ActionPair | null;
  onUpdateTag: (id: string, patch: Partial<Pick<Tag, "labels" | "note" | "stars">>) => void;
  onDelete: (pairId: string) => void;
  onSeek: (ms: number) => void;
}) {
  const [showLock, setShowLock] = useState(false);
  const teams: Record<Side, string> = { home: match.home?.label ?? "Casa", away: match.away?.label ?? "Ospite" };

  return (
    <aside className="flex w-[23rem] shrink-0 flex-col border-l border-border bg-card" aria-label="Pannello di codifica">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <p className="flex gap-2 rounded-lg bg-muted px-3 py-2 text-[11px] leading-snug text-muted-foreground">
          <Info className="mt-px h-3.5 w-3.5 shrink-0" />
          Anteprima: le azioni restano finché la partita è aperta e non vengono salvate.
        </p>

        {panel === undefined ? null : !panel ? (
          <p className="text-sm text-muted-foreground">
            Nessun pannello: importalo da <span className="font-medium text-foreground">Impostazioni → Pannello di codifica</span>.
          </p>
        ) : !preferred ? (
          <div className="space-y-3 rounded-xl border border-primary/50 p-4">
            <p className="text-sm font-medium">Per quale squadra codifichi?</p>
            <p className="text-xs text-muted-foreground">
              Gli eventi registrati sono della squadra scelta; lo specchio va all'altra.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(["home", "away"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onPreferred(s)}
                  className="truncate rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"
                >
                  {teams[s]}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <section className="space-y-1.5">
              <h2 className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Codifichi per</h2>
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1" role="radiogroup" aria-label="Squadra">
                {(["home", "away"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={preferred === s}
                    aria-disabled={!!lockMessage && preferred !== s}
                    onClick={() => {
                      if (preferred === s) return;
                      if (lockMessage) setShowLock(true);
                      else onPreferred(s);
                    }}
                    className={cn(
                      "flex items-center justify-center gap-1.5 truncate rounded-md px-2 py-1.5 text-xs",
                      preferred === s ? "bg-card font-medium shadow-sm" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {lockMessage && preferred !== s && <Lock className="h-3 w-3" />}
                    {teams[s]}
                  </button>
                ))}
              </div>
              {showLock && lockMessage && (
                <p role="status" className="flex gap-2 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground">
                  <Lock className="mt-px h-3.5 w-3.5 shrink-0" />
                  {lockMessage}
                </p>
              )}
            </section>

            <RecordingBar panel={panel} open={open} nowMs={nowMs} onStop={onPress} />

            {FAMILIES.map((f) => {
              const events = panel.events.filter((e) => e.family === f.id);
              if (events.length === 0) return null;
              return (
                <section key={f.id} className="space-y-1.5">
                  <h2 className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{f.label}</h2>
                  <div className="grid grid-cols-2 gap-1.5">
                    {events.map((e) => {
                      const active = open.some((o) => o.code === e.code);
                      return (
                        <button
                          key={e.code}
                          type="button"
                          onClick={() => onPress(e.code)}
                          aria-pressed={active}
                          title={e.mirrorCode ? `Specchio: ${findEvent(panel, e.mirrorCode)?.name}` : "Senza specchio"}
                          className={cn(
                            "flex min-h-11 items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-[13px] leading-tight transition-colors",
                            active ? "border-primary bg-primary-soft font-medium" : "border-border hover:bg-muted",
                          )}
                        >
                          <span className="h-6 w-1 shrink-0 rounded-full" style={{ background: e.color }} aria-hidden />
                          <span className="min-w-0 flex-1">{e.name}</span>
                          {eventKeys[e.code] && (
                            <kbd className="rounded border border-border px-1.5 font-mono text-[11px] text-muted-foreground">
                              {comboLabel(eventKeys[e.code])}
                            </kbd>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}

            {selected ? (
              <ActionCard
                key={selected.original.id}
                panel={panel}
                pair={selected}
                preferred={preferred}
                teams={teams}
                onUpdateTag={onUpdateTag}
                onDelete={onDelete}
                onSeek={onSeek}
              />
            ) : (
              <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                Premi la lettera di un evento per iniziare, di nuovo per chiuderlo. L'azione si apre qui per sottotag, note e stelle.
              </p>
            )}
          </>
        )}
      </div>
    </aside>
  );
}

function RecordingBar({ panel, open, nowMs, onStop }: { panel: Panel; open: OpenRecording[]; nowMs: number; onStop: (code: string) => void }) {
  if (open.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-muted-foreground/40" aria-hidden />
        Nessun evento in registrazione
      </div>
    );
  }
  return (
    <div className="space-y-1" aria-live="polite">
      {open.map((o) => (
        <div key={o.code} className="flex items-center gap-2 rounded-lg border border-destructive/50 px-3 py-2 text-sm">
          <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" aria-hidden />
          <span className="text-[11px] font-semibold text-destructive">REC</span>
          <span className="min-w-0 flex-1 truncate font-medium">{findEvent(panel, o.code)?.name}</span>
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {formatTimecode(Math.max(0, nowMs - o.startMs) / 1000).replace(/\.\d+$/, "")}
          </span>
          <button type="button" onClick={() => onStop(o.code)} className="rounded-md px-2 py-0.5 text-xs hover:bg-muted">
            Termina
          </button>
        </div>
      ))}
    </div>
  );
}
