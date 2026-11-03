// Test delle scorciatoie del lettore. Esecuzione: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SHORTCUTS, actionFor, comboLabel, comboOf, conflicts, mergeShortcuts } from "./shortcuts.ts";

const key = (code, mods = {}) => ({ code, shiftKey: false, altKey: false, ctrlKey: false, metaKey: false, ...mods });

test("combinazioni e azioni", () => {
  assert.equal(comboOf(key("ArrowRight", { shiftKey: true })), "Shift+ArrowRight");
  assert.equal(actionFor(key("ArrowRight"), DEFAULT_SHORTCUTS), "frameForward");
  assert.equal(actionFor(key("ArrowRight", { shiftKey: true }), DEFAULT_SHORTCUTS), "jumpForward");
  assert.equal(actionFor(key("Space"), DEFAULT_SHORTCUTS), "playPause");
  assert.equal(actionFor(key("KeyQ"), DEFAULT_SHORTCUTS), null);
  assert.deepEqual(conflicts(DEFAULT_SHORTCUTS), []);
  assert.deepEqual(conflicts({ ...DEFAULT_SHORTCUTS, faster: "Space" }), [["playPause", "faster"]]);
});

test("impostazioni salvate unite ai predefiniti", () => {
  assert.deepEqual(mergeShortcuts(null), DEFAULT_SHORTCUTS);
  const m = mergeShortcuts({ playPause: "KeyK", ghost: "KeyG", frameBack: 3 });
  assert.equal(m.playPause, "KeyK");
  assert.equal(m.frameBack, DEFAULT_SHORTCUTS.frameBack);
  assert.equal("ghost" in m, false);
  assert.equal(comboLabel("Shift+ArrowRight"), "⇧ →");
  assert.equal(comboLabel("KeyK"), "K");
});
