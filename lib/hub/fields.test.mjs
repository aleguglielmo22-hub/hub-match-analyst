// Campi delle sezioni personali. Esecuzione: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  daysUntil,
  eurosToCents,
  formatMoney,
  formatValue,
  initialValues,
  nextReviewDate,
  parseDecimal,
  parseTags,
  parseValues,
} from "./fields.ts";

test("numeri scritti all'italiana o all'inglese", () => {
  assert.equal(parseDecimal("12,5"), 12.5);
  assert.equal(parseDecimal("1.234,56"), 1234.56);
  assert.equal(parseDecimal("1,234.56"), 1234.56);
  assert.equal(parseDecimal("-45,10 €"), -45.1);
  assert.equal(parseDecimal("abc"), null);
  assert.equal(parseDecimal(""), null);
});

test("euro → centesimi senza errori di arrotondamento", () => {
  assert.equal(eurosToCents("0,1"), 10);
  assert.equal(eurosToCents("19,99"), 1999);
  assert.equal(eurosToCents("1.000"), 100000);
  assert.equal(eurosToCents("12.500,50"), 1250050);
  assert.equal(eurosToCents("72.5"), 7250);
  assert.match(formatMoney(12345678), /123\.456,78/);
});

test("tag puliti, senza doppioni", () => {
  assert.deepEqual(parseTags(" tattica, Esame ,tattica,, "), ["tattica", "Esame"]);
  assert.deepEqual(parseTags(["a", "A", 3]), ["a"]);
});

const FIELDS = [
  { key: "titolo", label: "Titolo", type: "text", required: true, max: 10 },
  { key: "importo", label: "Importo", type: "money", required: true, min: 0.01 },
  { key: "stato", label: "Stato", type: "select", options: [{ value: "a", label: "A" }] },
  { key: "link", label: "Link", type: "url" },
  { key: "data", label: "Data", type: "date" },
  { key: "voto", label: "Voto", type: "rating" },
  { key: "fatto", label: "Fatto", type: "boolean" },
  { key: "ripassi", label: "Ripassi", type: "integer", readOnly: true },
];

test("valori validi: solo i campi dichiarati, già convertiti", () => {
  const r = parseValues(FIELDS, {
    titolo: " Ciao ",
    importo: "12,50",
    stato: "a",
    link: "https://esempio.it",
    data: "2026-11-11",
    voto: "4",
    fatto: true,
    ripassi: 3,
    workspace_id: "attacco",
  });
  assert.equal(r.ok, true);
  assert.deepEqual(r.values, { titolo: "Ciao", importo: 1250, stato: "a", link: "https://esempio.it", data: "2026-11-11", voto: 4, fatto: true });
});

test("valori non validi: un messaggio per campo", () => {
  const r = parseValues(FIELDS, { titolo: "", importo: "0", stato: "z", link: "javascript:alert(1)", data: "11/11/2026", voto: "7" });
  assert.equal(r.ok, false);
  assert.deepEqual(Object.keys(r.errors).sort(), ["data", "importo", "link", "stato", "titolo", "voto"]);
});

test("formattazione per le liste", () => {
  assert.equal(formatValue({ key: "d", label: "", type: "date" }, "2026-11-11"), "11 nov 2026");
  assert.equal(formatValue({ key: "v", label: "", type: "rating" }, 3), "★★★☆☆");
  assert.equal(formatValue({ key: "p", label: "", type: "number", unit: "kg" }, 72.5), "72,5 kg");
  assert.equal(formatValue({ key: "r", label: "", type: "ref" }, "x", { x: "Spesa" }), "Spesa");
});

test("valori iniziali: predefiniti, modello e 'oggi'", () => {
  const now = new Date(2026, 10, 11);
  const v = initialValues(
    [
      { key: "data", label: "", type: "date", defaultValue: "today" },
      { key: "stato", label: "", type: "select", defaultValue: "a" },
      { key: "imp", label: "", type: "money", defaultValue: "0" },
    ],
    null,
    { stato: "b" },
    now,
  );
  assert.deepEqual(v, { data: "2026-11-11", stato: "b", imp: "0" });
});

test("ripasso a distanza: 1 giorno, 1 settimana, 1 mese", () => {
  assert.equal(nextReviewDate("2026-11-01", 0), "2026-11-02");
  assert.equal(nextReviewDate("2026-11-01", 1), "2026-11-08");
  assert.equal(nextReviewDate("2026-11-01", 2), "2026-12-01");
  assert.equal(nextReviewDate("2026-11-01", 3), null);
  assert.equal(nextReviewDate(null, 0), null);
});

test("date: giorni mancanti e somma di giorni", () => {
  const now = new Date(2026, 10, 11);
  assert.equal(daysUntil("2026-11-21", now), 10);
  assert.equal(daysUntil("2026-11-10", now), -1);
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
});
