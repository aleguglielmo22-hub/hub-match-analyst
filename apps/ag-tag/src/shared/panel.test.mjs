// Test del pannello di codifica. Esecuzione: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyLeadLag, buildPair, defaultSelection, filterTags, groupsFor, isStars, needsCompletion, preferredLockMessage,
  preferredSide, press, setSpan, toggleLabel, validateLabels,
} from "./panel.ts";

const group = (code, selection, labels) => ({ code, name: code, selection, labels: labels.map((l) => ({ code: l, name: l })) });
const event = (code, mirrorCode, family, lead = 0, lag = 0) => ({
  code, name: code, mirrorCode, family, color: "#000000", leadMs: lead, lagMs: lag,
  groups: {
    own: [group(`${code}-G1`, "single", [`${code}-0`, `${code}-1`]), group(`${code}-G2`, "multi", [`${code}-2`, `${code}-3`])],
    opp: [group(`AVV-${code}-G1`, "single", [`AVV-${code}-0`])],
  },
});
const panel = {
  events: [
    event("COS", "PRS", "possesso"),
    event("PRS", "COS", "non_possesso", 3000),
    event("TRD", "TRO", "transizione", 5000),
    event("TRO", "TRD", "transizione", 5000),
    event("IND", null, "individuali", 5000, 10000),
  ],
};
let n = 0;
const newId = () => `id${++n}`;

test("selezione dei gruppi da D4", () => {
  for (const g of ["Meccanismo", "Giocata", "Comportamento", "Pericolo", "Aspetto"]) assert.equal(defaultSelection(g), "multi");
  for (const g of ["Struttura", "Corridoio", "Zona attaccata", "Uomini in ripartenza", "Fase"]) assert.equal(defaultSelection(g), "single");
});

test("scelta singola sostituisce, multipla aggiunge e toglie", () => {
  const groups = panel.events[0].groups.own;
  let s = toggleLabel(groups, [], "COS-0");
  s = toggleLabel(groups, s, "COS-1");
  assert.deepEqual(s, ["COS-1"]);
  s = toggleLabel(groups, s, "COS-2");
  s = toggleLabel(groups, s, "COS-3");
  assert.deepEqual(s, ["COS-1", "COS-2", "COS-3"]);
  s = toggleLabel(groups, s, "COS-2");
  assert.deepEqual(s, ["COS-1", "COS-3"]);
  assert.deepEqual(toggleLabel(groups, s, "XXX"), s);
  assert.deepEqual(toggleLabel(groups, s, "COS-1"), ["COS-3"]);
});

test("validazione: gruppo singolo, voci di altri eventi o dell'altro lato", () => {
  const groups = panel.events[0].groups.own;
  assert.equal(validateLabels(groups, ["COS-0", "COS-2", "COS-3"]), null);
  assert.match(validateLabels(groups, ["COS-0", "COS-1"]), /una sola voce/);
  assert.match(validateLabels(groups, ["PRS-0"]), /non appartiene/);
  assert.match(validateLabels(groups, ["AVV-COS-0"]), /non appartiene/);
  assert.match(validateLabels(groups, ["COS-2", "COS-2"]), /due volte/);
});

test("stelle: solo 1, 2, 3 o nessuna", () => {
  for (const v of [0, 1, 2, 3]) assert.ok(isStars(v));
  for (const v of [4, -1, 1.5, "2", null]) assert.ok(!isStars(v));
});

test("squadra preferita e set da usare", () => {
  assert.equal(preferredSide("h", "h", "a"), "home");
  assert.equal(preferredSide("a", "h", "a"), "away");
  assert.equal(preferredSide("x", "h", "a"), null);
  assert.equal(preferredSide(null, "h", "a"), null);
  const cos = panel.events[0];
  assert.equal(groupsFor(cos, "home", "home"), cos.groups.own);
  assert.equal(groupsFor(cos, "away", "home"), cos.groups.opp);
  assert.equal(groupsFor(cos, "away", "away"), cos.groups.own);
});

test("registrazione: lo stesso tasto chiude, un altro evento chiude quello in corso", () => {
  let r = press(panel, [], "COS", 1000);
  assert.deepEqual(r, { open: [{ code: "COS", startMs: 1000 }], finished: [] });
  r = press(panel, r.open, "PRS", 4000);
  assert.deepEqual(r.finished, [{ code: "COS", startMs: 1000, endMs: 4000 }]);
  assert.deepEqual(r.open, [{ code: "PRS", startMs: 4000 }]);
  r = press(panel, r.open, "PRS", 6000);
  assert.deepEqual(r, { open: [], finished: [{ code: "PRS", startMs: 4000, endMs: 6000 }] });
  assert.deepEqual(press(panel, [], "ZZZ", 0), { open: [], finished: [] });
});

test("registrazione: Individuali si sovrappone e non chiude gli altri", () => {
  let r = press(panel, [], "COS", 0);
  r = press(panel, r.open, "IND", 500);
  assert.equal(r.finished.length, 0);
  assert.equal(r.open.length, 2);
  r = press(panel, r.open, "TRD", 900);
  assert.deepEqual(r.finished, [{ code: "COS", startMs: 0, endMs: 900 }]);
  assert.deepEqual(r.open.map((o) => o.code), ["IND", "TRD"]);
});

test("anticipo e coda entro la durata del video", () => {
  assert.deepEqual(applyLeadLag({ leadMs: 5000, lagMs: 10000 }, 20000, 30000, 60000), { startMs: 15000, endMs: 40000 });
  assert.deepEqual(applyLeadLag({ leadMs: 5000, lagMs: 10000 }, 2000, 55000, 60000), { startMs: 0, endMs: 60000 });
  assert.deepEqual(applyLeadLag({ leadMs: 0, lagMs: 0 }, 9000, 4000, null), { startMs: 4000, endMs: 9000 });
});

test("coppia specchio: evento e lato opposti, stesso intervallo, sottotag vuoti", () => {
  const { original, mirror } = buildPair(panel, { code: "PRS", startMs: 10000, endMs: 14000 }, "home", 90000, newId);
  assert.equal(original.eventCode, "PRS");
  assert.equal(original.side, "home");
  assert.deepEqual([original.startMs, original.endMs], [7000, 14000]);
  assert.equal(mirror.eventCode, "COS");
  assert.equal(mirror.side, "away");
  assert.equal(mirror.originId, original.id);
  assert.deepEqual([mirror.startMs, mirror.endMs, mirror.labels, mirror.stars, mirror.note], [7000, 14000, [], 0, ""]);
  assert.ok(needsCompletion(panel, mirror, "home"));
  assert.ok(!needsCompletion(panel, { ...mirror, labels: ["AVV-COS-0"] }, "home"));
});

test("Individuali senza specchio", () => {
  const pair = buildPair(panel, { code: "IND", startMs: 20000, endMs: 21000 }, "away", null, newId);
  assert.equal(pair.mirror, null);
  assert.deepEqual([pair.original.startMs, pair.original.endMs], [15000, 31000]);
  assert.throws(() => buildPair(panel, { code: "ZZZ", startMs: 0, endMs: 1 }, "home", null, newId), /non presente/);
});

test("lo specchio segue l'intervallo dell'originale", () => {
  const pair = setSpan(buildPair(panel, { code: "COS", startMs: 0, endMs: 1000 }, "home", null, newId), 5000, 2000);
  assert.deepEqual([pair.original.startMs, pair.original.endMs], [2000, 5000]);
  assert.deepEqual([pair.mirror.startMs, pair.mirror.endMs], [2000, 5000]);
});

test("ricerca: originali e specchi filtrabili separatamente", () => {
  const a = buildPair(panel, { code: "COS", startMs: 1000, endMs: 2000 }, "home", null, newId);
  const b = buildPair(panel, { code: "PRS", startMs: 5000, endMs: 6000 }, "home", null, newId);
  b.original.stars = 2;
  const all = { eventCode: null, perspective: null, minStars: 0 };
  assert.equal(filterTags([a, b], all, "home").length, 4);
  // "Pressing": l'originale nostro e lo specchio loro (da Costruzione).
  const prs = filterTags([a, b], { ...all, eventCode: "PRS" }, "home");
  assert.deepEqual(prs.map((r) => [r.tag.side, r.isMirror]), [["away", true], ["home", false]]);
  assert.deepEqual(filterTags([a, b], { ...all, perspective: "opp" }, "home").map((r) => r.tag.eventCode), ["PRS", "COS"]);
  assert.deepEqual(filterTags([a, b], { ...all, minStars: 2 }, "home").map((r) => r.tag.id), [b.original.id]);
});

test("blocco della squadra preferita con messaggio chiaro", () => {
  assert.equal(preferredLockMessage(0), null);
  assert.match(preferredLockMessage(1), /un'azione registrata.*Se le elimini tutte/);
  assert.match(preferredLockMessage(4), /4 azioni registrate/);
});
