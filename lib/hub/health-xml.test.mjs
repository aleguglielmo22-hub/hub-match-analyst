// Lettura dell'esportazione di Apple Salute. Esecuzione: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHealthParser } from "./health-xml.ts";

const rec = (type, extra) => `<Record type="${type}" sourceName="X" unit="count" startDate="2026-11-10 08:00:00 +0100" endDate="2026-11-10 08:10:00 +0100" ${extra}/>`;

test("passi: somma per giorno, tenendo la fonte con più dati", () => {
  const p = createHealthParser();
  p.push(
    [
      rec("HKQuantityTypeIdentifierStepCount", 'sourceName="iPhone" value="1000"'),
      rec("HKQuantityTypeIdentifierStepCount", 'sourceName="iPhone" value="500"'),
      rec("HKQuantityTypeIdentifierStepCount", 'sourceName="Watch" value="1400"'),
    ]
      .join("\n")
      .replace(/sourceName="X" /g, ""),
  );
  const { rows } = p.finish();
  assert.deepEqual(rows, [{ data: "2026-11-10", tipo: "passi", valore: 1500 }]);
});

test("tag spezzati tra un pezzo e l'altro, peso in libbre e grasso in frazione", () => {
  const xml = [
    '<Record type="HKQuantityTypeIdentifierBodyMass" unit="lb" endDate="2026-11-09 07:00:00 +0100" startDate="2026-11-09 07:00:00 +0100" value="176.37"/>',
    '<Record type="HKQuantityTypeIdentifierBodyFatPercentage" unit="%" endDate="2026-11-09 07:00:00 +0100" startDate="2026-11-09 07:00:00 +0100" value="0.185"/>',
  ].join("\n");
  const p = createHealthParser();
  for (let i = 0; i < xml.length; i += 17) p.push(xml.slice(i, i + 17));
  const { rows } = p.finish();
  const peso = rows.find((r) => r.tipo === "peso");
  assert.ok(Math.abs(peso.valore - 80) < 0.01);
  assert.equal(rows.find((r) => r.tipo === "grasso_corporeo").valore, 18.5);
});

test("sonno: solo i periodi addormentato, assegnati al giorno del risveglio", () => {
  const p = createHealthParser();
  p.push(
    [
      '<Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="W" startDate="2026-11-09 23:00:00 +0100" endDate="2026-11-10 03:00:00 +0100" value="HKCategoryValueSleepAnalysisAsleepCore"/>',
      '<Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="W" startDate="2026-11-10 03:00:00 +0100" endDate="2026-11-10 06:30:00 +0100" value="HKCategoryValueSleepAnalysisAsleepDeep"/>',
      '<Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="W" startDate="2026-11-09 22:30:00 +0100" endDate="2026-11-10 07:00:00 +0100" value="HKCategoryValueSleepAnalysisInBed"/>',
    ].join("\n"),
  );
  assert.deepEqual(p.finish().rows, [{ data: "2026-11-10", tipo: "sonno_ore", valore: 7.5 }]);
});

test("la data di inizio esclude i giorni più vecchi e i tipi sconosciuti sono ignorati", () => {
  const p = createHealthParser("2026-11-10");
  p.push(
    '<Record type="HKQuantityTypeIdentifierStepCount" startDate="2026-11-09 08:00:00 +0100" endDate="2026-11-09 08:10:00 +0100" value="5"/><Record type="HKQuantityTypeIdentifierDietaryWater" startDate="2026-11-10 08:00:00 +0100" endDate="2026-11-10 08:10:00 +0100" value="5"/>',
  );
  assert.deepEqual(p.finish().rows, []);
});
