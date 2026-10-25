/**
 * Esiti di caricamento condivisi: distinguono "nessun dato" / "non trovato"
 * da "errore di caricamento", così l'interfaccia non mostra liste vuote
 * quando in realtà il server non ha risposto.
 */

/** Pagina di una lista con scorrimento infinito. `error` = blocco non caricato. */
export type ListPage<T> = { items: T[]; hasMore: boolean; error?: true };

export const failedListPage = <T>(): ListPage<T> => ({
  items: [],
  hasMore: false,
  error: true,
});

/** Dettaglio/modifica: elemento caricato, inesistente o errore. */
export type LoadResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "not_found" | "error" };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Un id non valido nell'indirizzo è un "non trovato", non un errore del server. */
export const isUuid = (value: string) => UUID_RE.test(value);

/** Log lato server con il nome della sezione (visibile nei log di Vercel). */
export function logLoadError(section: string, err: unknown): void {
  console.error(`[${section}] Errore di caricamento:`, err);
}
