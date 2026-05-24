/**
 * Filtri della lista Scouting. Stato in URL search params.
 * Allineato al refactor della scheda valutazione ufficiale.
 */
import {
  FASCIA_INGAGGIO_VALUES,
  GESTI_MOTORI_VALUES,
  MUSCOLATURA_VALUES,
  PASSAPORTO_VALUES,
  PIEDE_VALUES,
  RATING_KEYS,
  RUOLO_VALUES,
  STATUS_OSSERVAZIONE_VALUES,
  STRUTTURA_CORPOREA_VALUES,
  VOTO_POTENZIALE_VALUES,
  type FasciaEta,
  type FasciaIngaggioEnum,
  type GestiMotoriEnum,
  type MuscolaturaEnum,
  type PassaportoEnum,
  type PiedeEnum,
  type RatingKey,
  type RuoloEnum,
  type ScadenzaQuick,
  type StatusOsservazioneEnum,
  type StrutturaCorporeaEnum,
  type VotoPotenzialeEnum,
} from "@/lib/types/scouting";

export type ScoutingFilters = {
  q?: string;
  fascia_eta: FasciaEta[];
  passaporto: PassaportoEnum[];
  piede: PiedeEnum[];
  struttura_corporea: StrutturaCorporeaEnum[];
  gesti_motori: GestiMotoriEnum[];
  muscolatura: MuscolaturaEnum[];
  ruolo_principale: RuoloEnum[];
  ruoli_secondari: RuoloEnum[];
  fascia_ingaggio: FasciaIngaggioEnum[];
  status_osservazione: StatusOsservazioneEnum[];
  voto_potenziale: VotoPotenzialeEnum[];
  scadenza_quick?: ScadenzaQuick;
  /** Soglia minima per ogni rating (assente = nessun filtro). */
  ratings_min: Partial<Record<RatingKey, number>>;
};

export const EMPTY_SCOUTING_FILTERS: ScoutingFilters = {
  fascia_eta: [],
  passaporto: [],
  piede: [],
  struttura_corporea: [],
  gesti_motori: [],
  muscolatura: [],
  ruolo_principale: [],
  ruoli_secondari: [],
  fascia_ingaggio: [],
  status_osservazione: [],
  voto_potenziale: [],
  ratings_min: {},
};

const FASCIA_ETA_ALLOWED: readonly FasciaEta[] = ["U21", "TRA_22_26", "OVER_27"];
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
    fascia_eta: parseList(getParam(params, "eta"), FASCIA_ETA_ALLOWED),
    passaporto: parseList(getParam(params, "pass"), PASSAPORTO_VALUES),
    piede: parseList(getParam(params, "piede"), PIEDE_VALUES),
    struttura_corporea: parseList(
      getParam(params, "struttura"),
      STRUTTURA_CORPOREA_VALUES,
    ),
    gesti_motori: parseList(getParam(params, "gesti"), GESTI_MOTORI_VALUES),
    muscolatura: parseList(getParam(params, "musc"), MUSCOLATURA_VALUES),
    ruolo_principale: parseList(getParam(params, "ruolo"), RUOLO_VALUES),
    ruoli_secondari: parseList(getParam(params, "ruolo_sec"), RUOLO_VALUES),
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
    "eta",
    "pass",
    "piede",
    "struttura",
    "gesti",
    "musc",
    "ruolo",
    "ruolo_sec",
    "ingaggio",
    "status",
    "voto",
    "scad",
    ...RATING_KEYS.map((k) => ratingUrlKey(k)),
  ];
  for (const k of KEYS_TO_RESET) sp.delete(k);

  if (filters.q) sp.set("q", filters.q);
  if (filters.fascia_eta.length) sp.set("eta", filters.fascia_eta.join(","));
  if (filters.passaporto.length) sp.set("pass", filters.passaporto.join(","));
  if (filters.piede.length) sp.set("piede", filters.piede.join(","));
  if (filters.struttura_corporea.length)
    sp.set("struttura", filters.struttura_corporea.join(","));
  if (filters.gesti_motori.length)
    sp.set("gesti", filters.gesti_motori.join(","));
  if (filters.muscolatura.length)
    sp.set("musc", filters.muscolatura.join(","));
  if (filters.ruolo_principale.length)
    sp.set("ruolo", filters.ruolo_principale.join(","));
  if (filters.ruoli_secondari.length)
    sp.set("ruolo_sec", filters.ruoli_secondari.join(","));
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
  if (f.fascia_eta.length) n++;
  if (f.passaporto.length) n++;
  if (f.piede.length) n++;
  if (f.struttura_corporea.length) n++;
  if (f.gesti_motori.length) n++;
  if (f.muscolatura.length) n++;
  if (f.ruolo_principale.length) n++;
  if (f.ruoli_secondari.length) n++;
  if (f.fascia_ingaggio.length) n++;
  if (f.status_osservazione.length) n++;
  if (f.voto_potenziale.length) n++;
  if (f.scadenza_quick) n++;
  n += Object.keys(f.ratings_min).length;
  return n;
}
