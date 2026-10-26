/**
 * Osservazioni datate di un giocatore: riepilogo per la scheda (numero,
 * media, ultimo voto, data dell'ultima, andamento dei voti).
 * Modulo puro, testato in observations.test.mjs.
 */

export type ObservationLike = {
  data_osservazione: string; // "YYYY-MM-DD"
  created_at: string;
  voto: number | null;
};

export type ObservationSummary = {
  count: number;
  /** Media dei voti presenti (1 decimale), null se nessun voto. */
  average: number | null;
  /** Voto dell'osservazione più recente che ne ha uno. */
  lastVoto: number | null;
  /** Data dell'osservazione più recente (con o senza voto). */
  lastDate: string | null;
  /** Voti in ordine cronologico, per il grafico dell'andamento. */
  trend: { date: string; voto: number }[];
};

/** Dalla più recente alla più vecchia (a parità di data, l'ultima inserita prima). */
export function sortObservationsDesc<T extends ObservationLike>(list: T[]): T[] {
  return [...list].sort((a, b) =>
    a.data_osservazione !== b.data_osservazione
      ? a.data_osservazione < b.data_osservazione
        ? 1
        : -1
      : a.created_at < b.created_at
        ? 1
        : a.created_at > b.created_at
          ? -1
          : 0,
  );
}

export function summarizeObservations(list: ObservationLike[]): ObservationSummary {
  const desc = sortObservationsDesc(list);
  const withVoto = desc.filter((o): o is ObservationLike & { voto: number } => o.voto != null);
  const average = withVoto.length
    ? Math.round((withVoto.reduce((s, o) => s + o.voto, 0) / withVoto.length) * 10) / 10
    : null;
  return {
    count: desc.length,
    average,
    lastVoto: withVoto[0]?.voto ?? null,
    lastDate: desc[0]?.data_osservazione ?? null,
    trend: withVoto.map((o) => ({ date: o.data_osservazione, voto: o.voto })).reverse(),
  };
}
