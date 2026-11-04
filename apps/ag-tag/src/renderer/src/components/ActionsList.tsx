import { CornerDownRight, Star } from "lucide-react";
import type { MatchListItem } from "@shared/api";
import {
  filterTags,
  findEvent,
  groupsFor,
  labelNames,
  needsCompletion,
  type ActionPair,
  type Panel,
  type Perspective,
  type Side,
  type Stars,
  type TagFilter,
} from "@shared/panel";
import { formatTimecode } from "@shared/time";
import { cn } from "../lib/api";
import { Select } from "./ui";

/** Elenco delle azioni sotto il video: originali e specchi come tag distinti, con filtri. */
export function ActionsList({
  panel,
  match,
  preferred,
  pairs,
  filter,
  onFilter,
  selectedId,
  onSelect,
}: {
  panel: Panel;
  match: MatchListItem;
  preferred: Side;
  pairs: ActionPair[];
  filter: TagFilter;
  onFilter: (f: TagFilter) => void;
  selectedId: string | null;
  onSelect: (pairId: string) => void;
}) {
  const rows = filterTags(pairs, filter, preferred);
  const teams: Record<Side, string> = { home: match.home?.label ?? "Casa", away: match.away?.label ?? "Ospite" };
  const ownTeam = teams[preferred];
  const oppTeam = teams[preferred === "home" ? "away" : "home"];

  return (
    <section className="flex h-60 shrink-0 flex-col border-t border-border" aria-label="Azioni registrate">
      <div className="flex flex-wrap items-center gap-2 px-6 py-2">
        <h2 className="mr-1 text-sm font-semibold">
          Azioni <span className="font-normal text-muted-foreground">({pairs.length})</span>
        </h2>
        <Select
          aria-label="Filtra per evento"
          value={filter.eventCode ?? ""}
          onChange={(e) => onFilter({ ...filter, eventCode: e.target.value || null })}
          className="h-8 text-xs"
        >
          <option value="">Tutti gli eventi</option>
          {panel.events.map((e) => (
            <option key={e.code} value={e.code}>
              {e.name}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filtra per squadra"
          value={filter.perspective ?? ""}
          onChange={(e) => onFilter({ ...filter, perspective: (e.target.value || null) as Perspective | null })}
          className="h-8 text-xs"
        >
          <option value="">Entrambe le squadre</option>
          <option value="own">{ownTeam}</option>
          <option value="opp">{oppTeam}</option>
        </Select>
        <Select
          aria-label="Filtra per stelle"
          value={filter.minStars}
          onChange={(e) => onFilter({ ...filter, minStars: Number(e.target.value) as Stars })}
          className="h-8 text-xs"
        >
          <option value={0}>Tutte le stelle</option>
          <option value={1}>Almeno 1 stella</option>
          <option value={2}>Almeno 2 stelle</option>
          <option value={3}>3 stelle</option>
        </Select>
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
        {rows.length === 0 && (
          <li className="px-2 py-4 text-sm text-muted-foreground">
            {pairs.length === 0 ? "Ancora nessuna azione." : "Nessuna azione con questi filtri."}
          </li>
        )}
        {rows.map(({ tag, isMirror, pairId }) => {
          const ev = findEvent(panel, tag.eventCode);
          const names = ev ? labelNames(groupsFor(ev, tag.side, preferred), tag.labels) : [];
          return (
            <li key={tag.id}>
              <button
                type="button"
                onClick={() => onSelect(pairId)}
                aria-current={selectedId === pairId && !isMirror ? "true" : undefined}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted",
                  selectedId === pairId && "bg-muted",
                  isMirror && "text-muted-foreground",
                )}
              >
                <span className="w-20 shrink-0 font-mono text-xs tabular-nums">{formatTimecode(tag.startMs / 1000).replace(/\.\d+$/, "")}</span>
                <span className="flex w-12 shrink-0" aria-label={`${tag.stars} stelle`}>
                  {[1, 2, 3].map((n) => (
                    <Star key={n} className={cn("h-3 w-3", tag.stars >= n ? "fill-primary text-primary" : "text-transparent")} />
                  ))}
                </span>
                {isMirror && <CornerDownRight className="h-3.5 w-3.5 shrink-0" aria-label="Specchio" />}
                <span className="h-3 w-1 shrink-0 rounded-full" style={{ background: ev?.color }} aria-hidden />
                <span className={cn("shrink-0", !isMirror && "font-medium text-foreground")}>{ev?.name ?? tag.eventCode}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{teams[tag.side]}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                  {names.join(", ")}
                  {tag.note && <span className="italic"> — {tag.note}</span>}
                </span>
                {isMirror && needsCompletion(panel, tag, preferred) && (
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px]">da completare</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
