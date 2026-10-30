/**
 * Lavagna tattica: formato dei dati salvati (colonna `lavagna_dati`, 0017).
 * Posizioni in metri su un campo 105×68: x da sinistra a destra (si attacca
 * verso destra, porta avversaria a x = 105), y dall'alto in basso.
 * Più fotogrammi già previsti (Modifica 20b); in questa versione se ne usa uno.
 * Modulo puro, testato in model.test.mjs.
 */

export const BOARD_VERSION = 1;
export const PITCH_LENGTH = 105;
export const PITCH_WIDTH = 68;

export type FieldType = "full" | "half" | "third";

export const FIELD_LABEL: Record<FieldType, string> = {
  full: "Campo intero",
  half: "Metà campo",
  third: "Ultimo terzo",
};

/** Porzione di campo mostrata (in metri), con un margine attorno alle linee. */
export function fieldViewport(field: FieldType): { x: number; y: number; w: number; h: number } {
  const margin = 3;
  const from = field === "full" ? 0 : field === "half" ? PITCH_LENGTH / 2 : 70;
  return {
    x: from - margin,
    y: -margin,
    w: PITCH_LENGTH - from + margin * 2,
    h: PITCH_WIDTH + margin * 2,
  };
}

/**
 * Metà campo e ultimo terzo si mostrano ruotati, con la porta in alto: la
 * porzione è più larga che profonda e così usa tutto lo schermo orizzontale.
 */
export function isRotatedView(field: FieldType): boolean {
  return field !== "full";
}

/** Dimensioni (in metri) della porzione così come appare sullo schermo. */
export function viewSize(field: FieldType): { w: number; h: number } {
  const vp = fieldViewport(field);
  return isRotatedView(field) ? { w: vp.h, h: vp.w } : { w: vp.w, h: vp.h };
}

/**
 * Scala e spostamento per disegnare il campo in un riquadro di width×height
 * pixel. Con `rotated` il gruppo è ruotato di -90°: (x, y) in metri →
 * (offsetX + y·scale, offsetY − x·scale).
 */
export function fitViewport(field: FieldType, width: number, height: number) {
  const vp = fieldViewport(field);
  const view = viewSize(field);
  const scale = Math.min(width / view.w, height / view.h);
  const padX = (width - view.w * scale) / 2;
  const padY = (height - view.h * scale) / 2;
  if (isRotatedView(field)) {
    return {
      scale,
      rotated: true,
      offsetX: padX - vp.y * scale,
      offsetY: padY + (vp.x + vp.w) * scale,
    };
  }
  return { scale, rotated: false, offsetX: padX - vp.x * scale, offsetY: padY - vp.y * scale };
}

/** Punto dello schermo (pixel) → metri sul campo. */
export function screenToField(
  fit: ReturnType<typeof fitViewport>,
  px: number,
  py: number,
): { x: number; y: number } {
  return fit.rotated
    ? { x: (fit.offsetY - py) / fit.scale, y: (px - fit.offsetX) / fit.scale }
    : { x: (px - fit.offsetX) / fit.scale, y: (py - fit.offsetY) / fit.scale };
}

export type Team = "home" | "away";
export type ArrowKind = "pass" | "move" | "dribble";
export type ZoneShape = "rect" | "ellipse";
export type EquipmentKind = "cone" | "disc" | "minigoal" | "dummy" | "wall";
export const ZONE_COLORS = ["yellow", "red", "blue", "white"] as const;
export type ZoneColor = (typeof ZONE_COLORS)[number];

type Base = { id: string };

export type PlayerEl = Base & { type: "player"; team: Team; x: number; y: number; number: string; gk: boolean };
export type BallEl = Base & { type: "ball"; x: number; y: number };
export type ArrowEl = Base & { type: "arrow"; kind: ArrowKind; points: [number, number, number, number] };
export type ZoneEl = Base & {
  type: "zone";
  shape: ZoneShape;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  color: ZoneColor;
};
export type TextEl = Base & { type: "text"; x: number; y: number; text: string; rotation: number };
export type PenEl = Base & { type: "pen"; points: number[] };
export type EquipmentEl = Base & { type: "equipment"; kind: EquipmentKind; x: number; y: number; rotation: number };

export type BoardElement = PlayerEl | BallEl | ArrowEl | ZoneEl | TextEl | PenEl | EquipmentEl;

export type BoardFrame = { id: string; elements: BoardElement[] };

export type BoardData = {
  version: typeof BOARD_VERSION;
  field: FieldType;
  frames: BoardFrame[];
};

export function emptyBoard(field: FieldType = "half", id = "f1"): BoardData {
  return { version: BOARD_VERSION, field, frames: [{ id, elements: [] }] };
}

/** Elementi del fotogramma mostrato (in questa versione il primo). */
export function currentElements(board: BoardData): BoardElement[] {
  return board.frames[0]?.elements ?? [];
}

export function withElements(board: BoardData, elements: BoardElement[]): BoardData {
  const [first, ...rest] = board.frames.length ? board.frames : [{ id: "f1", elements: [] }];
  return { ...board, frames: [{ ...first, elements }, ...rest] };
}

export function isBoardEmpty(board: BoardData | null | undefined): boolean {
  return !board || board.frames.every((f) => f.elements.length === 0);
}

/** Copia spostata di un elemento (Duplica), con un nuovo id. */
export function duplicateElement(el: BoardElement, id: string, dx = 2, dy = 2): BoardElement {
  switch (el.type) {
    case "arrow": {
      const [x1, y1, x2, y2] = el.points;
      return { ...el, id, points: [x1 + dx, y1 + dy, x2 + dx, y2 + dy] };
    }
    case "pen":
      return { ...el, id, points: el.points.map((v, i) => v + (i % 2 === 0 ? dx : dy)) };
    default:
      return { ...el, id, x: el.x + dx, y: el.y + dy };
  }
}

/** Prossimo numero libero per una squadra (1-99). */
export function nextPlayerNumber(elements: BoardElement[], team: Team): string {
  const used = new Set(
    elements.filter((e): e is PlayerEl => e.type === "player" && e.team === team).map((p) => p.number),
  );
  for (let n = 2; n <= 99; n++) if (!used.has(String(n))) return String(n);
  return "";
}

/* ============================================================
 * Percorso dell'anteprima PNG nel bucket "media"
 * ============================================================ */

export type BoardEntity = "set_piece" | "situational";

/** {workspace}/{set_piece|situational}/{id}/lavagna-{uuid}.png (regola della 0017). */
export function boardPreviewPath(workspaceId: string, entity: BoardEntity, itemId: string, fileId: string): string {
  return `${workspaceId}/${entity}/${itemId}/lavagna-${fileId}.png`;
}

/** Il percorso appartiene alla riga indicata (stesso controllo del database). */
export function isBoardPreviewPathFor(
  path: string,
  workspaceId: string,
  entity: BoardEntity,
  itemId: string,
): boolean {
  const prefix = `${workspaceId}/${entity}/${itemId}/`;
  return (
    path.startsWith(prefix) &&
    /^lavagna-[0-9a-f-]{36}\.png$/.test(path.slice(prefix.length))
  );
}

/** Stessa lavagna (ordine delle chiavi ignorato: il database le riordina). */
export function sameBoard(a: unknown, b: unknown): boolean {
  return canonical(a) === canonical(b);
}

function canonical(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v ?? null);
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o)
    .filter((k) => o[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`)
    .join(",")}}`;
}
