/**
 * Calcoli sugli allenamenti: volume, record personali, raggruppamento delle
 * serie per esercizio, durata stimata di una scheda.
 * Modulo puro, testato in workout.test.mjs.
 */

export type SetLite = {
  id: string;
  exercise_id: string;
  ordine: number | null;
  ripetizioni: number | null;
  carico_kg: number | null;
  fatta: boolean;
};

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
  return sets.reduce((sum, s) => (onlyDone && !s.fatta ? sum : sum + setVolume(s)), 0);
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
export function personalRecords(sets: readonly Pick<SetLite, "ripetizioni" | "carico_kg" | "fatta">[]): Records {
  const r: Records = { bestWeight: 0, bestOneRepMax: 0, bestVolume: 0 };
  for (const s of sets) {
    if (!s.fatta) continue;
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
