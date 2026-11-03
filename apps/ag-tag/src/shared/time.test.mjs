// Test di tempo e fotogrammi del lettore. Esecuzione: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { formatDuration, formatTimecode, frameAt, jump, nextRate, parseFps, stepFrames, timeOfFrame } from "./time.ts";

test("fotogramma mostrato e istante per mostrarlo", () => {
  assert.equal(frameAt(0, 25), 0);
  assert.equal(frameAt(1, 25), 25);
  assert.equal(frameAt(0.0399, 25), 0);
  assert.equal(frameAt(0.04, 25), 1);
  assert.equal(frameAt(timeOfFrame(1234, 29.97), 29.97), 1234);
  assert.equal(frameAt(timeOfFrame(0, 50), 50), 0);
});

test("fotogramma avanti/indietro entro la durata", () => {
  const fps = 25;
  assert.equal(frameAt(stepFrames(10, fps, 1, 60), fps), 251);
  assert.equal(frameAt(stepFrames(10, fps, -1, 60), fps), 249);
  assert.equal(stepFrames(0, fps, -1, 60), timeOfFrame(0, fps));
  // Ultimo fotogramma di 60 s a 25 fps = 1499.
  assert.equal(frameAt(stepFrames(59.99, fps, 5, 60), fps), 1499);
  // NTSC: avanzare di 1000 fotogrammi uno per volta non perde passi.
  let t = 0;
  for (let i = 0; i < 1000; i++) t = stepFrames(t, 29.97, 1, 3600);
  assert.equal(frameAt(t, 29.97), 1000);
});

test("salti di ±5 s e velocità 0,25–2×", () => {
  assert.equal(jump(3, -5, 100), 0);
  assert.equal(jump(98, 5, 100), 100);
  assert.equal(jump(10, 5, 100), 15);
  assert.equal(nextRate(1, 1), 1.25);
  assert.equal(nextRate(2, 1), 2);
  assert.equal(nextRate(0.25, -1), 0.25);
  assert.equal(nextRate(0.5, -1), 0.25);
});

test("formati di tempo e fps di FFprobe", () => {
  assert.equal(formatTimecode(62.04), "01:02.040");
  assert.equal(formatTimecode(3723.5), "1:02:03.500");
  assert.equal(formatTimecode(-1), "00:00.000");
  assert.equal(formatDuration(5_520_000), "1 h 32 min");
  assert.equal(formatDuration(null), "—");
  assert.equal(parseFps("30000/1001"), 29.97);
  assert.equal(parseFps("25/1"), 25);
  assert.equal(parseFps("0/0"), null);
  assert.equal(parseFps(undefined), null);
});
