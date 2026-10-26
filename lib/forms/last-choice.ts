/**
 * Ultima scelta di un campo, ricordata nel browser (es. ambito e categoria
 * del Cloud). Ogni accesso è protetto: senza salvataggio locale non succede nulla.
 */
import { browserStorage } from "./draft";

const PREFIX = "agw:ultima:";

export function readLastChoice<T extends string>(key: string, allowed: readonly T[]): T | null {
  try {
    const v = browserStorage()?.getItem(PREFIX + key) ?? null;
    return v && (allowed as readonly string[]).includes(v) ? (v as T) : null;
  } catch {
    return null;
  }
}

export function saveLastChoice(key: string, value: string | null | undefined): void {
  if (!value) return;
  try {
    browserStorage()?.setItem(PREFIX + key, value);
  } catch {
    // niente da fare
  }
}
