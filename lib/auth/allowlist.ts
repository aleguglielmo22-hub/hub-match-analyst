/**
 * Account autorizzati ad accedere all'app (strumento personale).
 * Il controllo avviene in proxy.ts (prima di qualsiasi pagina), nel layout
 * di app/(app), in getCurrentWorkspace (azioni server e caricamenti) e
 * dopo il login. Modulo puro, testato in allowlist.test.mjs.
 */
export const ALLOWED_EMAILS: readonly string[] = ["aleguglielmo22@gmail.com"];

export const ACCESS_DENIED_MESSAGE =
  "Accesso riservato: questo account non è autorizzato.";

/** Valore del parametro ?errore= su /login quando l'account è rifiutato. */
export const ACCESS_DENIED_PARAM = "non-autorizzato";

/** Confronto indipendente da maiuscole/minuscole e spazi. */
export function normalizeEmail(email: string): string {
  return email.replace(/\s+/g, "").toLowerCase();
}

const allowed = new Set(ALLOWED_EMAILS.map(normalizeEmail));

export function isEmailAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  return allowed.has(normalizeEmail(email));
}
