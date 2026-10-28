/**
 * Pagina a cui tornare dopo il login (parametro `next`).
 * Accetta solo percorsi interni: niente "//", "/\", schemi (http:, javascript:)
 * o caratteri di controllo, che il browser potrebbe leggere come un altro sito.
 * Modulo puro, testato in next-path.test.mjs.
 */

export const DEFAULT_AFTER_LOGIN = "/dashboard";

const BASE = "http://ag.invalid";

export function safeNextPath(raw: string | null | undefined): string {
  if (!raw || raw.length > 2048) return DEFAULT_AFTER_LOGIN;
  // Deve iniziare con una sola "/" seguita da un carattere che non apra un host.
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) {
    return DEFAULT_AFTER_LOGIN;
  }
  if (/[\u0000-\u001f\u007f]/.test(raw)) return DEFAULT_AFTER_LOGIN;

  let url: URL;
  try {
    url = new URL(raw, BASE);
  } catch {
    return DEFAULT_AFTER_LOGIN;
  }
  if (url.origin !== BASE) return DEFAULT_AFTER_LOGIN;
  // Tornare al login dopo il login non ha senso.
  if (url.pathname === "/login" || url.pathname.startsWith("/login/")) {
    return DEFAULT_AFTER_LOGIN;
  }
  return url.pathname + url.search + url.hash;
}
