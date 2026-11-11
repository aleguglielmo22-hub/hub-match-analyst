/**
 * Calcoli sugli allenamenti: volume, record personali, raggruppamento delle
 * serie per esercizio, durata stimata di una scheda.
 * Modulo puro, testato in workout.test.mjs.
 */

export type SetKind = "normale" | "riscaldamento" | "drop" | "cedimento";

export const SET_KINDS: { value: SetKind; label: string; short: string }[] = [
  { value: "normale", label: "Serie normale", short: "" },
  { value: "riscaldamento", label: "Riscaldamento", short: "R" },
  { value: "drop", label: "Drop set", short: "D" },
  { value: "cedimento", label: "Al cedimento", short: "C" },
];

export type SetLite = {
  id: string;
  exercise_id: string;
  ordine: number | null;
  ripetizioni: number | null;
  carico_kg: number | null;
  fatta: boolean;
  tipo?: SetKind | string | null;
};

/** Il riscaldamento non conta per volume e record. */
export function countsForStats(s: { tipo?: string | null }): boolean {
  return s.tipo !== "riscaldamento";
}

/** Volume di una serie in kg (carico × ripetizioni); 0 se manca un valore. */
export function setVolume(s: Pick<SetLite, "ripetizioni" | "carico_kg">): number {
  if (!s.ripetizioni || !s.carico_kg) return 0;
  return s.ripetizioni * s.carico_kg;
}

/** Massimale stimato con la formula di Epley: carico × (1 + ripetizioni / 30). */
export function estimatedOneRepMax(s: Pick<SetLite, "ripetizioni" | "carico_kg">): number {
  if (!s.ripetizioni || !s.carico_kg) return 0;
  return s.ripetizioni === 1 ? s.carico_kg : s.carico_kg * (1 + s.ripetizioni / 30);
}

export function totalVolume(sets: readonly SetLite[], onlyDone = true): number {
  return sets.reduce((sum, s) => (!countsForStats(s) || (onlyDone && !s.fatta) ? sum : sum + setVolume(s)), 0);
}

/**
 * Serie raggruppate per esercizio, nell'ordine in cui compare la prima serie
 * di ciascuno; dentro il gruppo per "ordine".
 */
export function groupByExercise<T extends Pick<SetLite, "exercise_id" | "ordine">>(
  sets: readonly T[],
): { exercise_id: string; sets: T[] }[] {
  const sorted = [...sets].sort((a, b) => (a.ordine ?? 1e9) - (b.ordine ?? 1e9));
  const groups: { exercise_id: string; sets: T[] }[] = [];
  for (const s of sorted) {
    let g = groups.find((x) => x.exercise_id === s.exercise_id);
    if (!g) {
      g = { exercise_id: s.exercise_id, sets: [] };
      groups.push(g);
    }
    g.sets.push(s);
  }
  return groups;
}

export type Records = { bestWeight: number; bestOneRepMax: number; bestVolume: number };

/** Record di un esercizio su tutte le serie fatte. */
export function personalRecords(sets: readonly Pick<SetLite, "ripetizioni" | "carico_kg" | "fatta" | "tipo">[]): Records {
  const r: Records = { bestWeight: 0, bestOneRepMax: 0, bestVolume: 0 };
  for (const s of sets) {
    if (!s.fatta || !countsForStats(s)) continue;
    r.bestWeight = Math.max(r.bestWeight, s.carico_kg ?? 0);
    r.bestOneRepMax = Math.max(r.bestOneRepMax, estimatedOneRepMax(s));
    r.bestVolume = Math.max(r.bestVolume, setVolume(s));
  }
  return r;
}

/** Durata stimata di una scheda: ~40 secondi per serie più il recupero (90 s se non indicato). */
export function estimatedMinutes(items: readonly { serie: number | null; recupero_s: number | null }[]): number {
  const seconds = items.reduce((sum, it) => sum + (it.serie ?? 1) * (40 + (it.recupero_s ?? 90)), 0);
  return Math.round(seconds / 60);
}

/** "m:ss" per timer e cronometro. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}

/** "60 × 8" per mostrare l'allenamento precedente. */
export function formatSetShort(s: { ripetizioni: number | null; carico_kg: number | null }): string {
  const kg = s.carico_kg == null ? "" : `${String(Number(s.carico_kg)).replace(".", ",")}`;
  const reps = s.ripetizioni == null ? "" : String(s.ripetizioni);
  if (!kg && !reps) return "—";
  return kg ? `${kg} × ${reps || "?"}` : `${reps} rip.`;
}

/** "05:00" o "1:05:00" → secondi; null se non è un orario. */
export function parseClock(text: string): number | null {
  const m = text.trim().match(/^(?:(\d{1,2}):)?(\d{1,3}):(\d{2})$/);
  if (m) {
    const sec = Number(m[3]);
    if (sec > 59) return null;
    return (m[1] ? Number(m[1]) * 3600 : 0) + Number(m[2]) * 60 + sec;
  }
  return null;
}

/** Durata scritta dall'utente: "40" = 40 secondi, "1:30" = 90 secondi. */
export function parseDurationInput(text: string): number | null {
  const t = text.trim();
  if (t === "") return null;
  if (/^\d+$/.test(t)) return Math.min(86400, Number(t));
  return parseClock(t);
}

/** Secondi → "m:ss" per i campi durata. */
export function formatDurationField(seconds: number | null): string {
  return seconds == null ? "" : formatClock(seconds);
}

/** Intervallo di ripetizioni previsto: "8-10", "12" o stringa vuota. */
export function repsHint(min: number | null, max: number | null): string {
  if (min != null && max != null && min !== max) return `${min}-${max}`;
  const one = max ?? min;
  return one == null ? "" : String(one);
}

/** Etichette delle serie: i riscaldamenti con "R", le altre numerate senza contare i riscaldamenti. */
export function setLabels(kinds: readonly (SetKind | string | null | undefined)[]): string[] {
  let n = 0;
  return kinds.map((k) => {
    if (k === "riscaldamento") return "R";
    n++;
    if (k === "drop") return "D";
    if (k === "cedimento") return "C";
    return String(n);
  });
}

/** Una serie prevista in una scheda. */
export type TemplateSet = {
  t: SetKind;
  /** Ripetizioni fisse (se non c'è un range). */
  rip: number | null;
  min: number | null;
  max: number | null;
  kg: number | null;
  /** Durata prevista in secondi (esercizi a tempo). */
  dur: number | null;
};

const KINDS = new Set<string>(["normale", "riscaldamento", "drop", "cedimento"]);

/** Legge il dettaglio salvato (JSON) in modo sicuro; ignora voci malformate. */
export function parseTemplateSets(raw: unknown): TemplateSet[] {
  if (!Array.isArray(raw)) return [];
  const num = (v: unknown, max: number) => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max ? v : null);
  const out: TemplateSet[] = [];
  for (const r of raw.slice(0, 30)) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    out.push({
      t: typeof o.t === "string" && KINDS.has(o.t) ? (o.t as SetKind) : "normale",
      rip: num(o.rip, 1000),
      min: num(o.min, 1000),
      max: num(o.max, 1000),
      kg: num(o.kg, 1000),
      dur: num(o.dur, 86400),
    });
  }
  return out;
}

/** Riassunto di una scheda per le colonne "serie / ripetizioni / carico" già esistenti. */
export function summarizeTemplateSets(sets: readonly TemplateSet[]): { serie: number; ripetizioni: string | null; carico_kg: number | null } {
  const work = sets.filter((s) => s.t !== "riscaldamento");
  const base = work.length ? work : sets;
  const first = base[0];
  return {
    serie: Math.max(1, Math.min(20, sets.length)),
    ripetizioni: first ? repsHint(first.min, first.max ?? first.rip) || (first.rip != null ? String(first.rip) : null) : null,
    carico_kg: base.find((s) => s.kg != null)?.kg ?? null,
  };
}

/** Descrizione breve di una serie prevista, es. "8-10 × 15 kg" o "5:00". */
export function describeTemplateSet(s: TemplateSet): string {
  if (s.dur != null && s.rip == null && s.min == null) return formatClock(s.dur);
  const reps = s.min != null && s.max != null && s.min !== s.max ? `${s.min}-${s.max}` : String(s.rip ?? s.max ?? s.min ?? "");
  const kg = s.kg != null ? `${String(s.kg).replace(".", ",")} kg` : "";
  return [reps && `${reps} rip.`, kg].filter(Boolean).join(" × ") || "—";
}
