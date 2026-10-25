/**
 * Geometria del logo AG Workspace (concetto "triangolo di passaggio"),
 * su una griglia 100x100. Unica fonte per il componente <Logo /> e per lo
 * script scripts/generate-icons.mjs che produce favicon e icone PWA.
 * Modulo puro (nessun import), eseguibile anche da Node.
 *
 * Idea: la "A" è un triangolo di passaggio tra tre giocatori (i nodi blu
 * ai vertici), con la linea di passaggio tratteggiata; la "G" chiude il nome.
 */

export const BRAND_COLORS = {
  navy: "#0B2149",
  white: "#FFFFFF",
  blue: "#4C8DFF",
  lightBlue: "#7FB0FF",
} as const;

export type Point = readonly [number, number];

export const LOGO = {
  /** Riquadro di sfondo: angoli arrotondati. */
  tile: { size: 100, radius: 22 },
  stroke: 7,
  /** "A": vertice e due piedi. */
  a: { apex: [30, 27] as Point, left: [14, 73] as Point, right: [46, 73] as Point },
  /** Linea di passaggio tratteggiata (puntini) al posto della barra della A. */
  lane: { y: 62, dots: [24.5, 30, 35.5], radius: 1.9 },
  /** "G": arco aperto a destra + barra interna. Angoli in gradi, 0 = destra, positivi verso il basso. */
  g: { cx: 68.5, cy: 50, r: 18.5, startDeg: -38, endDeg: 24, barTopY: 51, barEndX: 71 },
  /** Nodi (giocatori) ai vertici della A. */
  nodeRadius: 5,
} as const;

/** Versione semplificata per le dimensioni piccole: niente tratteggio, tratti più spessi. */
export const LOGO_SMALL = { stroke: 9.5, nodeRadius: 6 } as const;
/** Versione minima (favicon 16 px): solo "AG", senza nodi. */
export const LOGO_TINY = { stroke: 11, nodeRadius: 0 } as const;

const rad = (deg: number) => (deg * Math.PI) / 180;

export function gArcPoints(): { start: Point; end: Point } {
  const { cx, cy, r, startDeg, endDeg } = LOGO.g;
  return {
    start: [cx + r * Math.cos(rad(startDeg)), cy + r * Math.sin(rad(startDeg))],
    end: [cx + r * Math.cos(rad(endDeg)), cy + r * Math.sin(rad(endDeg))],
  };
}

const f = (n: number) => Number(n.toFixed(2));

/** Path SVG della G: arco grande in senso antiorario, poi barra verticale e orizzontale. */
export function gPath(): string {
  const { r, barTopY, barEndX } = LOGO.g;
  const { start, end } = gArcPoints();
  return `M${f(start[0])} ${f(start[1])} A${r} ${r} 0 1 0 ${f(end[0])} ${f(end[1])} L${f(end[0])} ${barTopY} L${barEndX} ${barTopY}`;
}

export function aPath(): string {
  const { apex, left, right } = LOGO.a;
  return `M${left[0]} ${left[1]} L${apex[0]} ${apex[1]} L${right[0]} ${right[1]}`;
}
