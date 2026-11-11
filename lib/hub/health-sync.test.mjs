// Traduzione dei dati inviati dall'iPhone. Esecuzione: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeSyncPayload } from "./health-sync.ts";

const hae = (metrics) => ({ data: { metrics } });

test("Health Auto Export: passi, peso in libbre, ossigeno e pressione", () => {
  const rows = normalizeSyncPayload(
    hae([
      { name: "step_count", units: "count", data: [{ qty: 8500, date: "2026-11-10 00:00:00 +0100", source: "Watch" }, { qty: 200, date: "2026-11-10 00:00:00 +0100", source: "iPhone" }] },
      { name: "weight_body_mass", units: "lb", data: [{ qty: 176.37, date: "2026-11-10 07:00:00 +0100" }] },
      { name: "blood_oxygen_saturation", units: "%", data: [{ qty: 0.97, date: "2026-11-10 07:00:00 +0100" }] },
      { name: "blood_pressure", units: "mmHg", data: [{ systolic: 120, diastolic: 80, date: "2026-11-10 08:00:00 +0100" }] },
    ]),
  );
  const get = (t) => rows.find((r) => r.tipo === t);
  assert.equal(get("passi").valore, 8500);
  assert.ok(Math.abs(get("peso").valore - 80) < 0.01);
  assert.equal(get("spo2").valore, 97);
  assert.equal(get("pressione_max").valore, 120);
  assert.equal(get("pressione_min").valore, 80);
});

test("sonno: riassunto giornaliero e singoli periodi", () => {
  const summarized = normalizeSyncPayload(hae([{ name: "sleep_analysis", units: "hr", data: [{ date: "2026-11-10 00:00:00 +0100", totalSleep: 7.5, inBed: 8.2 }] }]));
  assert.deepEqual(summarized, [{ data: "2026-11-10", tipo: "sonno_ore", valore: 7.5 }]);
  const segments = normalizeSyncPayload(
    hae([
      {
        name: "sleep_analysis",
        units: "hr",
        data: [
          { date: "2026-11-09 23:00:00 +0100", endDate: "2026-11-10 03:00:00 +0100", qty: 4, value: "Core", source: "W" },
          { date: "2026-11-10 03:00:00 +0100", endDate: "2026-11-10 06:30:00 +0100", qty: 3.5, value: "Deep", source: "W" },
          { date: "2026-11-09 22:30:00 +0100", endDate: "2026-11-10 07:00:00 +0100", qty: 8.5, value: "In Bed", source: "W" },
        ],
      },
    ]),
  );
  assert.deepEqual(segments, [{ data: "2026-11-10", tipo: "sonno_ore", valore: 7.5 }]);
});

test("formato semplice e dati non validi ignorati", () => {
  const rows = normalizeSyncPayload({ rows: [{ data: "2026-11-10", tipo: "peso", valore: "80,5" }, { data: "boh", tipo: "peso", valore: 1 }, { data: "2026-11-10", tipo: "altro", valore: 1 }, { data: "2026-11-10", tipo: "hrv", valore: -3 }] });
  assert.deepEqual(rows, [{ data: "2026-11-10", tipo: "peso", valore: 80.5 }]);
  assert.deepEqual(normalizeSyncPayload(null), []);
  assert.deepEqual(normalizeSyncPayload("testo"), []);
});
