// Test della lavagna tattica (formato, schemi, percorsi, colori). Esecuzione: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  boardPreviewPath,
  currentElements,
  duplicateElement,
  emptyBoard,
  fieldViewport,
  fitViewport,
  isBoardEmpty,
  isBoardPreviewPathFor,
  screenToField,
  viewSize,
  nextPlayerNumber,
  sameBoard,
  withElements,
} from "./model.ts";
import { boardDataSchema } from "./schema.ts";
import { TEMPLATES, templateBoard } from "./templates.ts";
import { BOARD_COLORS, ZONE_FILL, contrastRatio } from "./colors.ts";

const W = "0c37a7c4-0000-4000-8000-000000000001";
const ID = "5b1f2c3d-0000-4000-8000-000000000002";
const FILE = "9e8d7c6b-0000-4000-8000-000000000003";

test("lavagna vuota: valida, già pronta per più fotogrammi", () => {
  const b = emptyBoard("full");
  assert.equal(boardDataSchema.safeParse(b).success, true);
  assert.equal(b.frames.length, 1);
  assert.equal(isBoardEmpty(b), true);
  assert.equal(isBoardEmpty(null), true);
  const two = { ...b, frames: [...b.frames, { id: "f2", elements: [] }] };
  assert.equal(boardDataSchema.safeParse(two).success, true);
});

test("schema: rifiuta dati malformati o troppo grandi", () => {
  const bad = (patch) => boardDataSchema.safeParse({ ...emptyBoard(), ...patch }).success;
  assert.equal(bad({ version: 2 }), false);
  assert.equal(bad({ field: "quarter" }), false);
  assert.equal(bad({ frames: [] }), false);
  const el = (e) => boardDataSchema.safeParse(withElements(emptyBoard(), [e])).success;
  assert.equal(el({ id: "a", type: "player", team: "home", x: 50, y: 30, number: "10", gk: false }), true);
  assert.equal(el({ id: "a", type: "player", team: "home", x: 9999, y: 30, number: "10", gk: false }), false);
  assert.equal(el({ id: "a", type: "player", team: "home", x: 50, y: 30, number: "1000", gk: false }), false);
  assert.equal(el({ id: "a", type: "ghost", x: 1, y: 1 }), false);
  assert.equal(el({ id: "a", type: "arrow", kind: "pass", points: [1, 2, 3] }), false);
  assert.equal(el({ id: "a", type: "zone", shape: "rect", x: 1, y: 1, w: 5, h: 5, rotation: 0, color: "pink" }), false);
  const many = Array.from({ length: 301 }, (_, i) => ({ id: `b${i}`, type: "ball", x: 1, y: 1 }));
  assert.equal(boardDataSchema.safeParse(withElements(emptyBoard(), many)).success, false);
});

test("schemi di partenza: validi, dentro il campo mostrato, nostri e avversari", () => {
  for (const t of TEMPLATES) {
    const b = templateBoard(t.id);
    assert.equal(boardDataSchema.safeParse(b).success, true, t.id);
    const els = currentElements(b);
    const vp = fieldViewport(b.field);
    for (const e of els) {
      assert.ok(e.x >= vp.x && e.x <= vp.x + vp.w && e.y >= vp.y && e.y <= vp.y + vp.h, `${t.id} ${e.id}`);
    }
    assert.equal(new Set(els.map((e) => e.id)).size, els.length, t.id);
    const players = els.filter((e) => e.type === "player");
    assert.ok(players.some((p) => p.team === "home") && players.some((p) => p.team === "away"), t.id);
    assert.equal(players.filter((p) => p.team === "away" && p.gk).length, 1, t.id);
    assert.equal(els.filter((e) => e.type === "ball").length, 1, t.id);
  }
  // Angolo da destra = da sinistra ribaltato.
  const l = currentElements(templateBoard("corner_left"));
  const r = currentElements(templateBoard("corner_right"));
  assert.equal(r[0].y, 68 - l[0].y);
});

test("campo: porzione mostrata e adattamento allo schermo", () => {
  assert.deepEqual(fieldViewport("full"), { x: -3, y: -3, w: 111, h: 74 });
  assert.equal(fieldViewport("half").x, 49.5);
  assert.equal(fieldViewport("third").x, 67);
  const fit = fitViewport("full", 1110, 1000);
  assert.equal(fit.scale, 10);
  assert.equal(fit.rotated, false);
  assert.equal(fit.offsetX, 30); // -(-3) × 10
  assert.equal(fit.offsetY, (1000 - 740) / 2 + 30);
  assert.deepEqual(screenToField(fit, 30 + 525, fit.offsetY + 340), { x: 52.5, y: 34 });
});

test("metà campo e ultimo terzo: ruotati, porta in alto", () => {
  assert.deepEqual(viewSize("third"), { w: 74, h: 41 });
  const fit = fitViewport("third", 740, 410);
  assert.equal(fit.rotated, true);
  assert.equal(fit.scale, 10);
  // Centro della porta (105, 34): in alto al centro, a 3 m (margine) dal bordo.
  const goal = { px: fit.offsetX + 34 * fit.scale, py: fit.offsetY - 105 * fit.scale };
  assert.deepEqual(goal, { px: 370, py: 30 });
  assert.deepEqual(screenToField(fit, goal.px, goal.py), { x: 105, y: 34 });
  // Inizio dell'ultimo terzo (x = 70) in basso, sopra il margine.
  assert.equal(fit.offsetY - 70 * fit.scale, 410 - 30);
});

test("duplica e numerazione", () => {
  const p = { id: "a", type: "player", team: "home", x: 10, y: 10, number: "9", gk: false };
  assert.deepEqual(duplicateElement(p, "b"), { ...p, id: "b", x: 12, y: 12 });
  const a = { id: "c", type: "arrow", kind: "move", points: [0, 0, 5, 5] };
  assert.deepEqual(duplicateElement(a, "d").points, [2, 2, 7, 7]);
  const pen = { id: "e", type: "pen", points: [0, 0, 1, 1] };
  assert.deepEqual(duplicateElement(pen, "f").points, [2, 2, 3, 3]);
  assert.equal(nextPlayerNumber([p, { ...p, id: "x", number: "2" }], "home"), "3");
  assert.equal(nextPlayerNumber([p], "away"), "2");
});

test("anteprima: percorso nella cartella della riga", () => {
  const path = boardPreviewPath(W, "set_piece", ID, FILE);
  assert.equal(path, `${W}/set_piece/${ID}/lavagna-${FILE}.png`);
  assert.equal(isBoardPreviewPathFor(path, W, "set_piece", ID), true);
  assert.equal(isBoardPreviewPathFor(path, W, "situational", ID), false);
  assert.equal(isBoardPreviewPathFor(`${W}/set_piece/${ID}/../x/lavagna-${FILE}.png`, W, "set_piece", ID), false);
  assert.equal(isBoardPreviewPathFor(`${W}/set_piece/${ID}/foto.png`, W, "set_piece", ID), false);
});

test("colori: avversari distinguibili da campo e nostri, numeri leggibili", () => {
  const c = BOARD_COLORS;
  // Elementi grafici: almeno 3:1 (WCAG 1.4.11).
  for (const field of [c.pitch, c.pitchStripe]) {
    assert.ok(contrastRatio(c.away, field) >= 4, "avversari / campo");
    assert.ok(contrastRatio(c.homeStroke, field) >= 3, "bordo nostri / campo");
    assert.ok(contrastRatio(c.equipmentStroke, field) >= 3, "bordo materiale / campo");
    assert.ok(contrastRatio(c.lines, field) >= 3, "linee / campo");
  }
  assert.ok(contrastRatio(c.away, c.home) >= 3, "avversari / nostri");
  // Nostri: il colore primario è vicino al verde per luminosità, quindi il
  // cerchio ha un bordo bianco che sul campo supera 3:1.
  assert.ok(contrastRatio(c.awayStroke, c.away) >= 3, "bordo avversari / ambra");
  // Numeri: testo, almeno 4.5:1.
  assert.ok(contrastRatio(c.homeText, c.home) >= 4.5, "numero nostri");
  assert.ok(contrastRatio(c.awayText, c.away) >= 4.5, "numero avversari");
  for (const fill of Object.values(ZONE_FILL)) assert.match(fill, /^#[0-9a-f]{6}$/);
});

test("stessa lavagna anche con chiavi in ordine diverso", () => {
  const a = templateBoard("corner_left");
  const b = JSON.parse(JSON.stringify({ frames: a.frames, field: a.field, version: a.version }));
  assert.equal(sameBoard(a, b), true);
  assert.equal(sameBoard(a, templateBoard("corner_right")), false);
  assert.equal(sameBoard(null, null), true);
  assert.equal(sameBoard(a, null), false);
});
