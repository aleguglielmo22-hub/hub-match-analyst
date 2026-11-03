// Test dell'impronta dei file video. Esecuzione: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, renameSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FINGERPRINT_BLOCK, fingerprintFile } from "./fingerprint.ts";

const dir = mkdtempSync(join(tmpdir(), "agtag-fp-"));
const file = (name, bytes) => {
  const p = join(dir, name);
  writeFileSync(p, bytes);
  return p;
};
const pattern = (size, seed = 1) => Buffer.from(Array.from({ length: size }, (_, i) => (i * 31 + seed) % 251));

test("stesso contenuto = stessa impronta, anche rinominato o spostato", async () => {
  const data = pattern(5 * FINGERPRINT_BLOCK + 123);
  const a = await fingerprintFile(file("a.mp4", data));
  const p = file("b.mp4", data);
  renameSync(p, join(dir, "rinominato.mov"));
  const b = await fingerprintFile(join(dir, "rinominato.mov"));
  assert.equal(a.fingerprint, b.fingerprint);
  assert.equal(a.sizeBytes, data.length);
  assert.match(a.fingerprint, /^[0-9a-f]{64}$/);
});

test("contenuto o dimensione diversi = impronta diversa", async () => {
  const data = pattern(5 * FINGERPRINT_BLOCK);
  const base = await fingerprintFile(file("c.mp4", data));
  for (const offset of [10, Math.floor(data.length / 2), data.length - 10]) {
    const changed = Buffer.from(data);
    changed[offset] ^= 0xff;
    assert.notEqual((await fingerprintFile(file(`d${offset}.mp4`, changed))).fingerprint, base.fingerprint, `offset ${offset}`);
  }
  assert.notEqual((await fingerprintFile(file("e.mp4", data.subarray(0, data.length - 1)))).fingerprint, base.fingerprint);
});

test("file più piccoli di un blocco", async () => {
  const small = await fingerprintFile(file("small.mp4", pattern(1000)));
  assert.equal(small.sizeBytes, 1000);
  const empty = await fingerprintFile(file("empty.mp4", Buffer.alloc(0)));
  assert.equal(empty.sizeBytes, 0);
});
