// Lettura dei CSV importati. Esecuzione: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { aggregate, detectDelimiter, parseAnyDate, parseCsv } from "./csv-parse.ts";

test("separatore riconosciuto", () => {
  assert.equal(detectDelimiter("a;b;c\n1;2;3"), ";");
  assert.equal(detectDelimiter("a,b\n1,2"), ",");
  assert.equal(detectDelimiter("a\tb\n1\t2"), "\t");
});

test("virgolette, virgolette doppie e a capo dentro le celle", () => {
  const rows = parseCsv('data,descrizione,importo\r\n2026-11-01,"Spesa, Coop",-12.50\n2026-11-02,"Detto ""ciao""\nsu due righe",3\n\n');
  assert.deepEqual(rows, [
    ["data", "descrizione", "importo"],
    ["2026-11-01", "Spesa, Coop", "-12.50"],
    ["2026-11-02", 'Detto "ciao"\nsu due righe', "3"],
  ]);
});

test("date in tanti formati", () => {
  assert.equal(parseAnyDate("2026-11-10"), "2026-11-10");
  assert.equal(parseAnyDate("2026-11-10 08:30:00+0000"), "2026-11-10");
  assert.equal(parseAnyDate("10/11/2026"), "2026-11-10");
  assert.equal(parseAnyDate("10.11.2026"), "2026-11-10");
  assert.equal(parseAnyDate("20261110"), "2026-11-10");
  assert.equal(parseAnyDate("31/02/2026"), null);
  assert.equal(parseAnyDate("ciao"), null);
  assert.ok(parseAnyDate("1794400000"));
});

test("più valori nello stesso giorno", () => {
  assert.equal(aggregate([1, 2, 3], "media"), 2);
  assert.equal(aggregate([1, 2, 3], "somma"), 6);
  assert.equal(aggregate([5, 2, 9], "ultimo"), 9);
  assert.equal(aggregate([5, 2, 9], "minimo"), 2);
  assert.equal(aggregate([5, 2, 9], "massimo"), 9);
});
