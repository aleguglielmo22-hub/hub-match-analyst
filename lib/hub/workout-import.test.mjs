// Importazione dello storico degli allenamenti. Esecuzione: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { chunkSessions, groupWorkoutRows, lbToKg } from "./workout-import.ts";
import { parseAnyDate } from "./csv-parse.ts";

const R = (data, titolo, esercizio, reps, kg) => ({ data, titolo, esercizio, ripetizioni: reps, carico_kg: kg });

test("righe → allenamenti per data e titolo, serie nell'ordine del file", () => {
  const g = groupWorkoutRows([
    R("2026-11-01", "Push", "Panca", 8, 60),
    R("2026-11-01", "Push", "Panca", 8, 62.5),
    R("2026-11-01", "Pull", "Trazioni", 6, 0),
    R("2026-11-03", "Push", "Panca", 8, 60),
  ]);
  assert.equal(g.length, 3);
  assert.deepEqual(g[0].sets.map((s) => s.carico_kg), [60, 62.5]);
});

test("i blocchi non spezzano mai un allenamento", () => {
  const groups = [
    { data: "d1", titolo: "a", sets: Array(10).fill(0) },
    { data: "d2", titolo: "b", sets: Array(10).fill(0) },
    { data: "d3", titolo: "c", sets: Array(25).fill(0) },
  ];
  const chunks = chunkSessions(groups, 15);
  assert.deepEqual(chunks.map((c) => c.map((g) => g.titolo)), [["a"], ["b"], ["c"]]);
  assert.equal(chunkSessions(groups, 100).length, 1);
  assert.deepEqual(chunkSessions([], 10), []);
});

test("libbre → kg", () => {
  assert.equal(lbToKg(100), 45.36);
  assert.equal(lbToKg(0), 0);
});

test("date con il nome del mese", () => {
  assert.equal(parseAnyDate("27 Jul 2025, 08:00"), "2025-07-27");
  assert.equal(parseAnyDate("Jul 27, 2025"), "2025-07-27");
  assert.equal(parseAnyDate("3 gen 2026"), "2026-01-03");
  assert.equal(parseAnyDate("31 Feb 2026"), null);
  assert.equal(parseAnyDate("27 Foo 2025"), null);
});
