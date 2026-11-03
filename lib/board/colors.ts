/**
 * Colori della lavagna. Il campo è lo stesso in entrambi i temi dell'app,
 * quindi anche i simboli: valori definiti come variabili in app/globals.css
 * (--board-*) e qui ripetuti come riserva e per i test di contrasto.
 * Nostri = arancio del marchio (cerchio, bordo bianco); avversari = avorio
 * (quadrato, bordo #141414). Forma e bordo distinguono le squadre, non solo il colore.
 */

export const BOARD_COLORS = {
  pitch: "#25662e",
  pitchStripe: "#22602b",
  lines: "#ffffff",
  home: "#ff6b00",
  homeText: "#141414",
  homeStroke: "#ffffff",
  away: "#f2f1ec",
  awayText: "#141414",
  awayStroke: "#141414",
  ball: "#ffffff",
  ink: "#141414",
  // Materiale giallo: non si confonde con l'arancio dei nostri.
  equipment: "#ffd43b",
  equipmentStroke: "#141414",
  arrow: "#ffffff",
} as const;

export type BoardColorKey = keyof typeof BOARD_COLORS;

/** Variabile CSS di ogni colore (es. pitch → --board-pitch). */
export function boardCssVar(key: BoardColorKey): string {
  return `--board-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
}

/** Zone semitrasparenti: pochi preset ben distinguibili sul verde. */
export const ZONE_FILL: Record<"yellow" | "red" | "blue" | "white", string> = {
  yellow: "#facc15",
  red: "#ef4444",
  blue: "#60a5fa",
  white: "#ffffff",
};
export const ZONE_LABEL: Record<"yellow" | "red" | "blue" | "white", string> = {
  yellow: "Giallo",
  red: "Rosso",
  blue: "Azzurro",
  white: "Bianco",
};
export const ZONE_OPACITY = 0.3;

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** Luminanza relativa (WCAG) di un colore #rrggbb. */
export function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) throw new Error(`Colore non valido: ${hex}`);
  const [r, g, b] = [m[1], m[2], m[3]].map((h) => channel(parseInt(h, 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Rapporto di contrasto WCAG tra due colori (1-21). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
