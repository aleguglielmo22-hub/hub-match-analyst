// Test di elenco partite e squadra preferita. Esecuzione: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { filterMatches, matchTitle, suggestPreferred } from "./matches.ts";

const m = (over) => ({
  id: "1", titolo: null, data_partita: "2026-10-20", preferred_team_id: null, video_file_name: "partita.mp4",
  duration_ms: null, fps: null, width: null, height: null, video_codec: null,
  home: { id: "h", label: "Atalanta" }, away: { id: "a", label: "Città di Castello" },
  competition: { id: "c", label: "Serie C" }, season: { id: "s", label: "2026/27" }, ...over,
});
const none = { q: "", teamId: null, competitionId: null, seasonId: null };

test("titolo da mostrare", () => {
  assert.equal(matchTitle(m({})), "Atalanta – Città di Castello");
  assert.equal(matchTitle(m({ titolo: " Andata " })), "Andata");
  assert.equal(matchTitle(m({ home: null, away: null })), "partita.mp4");
});

test("ricerca senza accenti e filtri", () => {
  const list = [m({}), m({ id: "2", home: { id: "x", label: "Roma" }, away: { id: "y", label: "Lazio" }, competition: null })];
  assert.equal(filterMatches(list, { ...none, q: "citta" }).length, 1);
  assert.equal(filterMatches(list, { ...none, q: "serie c atalanta" }).length, 1);
  assert.equal(filterMatches(list, { ...none, teamId: "y" })[0].id, "2");
  assert.equal(filterMatches(list, { ...none, competitionId: "c" }).length, 1);
  assert.equal(filterMatches(list, { ...none, seasonId: "s" }).length, 2);
  assert.equal(filterMatches(list, none).length, 2);
});

test("squadra preferita dalle preferenze solo se in campo", () => {
  assert.equal(suggestPreferred("h", "h", "a"), "h");
  assert.equal(suggestPreferred("a", "h", "a"), "a");
  assert.equal(suggestPreferred("z", "h", "a"), null);
  assert.equal(suggestPreferred(null, "h", "a"), null);
});
