// Test delle lettere degli eventi. Esecuzione: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { eventFor, eventKeyConflicts, mergeEventKeys, withDefaults } from "./panel-shortcuts.ts";
import { DEFAULT_SHORTCUTS } from "./shortcuts.ts";

const key = (code, mods = {}) => ({ code, shiftKey: false, altKey: false, ctrlKey: false, metaKey: false, ...mods });
const CODES = ["COS", "PRS", "IND"];

test("lettere salvate ripulite", () => {
  assert.deepEqual(mergeEventKeys({ COS: "KeyW", "bad code!": "KeyQ", PRS: 3, IND: "" }), { COS: "KeyW" });
  assert.deepEqual(mergeEventKeys(null), {});
});

test("predefinite dopo l'importazione: le scelte già fatte restano", () => {
  assert.deepEqual(withDefaults({ COS: "KeyX" }, { COS: "KeyW", PRS: "KeyS", IND: "KeyX" }), { COS: "KeyX", PRS: "KeyS" });
});

test("evento dalla pressione, modificatori compresi", () => {
  const keys = { COS: "KeyW", PRS: "KeyS" };
  assert.equal(eventFor(key("KeyW"), keys, CODES), "COS");
  assert.equal(eventFor(key("KeyW", { shiftKey: true }), keys, CODES), null);
  assert.equal(eventFor(key("KeyS"), keys, ["COS"]), null);
});

test("lettere dei tuoi file senza conflitti con il lettore", () => {
  const keys = { RFF: "KeyQ", COS: "KeyW", SVI: "KeyR", RIF: "KeyT", TRD: "KeyY", RFC: "KeyA", PRS: "KeyS", DPO: "KeyD", DAR: "KeyH", TRO: "KeyJ", PIF: "KeyZ", PIC: "KeyU", INDV: "KeyK" };
  assert.deepEqual(eventKeyConflicts(keys, Object.keys(keys), DEFAULT_SHORTCUTS), []);
});

test("conflitti tra eventi e con il lettore", () => {
  const c = eventKeyConflicts({ COS: "KeyW", PRS: "KeyW", IND: "Space" }, CODES, DEFAULT_SHORTCUTS);
  assert.deepEqual(c, [
    { code: "COS", with: "PRS" },
    { code: "PRS", with: "COS" },
    { code: "IND", with: "Play / pausa" },
  ]);
});
