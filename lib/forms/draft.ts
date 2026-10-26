/**
 * Bozze dei form salvate nel browser (localStorage): una per form e per
 * elemento. Ogni accesso è protetto: se il browser non permette il
 * salvataggio locale (navigazione privata, spazio pieno…) le funzioni non
 * fanno nulla e il form funziona come prima.
 * Modulo puro (lo storage si passa come argomento), testato in draft.test.mjs.
 */

export const DRAFT_PREFIX = "agw:draft:";
export const DRAFT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 giorni

export type DraftSection = "scouting" | "set-pieces" | "training" | "cloud";

export type StorageLike = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem" | "key" | "length"
>;

export type Draft<T> = { savedAt: number; data: T };

/** localStorage se utilizzabile, altrimenti null. */
export function browserStorage(): StorageLike | null {
  try {
    const s = window.localStorage;
    const probe = `${DRAFT_PREFIX}__probe`;
    s.setItem(probe, "1");
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

/** Chiave della bozza: sezione + id dell'elemento ("nuovo" per i nuovi). */
export function draftKey(section: DraftSection, itemId: string | null): string {
  return `${DRAFT_PREFIX}${section}:${itemId ?? "nuovo"}`;
}

export function saveDraft<T>(
  storage: StorageLike | null,
  key: string,
  data: T,
  now: number = Date.now(),
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(key, JSON.stringify({ v: 1, savedAt: now, data }));
    return true;
  } catch {
    return false;
  }
}

function parse<T>(raw: string | null): Draft<T> | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as { v?: unknown; savedAt?: unknown; data?: unknown };
    if (p?.v !== 1 || typeof p.savedAt !== "number" || p.data === undefined) return null;
    return { savedAt: p.savedAt, data: p.data as T };
  } catch {
    return null;
  }
}

export function loadDraft<T>(storage: StorageLike | null, key: string): Draft<T> | null {
  if (!storage) return null;
  try {
    return parse<T>(storage.getItem(key));
  } catch {
    return null;
  }
}

export function clearDraft(storage: StorageLike | null, key: string): void {
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    // niente da fare: al massimo la bozza resta
  }
}

/** Elimina le bozze più vecchie di `maxAgeMs` (e quelle illeggibili). Ritorna quante. */
export function purgeOldDrafts(
  storage: StorageLike | null,
  now: number = Date.now(),
  maxAgeMs: number = DRAFT_MAX_AGE_MS,
): number {
  if (!storage) return 0;
  try {
    const stale: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (!key?.startsWith(DRAFT_PREFIX)) continue;
      const draft = parse(storage.getItem(key));
      if (!draft || now - draft.savedAt > maxAgeMs) stale.push(key);
    }
    for (const key of stale) storage.removeItem(key);
    return stale.length;
  } catch {
    return 0;
  }
}

/** True se l'elemento è stato modificato dopo il salvataggio della bozza. */
export function itemChangedAfterDraft(
  draftSavedAt: number,
  itemUpdatedAt: string | null | undefined,
): boolean {
  if (!itemUpdatedAt) return false;
  const t = Date.parse(itemUpdatedAt);
  return Number.isFinite(t) && t > draftSavedAt;
}
