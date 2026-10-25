// Test della conversione CSV del backup. Esecuzione: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { CSV_BOM, escapeCsvField, formatCsvValue, rowsToCsv } from "./csv.ts";

test("testi con ; virgolette e a capo vengono racchiusi e raddoppiati", () => {
  assert.equal(escapeCsvField("semplice"), "semplice");
  assert.equal(escapeCsvField("a;b"), '"a;b"');
  assert.equal(escapeCsvField('dice "ciao"'), '"dice ""ciao"""');
  assert.equal(escapeCsvField("riga1\nriga2"), '"riga1\nriga2"');
  assert.equal(escapeCsvField("riga1\r\nriga2"), '"riga1\r\nriga2"');
});

test("valori vuoti, booleani, numeri e liste", () => {
  assert.equal(formatCsvValue(null), "");
  assert.equal(formatCsvValue(undefined), "");
  assert.equal(formatCsvValue(""), "");
  assert.equal(formatCsvValue(true), "sì");
  assert.equal(formatCsvValue(false), "no");
  assert.equal(formatCsvValue(42), "42");
  assert.equal(formatCsvValue(0), "0");
  assert.equal(formatCsvValue(7.5), "7,5");
  assert.equal(formatCsvValue([]), "");
  assert.equal(formatCsvValue(["DC", "DLS"]), "DC | DLS");
  assert.equal(formatCsvValue({ a: 1 }), '{"a":1}');
});

test("date e timestamp in formato italiano", () => {
  assert.equal(formatCsvValue("2026-10-25"), "25/10/2026");
  // 10:30 UTC = 11:30 a Roma con l'ora solare (dopo il 25/10/2026)
  assert.equal(formatCsvValue("2026-10-26T10:30:00+00:00"), "26/10/2026 11:30");
  // In estate +2h
  assert.equal(formatCsvValue("2026-07-01 08:05:00.123+00"), "01/07/2026 10:05");
  assert.equal(formatCsvValue(["2026-01-02", "2026-03-04"]), "02/01/2026 | 04/03/2026");
  // Testo normale invariato
  assert.equal(formatCsvValue("Serie B"), "Serie B");
});

test("rowsToCsv: BOM, intestazione, CRLF e casi limite insieme", () => {
  const csv = rowsToCsv([
    { id: 1, note: 'Ottimo; "veloce"\nda rivedere', tags: ["A", "B"], data: "2026-10-25" },
    { id: 2, note: null, tags: [], data: null, extra: 3.25 },
  ]);
  assert.ok(csv.startsWith(CSV_BOM));
  const body = csv.slice(CSV_BOM.length);
  assert.equal(
    body,
    "id;note;tags;data;extra\r\n" +
      '1;"Ottimo; ""veloce""\nda rivedere";A | B;25/10/2026;\r\n' +
      "2;;;;3,25\r\n",
  );
});

test("tabella vuota produce solo il BOM", () => {
  assert.equal(rowsToCsv([]), CSV_BOM);
});
