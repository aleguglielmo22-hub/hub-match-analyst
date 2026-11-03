/**
 * Scorciatoie da tastiera del lettore, configurabili (salvate sul Mac).
 * Una combinazione è una stringa come "Shift+ArrowRight" o "Space".
 * Modulo puro, testato in shortcuts.test.mjs.
 */

export const PLAYER_ACTIONS = [
  { id: "playPause", label: "Play / pausa" },
  { id: "frameForward", label: "Fotogramma avanti" },
  { id: "frameBack", label: "Fotogramma indietro" },
  { id: "jumpForward", label: "Avanti 5 s" },
  { id: "jumpBack", label: "Indietro 5 s" },
  { id: "faster", label: "Più veloce" },
  { id: "slower", label: "Più lento" },
  { id: "normalSpeed", label: "Velocità normale" },
  { id: "zoomIn", label: "Ingrandisci" },
  { id: "zoomOut", label: "Riduci" },
  { id: "zoomReset", label: "Ingrandimento normale" },
] as const;

export type PlayerAction = (typeof PLAYER_ACTIONS)[number]["id"];
export type Shortcuts = Record<PlayerAction, string>;

export const DEFAULT_SHORTCUTS: Shortcuts = {
  playPause: "Space",
  frameForward: "ArrowRight",
  frameBack: "ArrowLeft",
  jumpForward: "Shift+ArrowRight",
  jumpBack: "Shift+ArrowLeft",
  faster: "ArrowUp",
  slower: "ArrowDown",
  normalSpeed: "Digit1",
  zoomIn: "Equal",
  zoomOut: "Minus",
  zoomReset: "Digit0",
};

type KeyLike = { code: string; shiftKey: boolean; altKey: boolean; ctrlKey: boolean; metaKey: boolean };

/** Combinazione di un evento da tastiera (si usa il tasto fisico: indipendente dal layout). */
export function comboOf(e: KeyLike): string {
  const mods = [e.metaKey && "Meta", e.ctrlKey && "Ctrl", e.altKey && "Alt", e.shiftKey && "Shift"].filter(Boolean);
  return [...mods, e.code].join("+");
}

/** Azione associata all'evento, se c'è. */
export function actionFor(e: KeyLike, shortcuts: Shortcuts): PlayerAction | null {
  const combo = comboOf(e);
  const found = (Object.keys(shortcuts) as PlayerAction[]).find((a) => shortcuts[a] === combo);
  return found ?? null;
}

/** Scorciatoie salvate unite ai valori predefiniti (azioni nuove o voci non valide). */
export function mergeShortcuts(saved: unknown): Shortcuts {
  const out = { ...DEFAULT_SHORTCUTS };
  if (saved && typeof saved === "object") {
    for (const a of PLAYER_ACTIONS) {
      const v = (saved as Record<string, unknown>)[a.id];
      if (typeof v === "string" && v.length > 0 && v.length <= 40) out[a.id] = v;
    }
  }
  return out;
}

/** Azioni che usano la stessa combinazione (da segnalare nelle impostazioni). */
export function conflicts(shortcuts: Shortcuts): PlayerAction[][] {
  const byCombo = new Map<string, PlayerAction[]>();
  for (const a of PLAYER_ACTIONS) {
    const list = byCombo.get(shortcuts[a.id]) ?? [];
    list.push(a.id);
    byCombo.set(shortcuts[a.id], list);
  }
  return [...byCombo.values()].filter((l) => l.length > 1);
}

/** Etichetta leggibile: "⇧ →", "Spazio". */
export function comboLabel(combo: string): string {
  const names: Record<string, string> = {
    Meta: "⌘", Ctrl: "⌃", Alt: "⌥", Shift: "⇧", Space: "Spazio",
    ArrowRight: "→", ArrowLeft: "←", ArrowUp: "↑", ArrowDown: "↓",
    Equal: "+", Minus: "−", Comma: ",", Period: ".",
  };
  return combo
    .split("+")
    .map((p) => names[p] ?? p.replace(/^Key/, "").replace(/^Digit/, ""))
    .join(" ");
}
