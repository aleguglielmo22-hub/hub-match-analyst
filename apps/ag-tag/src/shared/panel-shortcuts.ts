/**
 * Lettere degli eventi del pannello (decisione D8: solo gli eventi, per ora).
 * Salvate sul Mac come le scorciatoie del lettore, una combinazione per codice
 * evento ("KeyQ"). Modulo puro, testato in panel-shortcuts.test.mjs.
 */
import { PLAYER_ACTIONS, comboOf, type Shortcuts } from "./shortcuts.ts";

export type EventKeys = Record<string, string>;

type KeyLike = Parameters<typeof comboOf>[0];

const CODE = /^[A-Za-z0-9_-]{1,20}$/;

/** Lettere salvate, ripulite da voci non valide. */
export function mergeEventKeys(saved: unknown): EventKeys {
  const out: EventKeys = {};
  if (saved && typeof saved === "object") {
    for (const [code, combo] of Object.entries(saved as Record<string, unknown>)) {
      if (CODE.test(code) && typeof combo === "string" && combo.length > 0 && combo.length <= 40) out[code] = combo;
    }
  }
  return out;
}

/** Lettere dopo un'importazione: restano quelle già scelte, si aggiungono le predefinite del file. */
export function withDefaults(current: EventKeys, defaults: EventKeys): EventKeys {
  const out: EventKeys = { ...current };
  const used = new Set(Object.values(current));
  for (const [code, combo] of Object.entries(defaults)) {
    if (out[code] || used.has(combo)) continue;
    out[code] = combo;
    used.add(combo);
  }
  return out;
}

/** Evento associato alla pressione, se c'è (tra i codici del pannello). */
export function eventFor(e: KeyLike, keys: EventKeys, codes: string[]): string | null {
  const combo = comboOf(e);
  return codes.find((c) => keys[c] === combo) ?? null;
}

export type KeyConflict = { code: string; with: string };

/** Lettere in conflitto con un'altra lettera di evento o con una scorciatoia del lettore. */
export function eventKeyConflicts(keys: EventKeys, codes: string[], player: Shortcuts): KeyConflict[] {
  const out: KeyConflict[] = [];
  for (const code of codes) {
    const combo = keys[code];
    if (!combo) continue;
    const other = codes.find((c) => c !== code && keys[c] === combo);
    if (other) out.push({ code, with: other });
    const action = PLAYER_ACTIONS.find((a) => player[a.id] === combo);
    if (action) out.push({ code, with: action.label });
  }
  return out;
}
