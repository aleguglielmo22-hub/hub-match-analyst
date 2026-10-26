// Test del riepilogo delle osservazioni. Esecuzione: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { sortObservationsDesc, summarizeObservations } from "./observations.ts";

const obs = (data_osservazione, voto, created_at = `${data_osservazione}T10:00:00Z`) => ({
  data_osservazione,
  voto,
  created_at,
});

test("riepilogo: numero, media, ultimo voto, ultima data e andamento", () => {
  const s = summarizeObservations([
    obs("2026-09-01", 6),
    obs("2026-10-12", null), // solo nota: conta, ma non nel voto
    obs("2026-09-20", 8),
    obs("2026-10-05", 7),
  ]);
  assert.equal(s.count, 4);
  assert.equal(s.average, 7);
  assert.equal(s.lastVoto, 7);
  assert.equal(s.lastDate, "2026-10-12");
  assert.deepEqual(
    s.trend.map((t) => t.voto),
    [6, 8, 7],
  );
});

test("media arrotondata a un decimale", () => {
  assert.equal(summarizeObservations([obs("2026-01-01", 7), obs("2026-01-02", 8), obs("2026-01-03", 8)]).average, 7.7);
});

test("nessuna osservazione o nessun voto", () => {
  assert.deepEqual(summarizeObservations([]), {
    count: 0,
    average: null,
    lastVoto: null,
    lastDate: null,
    trend: [],
  });
  const onlyNotes = summarizeObservations([obs("2026-03-01", null)]);
  assert.equal(onlyNotes.count, 1);
  assert.equal(onlyNotes.average, null);
  assert.equal(onlyNotes.lastDate, "2026-03-01");
});

test("stessa data: prima l'osservazione inserita per ultima", () => {
  const list = sortObservationsDesc([
    obs("2026-05-01", 5, "2026-05-01T09:00:00Z"),
    obs("2026-05-01", 9, "2026-05-01T18:00:00Z"),
    obs("2026-04-01", 6),
  ]);
  assert.deepEqual(
    list.map((o) => o.voto),
    [9, 5, 6],
  );
});
