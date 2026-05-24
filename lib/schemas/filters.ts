/**
 * Filtri della lista archivio. Lo stato vive negli URL search params
 * così le viste filtrate sono condivisibili e sopravvivono al refresh.
 */
import {
  AMBITO_VALUES,
  CATEGORIA_LAVORO_VALUES,
  SORGENTE_VIDEO_VALUES,
  TIPO_MEDIA_VALUES,
} from "@/lib/schemas/archivio";
import type {
  AmbitoEnum,
  CategoriaLavoroEnum,
  SorgenteVideoEnum,
  TipoMediaEnum,
} from "@/lib/types/archivio";

export type ArchiveFilters = {
  dataFrom?: string;
  dataTo?: string;
  season_ids: string[];
  team_principale_ids: string[];
  team_avversario_ids: string[];
  competition_ids: string[];
  ambito: AmbitoEnum[];
  categoria_lavoro: CategoriaLavoroEnum[];
  tipo_media: TipoMediaEnum[];
  sorgente_video: SorgenteVideoEnum[];
  tag_ids: string[];
};

export const EMPTY_FILTERS: ArchiveFilters = {
  season_ids: [],
  team_principale_ids: [],
  team_avversario_ids: [],
  competition_ids: [],
  ambito: [],
  categoria_lavoro: [],
  tipo_media: [],
  sorgente_video: [],
  tag_ids: [],
};

/** Chiavi URL — corte e leggibili. */
const KEYS = {
  dataFrom: "from",
  dataTo: "to",
  season: "season",
  team_p: "team_p",
  team_a: "team_a",
  competition: "competition",
  ambito: "ambito",
  categoria: "categoria",
  tipo: "tipo",
  sorgente: "sorgente",
  tag: "tag",
  q: "q",
  sort: "sort",
} as const;

const isoDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

function parseList<T extends string>(
  value: string | null | undefined,
  allowed?: readonly T[],
): T[] {
  if (!value) return [];
  const parts = value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean) as T[];
  if (allowed) return parts.filter((v) => (allowed as readonly string[]).includes(v));
  return parts;
}

export function parseFiltersFromSearchParams(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
): ArchiveFilters {
  const get = (key: string): string | null => {
    if (params instanceof URLSearchParams) return params.get(key);
    const v = (params as Record<string, string | string[] | undefined>)[key];
    if (Array.isArray(v)) return v[0] ?? null;
    return v ?? null;
  };

  const from = get(KEYS.dataFrom);
  const to = get(KEYS.dataTo);

  return {
    dataFrom: from && isoDate(from) ? from : undefined,
    dataTo: to && isoDate(to) ? to : undefined,
    season_ids: parseList(get(KEYS.season)),
    team_principale_ids: parseList(get(KEYS.team_p)),
    team_avversario_ids: parseList(get(KEYS.team_a)),
    competition_ids: parseList(get(KEYS.competition)),
    ambito: parseList(get(KEYS.ambito), AMBITO_VALUES),
    categoria_lavoro: parseList(get(KEYS.categoria), CATEGORIA_LAVORO_VALUES),
    tipo_media: parseList(get(KEYS.tipo), TIPO_MEDIA_VALUES),
    sorgente_video: parseList(get(KEYS.sorgente), SORGENTE_VIDEO_VALUES),
    tag_ids: parseList(get(KEYS.tag)),
  };
}

export function filtersToSearchParams(
  filters: ArchiveFilters,
  base?: URLSearchParams,
): URLSearchParams {
  const sp = new URLSearchParams(base);
  // Pulisci le chiavi che gestiamo qui (mantieni q e sort se erano già presenti).
  for (const k of Object.values(KEYS)) {
    if (k === KEYS.q || k === KEYS.sort) continue;
    sp.delete(k);
  }
  if (filters.dataFrom) sp.set(KEYS.dataFrom, filters.dataFrom);
  if (filters.dataTo) sp.set(KEYS.dataTo, filters.dataTo);
  if (filters.season_ids.length) sp.set(KEYS.season, filters.season_ids.join(","));
  if (filters.team_principale_ids.length)
    sp.set(KEYS.team_p, filters.team_principale_ids.join(","));
  if (filters.team_avversario_ids.length)
    sp.set(KEYS.team_a, filters.team_avversario_ids.join(","));
  if (filters.competition_ids.length)
    sp.set(KEYS.competition, filters.competition_ids.join(","));
  if (filters.ambito.length) sp.set(KEYS.ambito, filters.ambito.join(","));
  if (filters.categoria_lavoro.length)
    sp.set(KEYS.categoria, filters.categoria_lavoro.join(","));
  if (filters.tipo_media.length) sp.set(KEYS.tipo, filters.tipo_media.join(","));
  if (filters.sorgente_video.length)
    sp.set(KEYS.sorgente, filters.sorgente_video.join(","));
  if (filters.tag_ids.length) sp.set(KEYS.tag, filters.tag_ids.join(","));
  return sp;
}

export function countActiveFilters(f: ArchiveFilters): number {
  let n = 0;
  if (f.dataFrom) n++;
  if (f.dataTo) n++;
  n += f.season_ids.length ? 1 : 0;
  n += f.team_principale_ids.length ? 1 : 0;
  n += f.team_avversario_ids.length ? 1 : 0;
  n += f.competition_ids.length ? 1 : 0;
  n += f.ambito.length ? 1 : 0;
  n += f.categoria_lavoro.length ? 1 : 0;
  n += f.tipo_media.length ? 1 : 0;
  n += f.sorgente_video.length ? 1 : 0;
  n += f.tag_ids.length ? 1 : 0;
  return n;
}

export const FILTER_KEYS = KEYS;
