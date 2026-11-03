/**
 * Elenco partite: ricerca e filtri, titolo da mostrare, squadra preferita
 * proposta dalle preferenze. Modulo puro, testato in matches.test.mjs.
 */
import type { MatchFilters, MatchListItem } from "./api.ts";

const fold = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** "Casa – Ospite", altrimenti il titolo o il nome del file. */
export function matchTitle(m: Pick<MatchListItem, "titolo" | "home" | "away" | "video_file_name">): string {
  if (m.titolo?.trim()) return m.titolo.trim();
  if (m.home || m.away) return `${m.home?.label ?? "?"} – ${m.away?.label ?? "?"}`;
  return m.video_file_name;
}

/** Partite che rispettano ricerca (senza accenti né maiuscole) e filtri. */
export function filterMatches(list: MatchListItem[], f: MatchFilters): MatchListItem[] {
  const q = fold(f.q);
  return list.filter((m) => {
    if (f.teamId && m.home?.id !== f.teamId && m.away?.id !== f.teamId) return false;
    if (f.competitionId && m.competition?.id !== f.competitionId) return false;
    if (f.seasonId && m.season?.id !== f.seasonId) return false;
    if (!q) return true;
    const text = fold(
      [matchTitle(m), m.home?.label, m.away?.label, m.competition?.label, m.season?.label, m.video_file_name, m.data_partita]
        .filter(Boolean)
        .join(" "),
    );
    return q.split(" ").every((w) => text.includes(w));
  });
}

/** Squadra preferita proposta: la "mia squadra" delle preferenze, se è in campo. */
export function suggestPreferred(myTeamId: string | null, homeId: string | null, awayId: string | null): string | null {
  return myTeamId && (myTeamId === homeId || myTeamId === awayId) ? myTeamId : null;
}
