import { useEffect, useMemo, useState } from "react";
import { Film, Loader2, Plus, Search, Star } from "lucide-react";
import type { Lookups, MatchFilters, MatchListItem } from "@shared/api";
import { filterMatches, matchTitle } from "@shared/matches";
import { formatDuration } from "@shared/time";
import { Button, ErrorBox, Input, Select } from "../components/ui";
import { api, errorMessage } from "../lib/api";

const EMPTY: MatchFilters = { q: "", teamId: null, competitionId: null, seasonId: null };

function formatDate(iso: string | null): string {
  if (!iso) return "Data non indicata";
  return new Date(`${iso}T12:00:00`).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" });
}

/** Elenco partite con ricerca e filtri per squadra, competizione e stagione. */
export function MatchesPage({ onOpen, onNew }: { onOpen: (id: string) => void; onNew: () => void }) {
  const [matches, setMatches] = useState<MatchListItem[] | null>(null);
  const [lookups, setLookups] = useState<Lookups | null>(null);
  const [filters, setFilters] = useState<MatchFilters>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.matches.list(), api.lookups.list()])
      .then(([m, l]) => {
        setMatches(m);
        setLookups(l);
      })
      .catch((err) => setError(errorMessage(err)));
  }, []);

  const shown = useMemo(() => (matches ? filterMatches(matches, filters) : []), [matches, filters]);
  const set = (patch: Partial<MatchFilters>) => setFilters((f) => ({ ...f, ...patch }));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-end justify-between gap-4 px-8 pt-10 pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Partite</h1>
          <p className="text-sm text-muted-foreground">I video restano sul Mac: nel database solo i dati della partita.</p>
        </div>
        <Button onClick={onNew}>
          <Plus className="h-4 w-4" />
          Nuova partita
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-2 px-8 pb-4">
        <div className="relative w-72">
          <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
          <Input
            value={filters.q}
            onChange={(e) => set({ q: e.target.value })}
            placeholder="Cerca squadra, competizione, file…"
            className="pl-9"
            aria-label="Cerca partite"
          />
        </div>
        <Select aria-label="Squadra" value={filters.teamId ?? ""} onChange={(e) => set({ teamId: e.target.value || null })}>
          <option value="">Tutte le squadre</option>
          {lookups?.teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Competizione"
          value={filters.competitionId ?? ""}
          onChange={(e) => set({ competitionId: e.target.value || null })}
        >
          <option value="">Tutte le competizioni</option>
          {lookups?.competitions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </Select>
        <Select aria-label="Stagione" value={filters.seasonId ?? ""} onChange={(e) => set({ seasonId: e.target.value || null })}>
          <option value="">Tutte le stagioni</option>
          {lookups?.seasons.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </Select>
        {(filters.q || filters.teamId || filters.competitionId || filters.seasonId) && (
          <Button variant="ghost" onClick={() => setFilters(EMPTY)}>
            Azzera
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-8 pb-8">
        {error && <ErrorBox>{error}</ErrorBox>}
        {!matches && !error && <Loader2 className="mx-auto mt-16 h-6 w-6 animate-spin text-primary-text" aria-label="Caricamento" />}
        {matches && matches.length === 0 && (
          <div className="mt-16 flex flex-col items-center gap-3 text-center text-muted-foreground">
            <Film className="h-10 w-10" />
            <p>Nessuna partita. Aggiungi la prima scegliendo un video dal disco.</p>
            <Button onClick={onNew}>
              <Plus className="h-4 w-4" />
              Nuova partita
            </Button>
          </div>
        )}
        {matches && matches.length > 0 && shown.length === 0 && (
          <p className="mt-10 text-center text-sm text-muted-foreground">Nessuna partita con questi filtri.</p>
        )}
        <ul className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(320px,1fr))]">
          {shown.map((m) => {
            const preferred = m.preferred_team_id === m.home?.id ? m.home : m.preferred_team_id === m.away?.id ? m.away : null;
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => onOpen(m.id)}
                  className="w-full rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/50"
                >
                  <p className="text-xs text-muted-foreground">{formatDate(m.data_partita)}</p>
                  <p className="mt-1 truncate text-base font-semibold">{matchTitle(m)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[m.competition?.label, m.season?.label].filter(Boolean).join(" · ") || "Competizione non indicata"}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <span className="truncate" title={m.video_file_name}>
                      {formatDuration(m.duration_ms)}
                      {m.width && m.height ? ` · ${m.width}×${m.height}` : ""}
                      {m.fps ? ` · ${m.fps} fps` : ""}
                    </span>
                    {preferred && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-primary-text">
                        <Star className="h-3 w-3" aria-hidden />
                        {preferred.label}
                      </span>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
