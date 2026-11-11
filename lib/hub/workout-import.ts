/**
 * Importazione dello storico degli allenamenti da CSV (Lyfta, Hevy, Strong…):
 * raggruppa le righe in allenamenti e li divide in gruppi abbastanza piccoli
 * per il server. Modulo puro, testato in workout-import.test.mjs.
 */

export type WorkoutRow = {
  data: string;
  titolo: string;
  esercizio: string;
  ripetizioni: number | null;
  carico_kg: number | null;
  fatta?: boolean;
};

export type WorkoutGroup = { data: string; titolo: string; sets: WorkoutRow[] };

/** Righe → allenamenti (stessa data e stesso titolo), serie nell'ordine del file. */
export function groupWorkoutRows(rows: readonly WorkoutRow[]): WorkoutGroup[] {
  const map = new Map<string, WorkoutGroup>();
  for (const r of rows) {
    const key = `${r.data}|${r.titolo}`;
    let g = map.get(key);
    if (!g) {
      g = { data: r.data, titolo: r.titolo, sets: [] };
      map.set(key, g);
    }
    g.sets.push(r);
  }
  return [...map.values()];
}

/** Divide gli allenamenti in blocchi di al massimo `maxSets` serie, senza spezzarne nessuno. */
export function chunkSessions(groups: readonly WorkoutGroup[], maxSets = 1500): WorkoutGroup[][] {
  const chunks: WorkoutGroup[][] = [];
  let current: WorkoutGroup[] = [];
  let count = 0;
  for (const g of groups) {
    if (current.length > 0 && count + g.sets.length > maxSets) {
      chunks.push(current);
      current = [];
      count = 0;
    }
    current.push(g);
    count += g.sets.length;
  }
  if (current.length) chunks.push(current);
  return chunks;
}

const LB_TO_KG = 0.45359237;

/** Libbre → kg, con due decimali. */
export function lbToKg(lb: number): number {
  return Math.round(lb * LB_TO_KG * 100) / 100;
}
