/**
 * Form giocatore a sezioni: elenco delle sezioni, campi di ognuna, quanto è
 * compilata, regola della scheda Portiere, età e controlli sulle date,
 * confronto dei nomi per i possibili doppioni.
 * Modulo puro, testato in player-form-sections.test.mjs.
 */
import {
  INFLUENZE_NEG,
  RATINGS,
  type RatingArea,
  type RuoloEnum,
} from "../types/scouting.ts";

export const PLAYER_SECTIONS = [
  { id: "anagrafica", label: "Anagrafica" },
  { id: "posizione", label: "Posizione e stile" },
  { id: "contratto", label: "Contratto" },
  { id: "fisico", label: "Fisico" },
  { id: "comportamento", label: "Comportamento" },
  { id: "valutazioni", label: "Valutazioni" },
  { id: "stato", label: "Stato e media" },
] as const;

export type PlayerSectionId = (typeof PLAYER_SECTIONS)[number]["id"];

export const RATING_TABS: RatingArea[] = ["TECNICA", "PSICOLOGIA", "FISICO", "PORTIERE"];

const SECTION_FIELDS: Record<Exclude<PlayerSectionId, "valutazioni">, string[]> = {
  anagrafica: ["nome", "cognome", "foto_url", "data_nascita", "nazionalita", "passaporto", "piede"],
  posizione: ["ruolo_principale", "ruoli_secondari", "stili_gioco"],
  contratto: ["team_attuale_id", "campionato", "scadenza_contratto", "agenzia", "valore_mercato_eur", "fascia_ingaggio"],
  fisico: ["altezza_cm", "peso_kg", "struttura_corporea", "gesti_motori", "muscolatura", "capacita_condizionali"],
  comportamento: ["behav_delega_altri", "behav_assume_responsabilita"],
  stato: ["status_osservazione", "voto_potenziale", "scout_assegnato", "scouting_report_url", "clip_video_urls"],
};

const INFLUENZA_KEYS = INFLUENZE_NEG.map((i) => i.key as string);

/** Sezione che contiene un campo (per portare l'utente sull'errore). */
export function sectionOfField(field: string): PlayerSectionId {
  if (RATINGS.some((r) => r.key === field)) return "valutazioni";
  if (INFLUENZA_KEYS.includes(field)) return "comportamento";
  for (const [id, fields] of Object.entries(SECTION_FIELDS)) {
    if (fields.includes(field)) return id as PlayerSectionId;
  }
  return "anagrafica";
}

/** Prima sezione (nell'ordine del form) che contiene uno dei campi con errore. */
export function firstSectionWithError(fields: string[]): PlayerSectionId | null {
  const ids = new Set(fields.map(sectionOfField));
  return PLAYER_SECTIONS.find((s) => ids.has(s.id))?.id ?? null;
}

/** Scheda Portiere visibile se il ruolo principale o uno dei secondari è POR. */
export function showGoalkeeperTab(
  primary: RuoloEnum | null | undefined,
  secondary: readonly RuoloEnum[] | null | undefined,
): boolean {
  return primary === "POR" || (secondary ?? []).includes("POR");
}

export function visibleRatingTabs(showGoalkeeper: boolean): RatingArea[] {
  return showGoalkeeper ? RATING_TABS : RATING_TABS.filter((a) => a !== "PORTIERE");
}

function isFilled(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === "string") return v.trim() !== "";
  if (typeof v === "number") return !Number.isNaN(v);
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "boolean") return v;
  return true;
}

export type Completion = { filled: number; total: number };

/** Voti inseriti in un'area di valutazione. */
export function ratingAreaCompletion(values: Record<string, unknown>, area: RatingArea): Completion {
  const items = RATINGS.filter((r) => r.area === area);
  return { filled: items.filter((r) => isFilled(values[r.key])).length, total: items.length };
}

/**
 * Quanto è compilata una sezione. Valutazioni: solo le aree visibili.
 * Comportamento: le 2 domande + le influenze negative come una voce sola
 * (compilata se almeno una è segnata).
 */
export function sectionCompletion(
  values: Record<string, unknown>,
  id: PlayerSectionId,
  showGoalkeeper: boolean,
): Completion {
  if (id === "valutazioni") {
    return visibleRatingTabs(showGoalkeeper)
      .map((a) => ratingAreaCompletion(values, a))
      .reduce((acc, c) => ({ filled: acc.filled + c.filled, total: acc.total + c.total }), { filled: 0, total: 0 });
  }
  const fields = SECTION_FIELDS[id];
  let filled = fields.filter((f) => isFilled(values[f])).length;
  let total = fields.length;
  if (id === "comportamento") {
    total += 1;
    if (INFLUENZA_KEYS.some((k) => values[k] === true)) filled += 1;
  }
  return { filled, total };
}

/** Data di oggi (fuso del dispositivo) come "AAAA-MM-GG". */
export function todayIso(now: Date = new Date()): string {
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${m}-${d}`;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Età compiuta alla data `today` ("AAAA-MM-GG"); null se la data manca, non è valida o è nel futuro. */
export function ageOn(birth: string | null | undefined, today: string): number | null {
  const b = birth ? ISO_DATE.exec(birth) : null;
  const t = ISO_DATE.exec(today);
  if (!b || !t) return null;
  if (birth! > today) return null;
  let age = Number(t[1]) - Number(b[1]);
  if (t[2] + t[3] < b[2] + b[3]) age -= 1;
  return age;
}

export function isFutureDate(date: string | null | undefined, today: string): boolean {
  return !!date && ISO_DATE.test(date) && date > today;
}

export function isPastDate(date: string | null | undefined, today: string): boolean {
  return !!date && ISO_DATE.test(date) && date < today;
}

/** Nome per il confronto dei doppioni: minuscole, senza accenti, spazi compattati. */
export function normalizePersonName(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[\s'’-]+/g, " ")
    .trim();
}

export function samePerson(
  a: { nome: string; cognome: string },
  b: { nome: string; cognome: string },
): boolean {
  return (
    normalizePersonName(a.nome) === normalizePersonName(b.nome) &&
    normalizePersonName(a.cognome) === normalizePersonName(b.cognome)
  );
}
