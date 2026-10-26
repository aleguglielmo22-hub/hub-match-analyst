/**
 * Filtri della lista Set Pieces. Stato in URL search params.
 */
import {
  ESITO_FINALE_VALUES,
  FASE_VALUES,
  LATO_BATTUTA_VALUES,
  SPECIFICAZIONE_PUNIZIONE_VALUES,
  TIPO_PIAZZATO_VALUES,
  type EsitoFinaleEnum,
  type FaseEnum,
  type LatoBattutaEnum,
  type SpecificazionePunizioneEnum,
  type TipoPiazzatoEnum,
} from "@/lib/types/set-pieces";

export type SetPiecesFilters = {
  q?: string;
  fase: FaseEnum[];
  tipo_piazzato: TipoPiazzatoEnum[];
  specificazione_punizione: SpecificazionePunizioneEnum[];
  lato_battuta: LatoBattutaEnum[];
  esito_finale: EsitoFinaleEnum[];
  /** Squadra coinvolta (esecutrice o avversaria). */
  team_ids: string[];
  competition_ids: string[];
  season_ids: string[];
  /** Giocatore coinvolto (0014). */
  player_ids: string[];
};

export const EMPTY_SET_PIECES_FILTERS: SetPiecesFilters = {
  fase: [],
  tipo_piazzato: [],
  specificazione_punizione: [],
  lato_battuta: [],
  esito_finale: [],
  team_ids: [],
  competition_ids: [],
  season_ids: [],
  player_ids: [],
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Solo id validi: finiscono in un filtro `.or()` di PostgREST. */
function parseUuidList(value: string | null | undefined): string[] {
  if (!value) return [];
  return value.split(",").map((v) => v.trim()).filter((v) => UUID_RE.test(v));
}

function parseList<T extends string>(
  value: string | null | undefined,
  allowed?: readonly T[],
): T[] {
  if (!value) return [];
  const parts = value.split(",").map((v) => v.trim()).filter(Boolean) as T[];
  if (allowed) return parts.filter((v) => (allowed as readonly string[]).includes(v));
  return parts;
}

function getParam(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
  key: string,
): string | null {
  if (params instanceof URLSearchParams) return params.get(key);
  const v = (params as Record<string, string | string[] | undefined>)[key];
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

export function parseSetPiecesFiltersFromSearchParams(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
): SetPiecesFilters {
  const q = getParam(params, "q")?.trim() || undefined;
  return {
    q,
    fase: parseList(getParam(params, "fase"), FASE_VALUES),
    tipo_piazzato: parseList(getParam(params, "tipo"), TIPO_PIAZZATO_VALUES),
    specificazione_punizione: parseList(
      getParam(params, "spec"),
      SPECIFICAZIONE_PUNIZIONE_VALUES,
    ),
    lato_battuta: parseList(getParam(params, "lato"), LATO_BATTUTA_VALUES),
    esito_finale: parseList(getParam(params, "esito"), ESITO_FINALE_VALUES),
    team_ids: parseUuidList(getParam(params, "squadra")),
    competition_ids: parseUuidList(getParam(params, "comp")),
    season_ids: parseUuidList(getParam(params, "stag")),
    player_ids: parseUuidList(getParam(params, "giocatore")),
  };
}

export function setPiecesFiltersToSearchParams(
  filters: SetPiecesFilters,
  base?: URLSearchParams,
): URLSearchParams {
  const sp = new URLSearchParams(base);
  for (const k of ["q", "fase", "tipo", "spec", "lato", "esito", "squadra", "comp", "stag", "giocatore"]) sp.delete(k);
  if (filters.q) sp.set("q", filters.q);
  if (filters.fase.length) sp.set("fase", filters.fase.join(","));
  if (filters.tipo_piazzato.length)
    sp.set("tipo", filters.tipo_piazzato.join(","));
  if (filters.specificazione_punizione.length)
    sp.set("spec", filters.specificazione_punizione.join(","));
  if (filters.lato_battuta.length)
    sp.set("lato", filters.lato_battuta.join(","));
  if (filters.esito_finale.length)
    sp.set("esito", filters.esito_finale.join(","));
  if (filters.team_ids.length) sp.set("squadra", filters.team_ids.join(","));
  if (filters.competition_ids.length) sp.set("comp", filters.competition_ids.join(","));
  if (filters.season_ids.length) sp.set("stag", filters.season_ids.join(","));
  if (filters.player_ids.length) sp.set("giocatore", filters.player_ids.join(","));
  return sp;
}

export function countActiveSetPiecesFilters(f: SetPiecesFilters): number {
  let n = 0;
  if (f.q) n++;
  if (f.fase.length) n++;
  if (f.tipo_piazzato.length) n++;
  if (f.specificazione_punizione.length) n++;
  if (f.lato_battuta.length) n++;
  if (f.esito_finale.length) n++;
  if (f.team_ids.length) n++;
  if (f.competition_ids.length) n++;
  if (f.season_ids.length) n++;
  if (f.player_ids.length) n++;
  return n;
}
