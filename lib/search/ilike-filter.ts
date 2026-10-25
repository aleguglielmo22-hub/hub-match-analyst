/**
 * Filtro di ricerca testuale "contiene" su più colonne, per `.or()` di supabase-js.
 *
 * Il testo dell'utente viene protetto su due livelli:
 *  1. LIKE: \ % _ diventano letterali (\\ \% \_), così "50%" non è un jolly.
 *  2. PostgREST: il valore è racchiuso tra virgolette doppie, quindi virgole,
 *     parentesi, punti e due punti non rompono la sintassi del filtro;
 *     dentro le virgolette \ e " vanno preceduti da \.
 * Modulo puro, testato in ilike-filter.test.mjs.
 */
export function ilikeAnyFilter(columns: readonly string[], text: string): string {
  const likeEscaped = text.replace(/[\\%_]/g, (c) => `\\${c}`);
  const quoted = `"${`%${likeEscaped}%`.replace(/[\\"]/g, (c) => `\\${c}`)}"`;
  return columns.map((col) => `${col}.ilike.${quoted}`).join(",");
}
