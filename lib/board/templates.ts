/**
 * Schemi di partenza della lavagna: giocatori nostri e avversari già
 * posizionati, da spostare. Si attacca verso destra (porta a x = 105).
 * "Da sinistra" / "da destra" dal punto di vista di chi attacca.
 */
import type { BallEl, BoardData, BoardElement, FieldType, PlayerEl } from "./model.ts";
import { BOARD_VERSION, PITCH_WIDTH } from "./model.ts";

export type TemplateId =
  | "corner_left"
  | "corner_right"
  | "free_kick_wide"
  | "free_kick_central"
  | "long_throw";

export const TEMPLATES: { id: TemplateId; label: string }[] = [
  { id: "corner_left", label: "Angolo da sinistra" },
  { id: "corner_right", label: "Angolo da destra" },
  { id: "free_kick_wide", label: "Punizione laterale" },
  { id: "free_kick_central", label: "Punizione centrale" },
  { id: "long_throw", label: "Rimessa lunga" },
];

type P = [x: number, y: number, number: string, gk?: boolean];

function build(field: FieldType, ball: [number, number], home: P[], away: P[]): BoardData {
  let n = 0;
  const player = (team: "home" | "away") => ([x, y, number, gk = false]: P): PlayerEl => ({
    id: `t${++n}`,
    type: "player",
    team,
    x,
    y,
    number,
    gk,
  });
  const ballEl: BallEl = { id: `t${++n}`, type: "ball", x: ball[0], y: ball[1] };
  const elements: BoardElement[] = [...home.map(player("home")), ...away.map(player("away")), ballEl];
  return { version: BOARD_VERSION, field, frames: [{ id: "f1", elements }] };
}

/** Specchio alto/basso (angolo da destra = angolo da sinistra ribaltato). */
function mirror(board: BoardData): BoardData {
  return {
    ...board,
    frames: board.frames.map((f) => ({
      ...f,
      elements: f.elements.map((e) => ("y" in e ? { ...e, y: PITCH_WIDTH - e.y } : e)),
    })),
  };
}

function cornerLeft(): BoardData {
  return build(
    "third",
    [104.4, 0.6],
    [
      [104, 1.6, "10"],
      [94, 30, "9"],
      [95.5, 36, "5"],
      [92, 40, "4"],
      [97, 27.5, "11"],
      [88, 22, "7"],
      [84, 34, "8"],
    ],
    [
      [103.8, 34, "1", true],
      [101.5, 28.5, "4"],
      [101.5, 33.5, "5"],
      [101.5, 38.5, "6"],
      [98.5, 31, "8"],
      [98.5, 37, "3"],
      [104, 30.5, "2"],
      [94.5, 32, "7"],
      [96.5, 39, "11"],
      [101, 6.5, "10"],
    ],
  );
}

const TEMPLATE_BUILDERS: Record<TemplateId, () => BoardData> = {
  corner_left: cornerLeft,
  corner_right: () => mirror(cornerLeft()),
  free_kick_wide: () =>
    build(
      "third",
      [90, 10],
      [
        [89, 8.8, "10"],
        [93, 26, "9"],
        [95, 31, "5"],
        [93.5, 37, "4"],
        [96, 42, "11"],
        [86, 30, "8"],
      ],
      [
        [103.5, 32, "1", true],
        [94.6, 17.4, "7"],
        [95.6, 18.2, "11"],
        [98, 27, "4"],
        [98.5, 33, "5"],
        [98, 39, "6"],
        [95, 29, "8"],
        [96.5, 35, "3"],
      ],
    ),
  free_kick_central: () =>
    build(
      "third",
      [80, 34],
      [
        [78.8, 33, "10"],
        [78.8, 35.5, "7"],
        [90, 25, "9"],
        [90, 43, "11"],
        [87, 30, "8"],
      ],
      [
        [104, 33.5, "1", true],
        [89.15, 32.2, "4"],
        [89.15, 33.4, "8"],
        [89.15, 34.6, "6"],
        [89.15, 35.8, "10"],
        [96, 26, "2"],
        [96, 42, "3"],
        [94, 34, "5"],
      ],
    ),
  long_throw: () =>
    build(
      "third",
      [92, 0.4],
      [
        [92, 1.4, "2"],
        [99, 29, "9"],
        [97, 35, "5"],
        [95, 40, "4"],
        [101, 26, "11"],
        [88, 30, "8"],
      ],
      [
        [103.5, 32, "1", true],
        [101.5, 30, "4"],
        [100, 35, "5"],
        [98, 40, "6"],
        [96.5, 30.5, "8"],
        [94.5, 36.5, "3"],
        [97, 8, "7"],
      ],
    ),
};

export function templateBoard(id: TemplateId): BoardData {
  return TEMPLATE_BUILDERS[id]();
}
