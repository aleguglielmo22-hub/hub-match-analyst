/**
 * Filtri della lista Scouting. Stato in URL search params.
 * Set essenziale ad alto segnale: età (range), ruolo, piede, passaporto,
 * status osservazione, voto potenziale, scadenza e fascia ingaggio.
 */
import {
  FASCIA_INGAGGIO_VALUES,
  PASSAPORTO_VALUES,
  PIEDE_VALUES,
  RATING_KEYS,
  RUOLO_VALUES,
  STATUS_OSSERVAZIONE_VALUES,
  VOTO_POTENZIALE_VALUES,
  type FasciaIngaggioEnum,
  type PassaportoEnum,
  type PiedeEnum,
  type RatingKey,
  type RuoloEnum,
  type ScadenzaQuick,
  type StatusOsservazioneEnum,
  type VotoPotenzialeEnum,
} from "@/lib/types/scouting";

/** Limiti ragionevoli per l'età di un calciatore. */
export const ETA_MIN = 14;
export const ETA_MAX = 50;

export type ScoutingFilters = {
  q?: string;
  /** Range età "Da … a … anni" (estremi inclusi). */
  eta_min?: number;
  eta_max?: number;
  passaporto: PassaportoEnum[];
  piede: PiedeEnum[];
  ruolo_principale: RuoloEnum[];
  fascia_ingaggio: FasciaIngaggioEnum[];
  status_osservazione: StatusOsservazioneEnum[];
  voto_potenziale: VotoPotenzialeEnum[];
  scadenza_quick?: ScadenzaQuick;
  /** Soglia minima per ogni attributo FM (assente = nessun filtro). */
  ratings_min: Partial<Record<RatingKey, number>>;
};

export const EMPTY_SCOUTING_FILTERS: ScoutingFilters = {
  passaporto: [],
  piede: [],
  ruolo_principale: [],
  fascia_ingaggio: [],
  status_osservazione: [],
  voto_potenziale: [],
  ratings_min: {},
};

const SCADENZA_ALLOWED: readonly ScadenzaQuick[] = [
  "ENTRO_6_MESI",
  "ENTRO_12_MESI",
];

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

function parseAge(value: string | null): number | undefined {
  if (!value) return undefined;
  const n = parseInt(value, 10);
  if (Number.isInteger(n) && n >= ETA_MIN && n <= ETA_MAX) return n;
  return undefined;
}

/** Chiave URL per soglia rating: prefisso "min_" + nome colonna. */
function ratingUrlKey(k: RatingKey): string {
  return `min_${k}`;
}

export function parseScoutingFiltersFromSearchParams(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
): ScoutingFilters {
  const q = getParam(params, "q")?.trim() || undefined;

  const ratings_min: Partial<Record<RatingKey, number>> = {};
  for (const k of RATING_KEYS) {
    const raw = getParam(params, ratingUrlKey(k));
    if (raw) {
      const n = parseInt(raw, 10);
      if (Number.isInteger(n) && n >= 1 && n <= 10) ratings_min[k] = n;
    }
  }

  const scadenza = getParam(params, "scad");
  const scadenza_quick =
    scadenza && (SCADENZA_ALLOWED as readonly string[]).includes(scadenza)
      ? (scadenza as ScadenzaQuick)
      : undefined;

  return {
    q,
    eta_min: parseAge(getParam(params, "eta_min")),
    eta_max: parseAge(getParam(params, "eta_max")),
    passaporto: parseList(getParam(params, "pass"), PASSAPORTO_VALUES),
    piede: parseList(getParam(params, "piede"), PIEDE_VALUES),
    ruolo_principale: parseList(getParam(params, "ruolo"), RUOLO_VALUES),
    fascia_ingaggio: parseList(
      getParam(params, "ingaggio"),
      FASCIA_INGAGGIO_VALUES,
    ),
    status_osservazione: parseList(
      getParam(params, "status"),
      STATUS_OSSERVAZIONE_VALUES,
    ),
    voto_potenziale: parseList(getParam(params, "voto"), VOTO_POTENZIALE_VALUES),
    scadenza_quick,
    ratings_min,
  };
}

export function scoutingFiltersToSearchParams(
  filters: ScoutingFilters,
  base?: URLSearchParams,
): URLSearchParams {
  const sp = new URLSearchParams(base);
  const KEYS_TO_RESET = [
    "q",
    "eta_min",
    "eta_max",
    "pass",
    "piede",
    "ruolo",
    "ingaggio",
    "status",
    "voto",
    "scad",
    ...RATING_KEYS.map((k) => ratingUrlKey(k)),
  ];
  for (const k of KEYS_TO_RESET) sp.delete(k);

  if (filters.q) sp.set("q", filters.q);
  if (typeof filters.eta_min === "number") sp.set("eta_min", String(filters.eta_min));
  if (typeof filters.eta_max === "number") sp.set("eta_max", String(filters.eta_max));
  if (filters.passaporto.length) sp.set("pass", filters.passaporto.join(","));
  if (filters.piede.length) sp.set("piede", filters.piede.join(","));
  if (filters.ruolo_principale.length)
    sp.set("ruolo", filters.ruolo_principale.join(","));
  if (filters.fascia_ingaggio.length)
    sp.set("ingaggio", filters.fascia_ingaggio.join(","));
  if (filters.status_osservazione.length)
    sp.set("status", filters.status_osservazione.join(","));
  if (filters.voto_potenziale.length)
    sp.set("voto", filters.voto_potenziale.join(","));
  if (filters.scadenza_quick) sp.set("scad", filters.scadenza_quick);
  for (const k of RATING_KEYS) {
    const v = filters.ratings_min[k];
    if (typeof v === "number" && v >= 1 && v <= 10)
      sp.set(ratingUrlKey(k), String(v));
  }
  return sp;
}

export function countActiveScoutingFilters(f: ScoutingFilters): number {
  let n = 0;
  if (f.q) n++;
  if (typeof f.eta_min === "number" || typeof f.eta_max === "number") n++;
  if (f.passaporto.length) n++;
  if (f.piede.length) n++;
  if (f.ruolo_principale.length) n++;
  if (f.fascia_ingaggio.length) n++;
  if (f.status_osservazione.length) n++;
  if (f.voto_potenziale.length) n++;
  if (f.scadenza_quick) n++;
  n += Object.keys(f.ratings_min).length;
  return n;
}
