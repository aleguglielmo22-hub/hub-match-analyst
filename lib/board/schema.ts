/**
 * Controllo dei dati della lavagna prima del salvataggio (server e form).
 * Limiti: coordinate vicine al campo, testi brevi, numero di elementi
 * e di fotogrammi contenuto (il database accetta al massimo 512 KB).
 */
import { z } from "zod";
import { BOARD_VERSION, ZONE_COLORS, type BoardData } from "./model.ts";

const coord = z.number().finite().min(-30).max(140);
const angle = z.number().finite().min(-3600).max(3600);
const id = z.string().min(1).max(40);

const element = z.discriminatedUnion("type", [
  z.object({
    id,
    type: z.literal("player"),
    team: z.enum(["home", "away"]),
    x: coord,
    y: coord,
    number: z.string().max(3),
    gk: z.boolean(),
  }),
  z.object({ id, type: z.literal("ball"), x: coord, y: coord }),
  z.object({
    id,
    type: z.literal("arrow"),
    kind: z.enum(["pass", "move", "dribble"]),
    points: z.tuple([coord, coord, coord, coord]),
  }),
  z.object({
    id,
    type: z.literal("zone"),
    shape: z.enum(["rect", "ellipse"]),
    x: coord,
    y: coord,
    w: z.number().finite().min(0.5).max(140),
    h: z.number().finite().min(0.5).max(140),
    rotation: angle,
    color: z.enum(ZONE_COLORS),
  }),
  z.object({ id, type: z.literal("text"), x: coord, y: coord, text: z.string().max(200), rotation: angle }),
  z.object({ id, type: z.literal("pen"), points: z.array(coord).min(4).max(2000) }),
  z.object({
    id,
    type: z.literal("equipment"),
    kind: z.enum(["cone", "disc", "minigoal", "dummy", "wall"]),
    x: coord,
    y: coord,
    rotation: angle,
  }),
]);

export const boardDataSchema = z.object({
  version: z.literal(BOARD_VERSION),
  field: z.enum(["full", "half", "third"]),
  frames: z
    .array(z.object({ id, elements: z.array(element).max(300) }))
    .min(1)
    .max(30),
});

/** Dati della lavagna nel form: assenti (null) o validi. */
export const boardDataOrNull = boardDataSchema.nullable();

/** Dati della lavagna letti dal database: null se assenti o non leggibili. */
export function parseBoardData(raw: unknown): BoardData | null {
  const parsed = boardDataSchema.safeParse(raw);
  return parsed.success ? (parsed.data as BoardData) : null;
}
