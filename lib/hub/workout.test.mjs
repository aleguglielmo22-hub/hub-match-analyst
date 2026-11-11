// Calcoli sugli allenamenti. Esecuzione: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  describeTemplateSet,
  estimatedMinutes,
  estimatedOneRepMax,
  formatClock,
  formatSetShort,
  groupByExercise,
  parseClock,
  parseDurationInput,
  parseTemplateSets,
  personalRecords,
  repsHint,
  setLabels,
  setVolume,
  summarizeTemplateSets,
  totalVolume,
} from "./workout.ts";
import { EXERCISE_LIBRARY, missingFromLibrary, normalizeName } from "./exercise-library.ts";

const S = (id, ex, ordine, reps, kg, fatta = true) => ({ id, exercise_id: ex, ordine, ripetizioni: reps, carico_kg: kg, fatta });

test("volume: solo le serie fatte e complete", () => {
  assert.equal(setVolume({ ripetizioni: 8, carico_kg: 60 }), 480);
  assert.equal(setVolume({ ripetizioni: null, carico_kg: 60 }), 0);
  const sets = [S("a", "x", 1, 8, 60), S("b", "x", 2, 8, 60, false), S("c", "x", 3, 5, null)];
  assert.equal(totalVolume(sets), 480);
  assert.equal(totalVolume(sets, false), 960);
});

test("massimale stimato (Epley)", () => {
  assert.equal(estimatedOneRepMax({ ripetizioni: 1, carico_kg: 100 }), 100);
  assert.ok(Math.abs(estimatedOneRepMax({ ripetizioni: 10, carico_kg: 60 }) - 80) < 1e-9);
  assert.equal(estimatedOneRepMax({ ripetizioni: 0, carico_kg: 60 }), 0);
});

test("serie raggruppate per esercizio, nell'ordine di comparsa", () => {
  const g = groupByExercise([S("1", "squat", 1, 5, 80), S("2", "panca", 2, 8, 60), S("3", "squat", 3, 5, 80), S("4", "panca", 4, 8, 60)]);
  assert.deepEqual(g.map((x) => x.exercise_id), ["squat", "panca"]);
  assert.deepEqual(g[0].sets.map((s) => s.id), ["1", "3"]);
});

test("record personali: ignorano le serie non fatte", () => {
  const r = personalRecords([
    { ripetizioni: 5, carico_kg: 100, fatta: true },
    { ripetizioni: 10, carico_kg: 60, fatta: true },
    { ripetizioni: 1, carico_kg: 200, fatta: false },
  ]);
  assert.equal(r.bestWeight, 100);
  assert.equal(r.bestVolume, 600);
  assert.ok(r.bestOneRepMax > 116 && r.bestOneRepMax < 117);
});

test("durata stimata, cronometro e testo delle serie", () => {
  assert.equal(estimatedMinutes([{ serie: 3, recupero_s: 90 }, { serie: 3, recupero_s: null }]), 13);
  assert.equal(formatClock(65), "1:05");
  assert.equal(formatClock(3725), "1:02:05");
  assert.equal(formatClock(-3), "0:00");
  assert.equal(formatSetShort({ ripetizioni: 8, carico_kg: 62.5 }), "62,5 × 8");
  assert.equal(formatSetShort({ ripetizioni: 12, carico_kg: null }), "12 rip.");
  assert.equal(formatSetShort({ ripetizioni: null, carico_kg: null }), "—");
});

test("libreria esercizi: nomi unici, gruppi validi, niente doppioni con quelli esistenti", () => {
  const names = EXERCISE_LIBRARY.map((e) => normalizeName(e.nome));
  assert.equal(new Set(names).size, names.length);
  const groups = new Set(["gambe", "glutei", "petto", "schiena", "spalle", "braccia", "core", "total_body", "cardio", "mobilita"]);
  for (const e of EXERCISE_LIBRARY) assert.ok(groups.has(e.gruppo), `${e.nome}: gruppo ${e.gruppo}`);
  const missing = missingFromLibrary(["SQUAT", "  panca  piana ", "Esercizio mio"]);
  assert.equal(missing.length, EXERCISE_LIBRARY.length - 2);
  assert.ok(!missing.some((e) => e.nome === "Squat"));
});

test("il riscaldamento non conta per volume e record", () => {
  const sets = [
    { ...S("a", "x", 1, 10, 20), tipo: "riscaldamento" },
    S("b", "x", 2, 8, 60),
  ];
  assert.equal(totalVolume(sets), 480);
  assert.equal(personalRecords(sets).bestWeight, 60);
});

test("durate: orologio e testo libero", () => {
  assert.equal(parseClock("05:00"), 300);
  assert.equal(parseClock("1:02:03"), 3723);
  assert.equal(parseClock("00:75"), null);
  assert.equal(parseDurationInput("40"), 40);
  assert.equal(parseDurationInput("1:30"), 90);
  assert.equal(parseDurationInput(""), null);
  assert.equal(parseDurationInput("abc"), null);
});

test("range di ripetizioni e numerazione delle serie", () => {
  assert.equal(repsHint(8, 10), "8-10");
  assert.equal(repsHint(12, 12), "12");
  assert.equal(repsHint(null, null), "");
  assert.deepEqual(setLabels(["riscaldamento", "normale", "normale", "drop", "cedimento"]), ["R", "1", "2", "D", "C"]);
});

test("dettaglio di una scheda: lettura sicura e riassunto", () => {
  const sets = parseTemplateSets([
    { t: "riscaldamento", min: 8, max: 10, kg: 10 },
    { t: "normale", min: 8, max: 10, kg: 15 },
    { t: "boh", rip: 12, kg: -5 },
    "rotto",
    null,
  ]);
  assert.equal(sets.length, 3);
  assert.equal(sets[2].t, "normale");
  assert.equal(sets[2].kg, null);
  assert.deepEqual(summarizeTemplateSets(sets.slice(0, 2)), { serie: 2, ripetizioni: "8-10", carico_kg: 15 });
  assert.deepEqual(parseTemplateSets("no"), []);
  assert.equal(describeTemplateSet({ t: "normale", rip: null, min: 8, max: 10, kg: 15, dur: null }), "8-10 rip. × 15 kg");
  assert.equal(describeTemplateSet({ t: "normale", rip: null, min: null, max: null, kg: null, dur: 300 }), "5:00");
});
