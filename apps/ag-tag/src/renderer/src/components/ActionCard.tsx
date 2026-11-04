import { useState } from "react";
import { ChevronRight, CornerDownRight, Play, Star, Trash2 } from "lucide-react";
import {
  findEvent,
  groupsFor,
  needsCompletion,
  toggleLabel,
  type ActionPair,
  type Panel,
  type Side,
  type Stars,
  type Tag,
} from "@shared/panel";
import { formatTimecode } from "@shared/time";
import { cn } from "../lib/api";
import { Button } from "./ui";

const STAR_LABELS: Record<1 | 2 | 3, string> = {
  1: "utile da ricordare",
  2: "può determinare la partita",
  3: "determina la partita",
};

type Patch = Partial<Pick<Tag, "labels" | "note" | "stars">>;

/** Azione selezionata: sottotag, stelle e nota dell'originale; specchio richiudibile. */
export function ActionCard({
  panel,
  pair,
  preferred,
  teams,
  onUpdateTag,
  onDelete,
  onSeek,
}: {
  panel: Panel;
  pair: ActionPair;
  preferred: Side;
  teams: Record<Side, string>;
  onUpdateTag: (id: string, patch: Patch) => void;
  onDelete: (pairId: string) => void;
  onSeek: (ms: number) => void;
}) {
  const { original, mirror } = pair;
  const ev = findEvent(panel, original.eventCode);
  const mirrorEv = mirror ? findEvent(panel, mirror.eventCode) : undefined;
  const [mirrorOpen, setMirrorOpen] = useState(false);
  const toComplete = mirror ? needsCompletion(panel, mirror, preferred) : false;

  return (
    <section className="space-y-4 rounded-xl border border-border p-3.5" aria-label="Azione selezionata">
      <header className="flex items-start gap-2">
        <span className="mt-0.5 h-8 w-1 shrink-0 rounded-full" style={{ background: ev?.color }} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{ev?.name ?? original.eventCode}</p>
          <p className="truncate text-xs text-muted-foreground">
            {teams[original.side]} · {formatTimecode(original.startMs / 1000)} → {formatTimecode(original.endMs / 1000)}
          </p>
        </div>
        <Button variant="ghost" className="h-8 px-2" onClick={() => onSeek(original.startMs)} aria-label="Vai all'inizio" title="Vai all'inizio">
          <Play className="h-4 w-4" />
        </Button>
        <Button variant="danger" className="h-8 px-2" onClick={() => onDelete(original.id)} aria-label="Elimina l'azione" title="Elimina l'azione (con il suo specchio)">
          <Trash2 className="h-4 w-4" />
        </Button>
      </header>

      <TagEditor panel={panel} tag={original} preferred={preferred} onChange={(p) => onUpdateTag(original.id, p)} />

      {mirror && mirrorEv && (
        <div className="border-t border-border pt-3">
          <button
            type="button"
            onClick={() => setMirrorOpen((o) => !o)}
            aria-expanded={mirrorOpen}
            className="flex w-full items-center gap-2 text-left text-sm"
          >
            <ChevronRight className={cn("h-4 w-4 shrink-0 transition-transform", mirrorOpen && "rotate-90")} />
            <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">
              Specchio: <span className="font-medium">{mirrorEv.name}</span>
              <span className="text-muted-foreground"> · {teams[mirror.side]}</span>
            </span>
            {toComplete && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">da completare</span>}
          </button>
          {mirrorOpen && (
            <div className="mt-3">
              <TagEditor panel={panel} tag={mirror} preferred={preferred} onChange={(p) => onUpdateTag(mirror.id, p)} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function TagEditor({ panel, tag, preferred, onChange }: { panel: Panel; tag: Tag; preferred: Side; onChange: (p: Patch) => void }) {
  const ev = findEvent(panel, tag.eventCode);
  const groups = ev ? groupsFor(ev, tag.side, preferred) : [];
  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <fieldset key={g.code} className="space-y-1.5">
          <legend className="text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground">{g.name}</span> · {g.selection === "single" ? "una voce" : "più voci"}
          </legend>
          <div className="flex flex-wrap gap-1">
            {g.labels.map((l) => {
              const on = tag.labels.includes(l.code);
              return (
                <button
                  key={l.code}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onChange({ labels: toggleLabel(groups, tag.labels, l.code) })}
                  className={cn(
                    "border px-2 py-1 text-xs transition-colors",
                    g.selection === "single" ? "rounded-full" : "rounded-md",
                    on ? "border-primary bg-primary-soft font-medium text-foreground" : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {l.name}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div className="flex items-center gap-1" role="radiogroup" aria-label="Stelle">
        {([1, 2, 3] as const).map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={tag.stars === n}
            aria-label={`${n} ${n === 1 ? "stella" : "stelle"}: ${STAR_LABELS[n]}`}
            title={`${n} — ${STAR_LABELS[n]}`}
            onClick={() => onChange({ stars: (tag.stars === n ? 0 : n) as Stars })}
            className="rounded-md p-1 hover:bg-muted"
          >
            <Star className={cn("h-4 w-4", tag.stars >= n ? "fill-primary text-primary" : "text-muted-foreground")} />
          </button>
        ))}
        <span className="ml-1 text-[11px] text-muted-foreground">
          {tag.stars ? STAR_LABELS[tag.stars as 1 | 2 | 3] : "nessuna stella"}
        </span>
      </div>

      <textarea
        value={tag.note}
        onChange={(e) => onChange({ note: e.target.value })}
        placeholder="Nota"
        rows={2}
        maxLength={2000}
        aria-label="Nota"
        className="w-full resize-y rounded-lg border border-input bg-card px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
      />
    </div>
  );
}
