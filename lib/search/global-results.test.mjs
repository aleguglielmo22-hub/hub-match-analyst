// Test della ricerca globale (raggruppamento ed evidenziazione). Esecuzione: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { groupSearchResults, highlightParts } from "./global-results.ts";

const row = (sezione, id, titolo, punteggio = 0, extra = {}) => ({
  sezione,
  tipo: extra.tipo ?? sezione,
  id,
  titolo,
  sottotitolo: extra.sottotitolo ?? null,
  data: extra.data ?? null,
  punteggio,
  collegato_a: extra.collegato_a ?? null,
  apri_id: extra.apri_id ?? null,
});

test("gruppi nell'ordine delle sezioni, ordinati per pertinenza", () => {
  const groups = groupSearchResults([
    row("archive", "a1", "Clip Roma"),
    row("player", "p2", "Mario Rossi", 0.2),
    row("player", "p1", "Paulo Dybala", 1.5),
    row("set_piece", "s1", "Angolo 2+3"),
  ]);
  assert.deepEqual(
    groups.map((g) => g.label),
    ["Giocatori", "Piazzati", "Cloud"],
  );
  assert.deepEqual(
    groups[0].results.map((r) => r.title),
    ["Paulo Dybala", "Mario Rossi"],
  );
  assert.equal(groups[0].results[0].href, "/scouting/p1");
  assert.equal(groups[2].results[0].href, "/archivio/a1");
});

test("un'osservazione apre la scheda del suo giocatore", () => {
  const [g] = groupSearchResults([row("observation", "o1", "Paulo Dybala", 0.4, { apri_id: "p1" })]);
  assert.equal(g.label, "Osservazioni");
  assert.equal(g.results[0].href, "/scouting/p1");
});

test("collegati raggruppati per giocatore, senza ripetere risultati già mostrati", () => {
  const groups = groupSearchResults([
    row("player", "p1", "Paulo Dybala", 1),
    row("set_piece", "s1", "Punizione centrale", 0.5),
    row("related", "s1", "Punizione centrale", 0, { tipo: "set_piece", collegato_a: "Paulo Dybala" }),
    row("related", "s2", "Angolo corto", 0, { tipo: "set_piece", collegato_a: "Paulo Dybala" }),
    row("related", "a1", "Report Dybala", 0, { tipo: "archive", collegato_a: "Paulo Dybala" }),
  ]);
  const rel = groups.find((g) => g.key.startsWith("related:"));
  assert.equal(rel.label, "Collegati a Paulo Dybala");
  assert.deepEqual(
    rel.results.map((r) => [r.kind, r.id, r.href]),
    [
      ["set_piece", "s2", "/set-pieces/s2"],
      ["archive", "a1", "/archivio/a1"],
    ],
  );
  assert.equal(groupSearchResults([]).length, 0);
});

const marked = (parts) => parts.filter((p) => p.match).map((p) => p.text);

test("evidenzia ignorando maiuscole e accenti, senza cambiare il testo", () => {
  assert.deepEqual(marked(highlightParts("Paulo Dybala", "dybala")), ["Dybala"]);
  assert.deepEqual(marked(highlightParts("Città di Castello", "citta")), ["Città"]);
  assert.deepEqual(marked(highlightParts("Sporting CP", "SPÒRT")), ["Sport"]);
  assert.equal(highlightParts("Città di Castello", "citta").map((p) => p.text).join(""), "Città di Castello");
});

test("tutte le occorrenze, nessuna se non c'è corrispondenza", () => {
  assert.deepEqual(marked(highlightParts("Roma - Roma B", "roma")), ["Roma", "Roma"]);
  assert.deepEqual(highlightParts("Inter", "milan"), [{ text: "Inter", match: false }]);
  assert.deepEqual(highlightParts("Inter", "  "), [{ text: "Inter", match: false }]);
  assert.deepEqual(highlightParts("", "x"), []);
});
