/**
 * Traduzione in italiano degli errori di login/registrazione Supabase.
 * Distingue "server non raggiungibile" (rete, progetto in pausa/riavvio)
 * da "credenziali errate". Modulo puro, testato in login-errors.test.mjs.
 */

export const NETWORK_ERROR_MESSAGE =
  "Impossibile contattare il server. Se l'app non viene usata da più di una settimana potrebbe essere in riavvio: riprova tra qualche minuto. Se il problema continua, prova con un'altra rete (es. dati mobili).";

export const INVALID_CREDENTIALS_MESSAGE = "Email o password errate.";

type ErrorLike = { name?: unknown; status?: unknown; code?: unknown; message?: unknown };

const NETWORK_MESSAGE_RE =
  /failed to fetch|fetch failed|load failed|networkerror|network request failed|network error|err_internet_disconnected|err_name_not_resolved/i;

/** Errore di rete o server non disponibile (incluso progetto Supabase in pausa/riavvio). */
export function isNetworkError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as ErrorLike;
  // supabase-js: errore di fetch (status 0) o risposta 5xx "ritentabile".
  if (e.name === "AuthRetryableFetchError") return true;
  if (typeof e.status === "number" && (e.status === 0 || e.status >= 500)) return true;
  return typeof e.message === "string" && NETWORK_MESSAGE_RE.test(e.message);
}

export function loginErrorMessage(err: unknown): { title: string; description: string } {
  if (isNetworkError(err)) {
    return { title: "Server non raggiungibile", description: NETWORK_ERROR_MESSAGE };
  }
  const e = (err && typeof err === "object" ? err : {}) as ErrorLike;
  if (e.code === "invalid_credentials" || e.message === "Invalid login credentials") {
    return { title: "Accesso fallito", description: INVALID_CREDENTIALS_MESSAGE };
  }
  if (e.code === "email_not_confirmed") {
    return { title: "Accesso fallito", description: "Email non ancora confermata." };
  }
  if (e.code === "user_already_exists") {
    return { title: "Registrazione fallita", description: "Esiste già un account con questa email." };
  }
  return {
    title: "Operazione fallita",
    description: typeof e.message === "string" && e.message ? e.message : "Errore sconosciuto",
  };
}
