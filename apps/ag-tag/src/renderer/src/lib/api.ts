/** Ponte verso il processo principale (preload). */
export const api = window.agTag;

/** Messaggio leggibile da un errore di una chiamata al processo principale. */
export function errorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  // Electron antepone "Error invoking remote method '…': Error: ".
  return raw.replace(/^Error invoking remote method '[^']+': (?:Error: )?/, "");
}

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
