// Test del form giocatore a sezioni. Esecuzione: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ageOn,
  firstSectionWithError,
  isFutureDate,
  isPastDate,
  normalizePersonName,
  samePerson,
  sectionCompletion,
  sectionOfField,
  showGoalkeeperTab,
  visibleRatingTabs,
} from "./player-form-sections.ts";

test("scheda Portiere solo con POR principale o secondario", () => {
  assert.equal(showGoalkeeperTab("POR", []), true);
  assert.equal(showGoalkeeperTab("DC", ["POR"]), true);
  assert.equal(showGoalkeeperTab("DC", ["TS"]), false);
  assert.equal(showGoalkeeperTab(null, null), false);
  assert.deepEqual(visibleRatingTabs(false), ["TECNICA", "PSICOLOGIA", "FISICO"]);
  assert.equal(visibleRatingTabs(true).at(-1), "PORTIERE");
});

test("compilazione: valutazioni sulle aree visibili, voti portiere conservati", () => {
  const values = { tec_cross: 7, men_carisma: 5, gk_presa: 8 };
  const hidden = sectionCompletion(values, "valutazioni", false);
  assert.deepEqual(hidden, { filled: 2, total: 36 });
  const shown = sectionCompletion(values, "valutazioni", true);
  assert.deepEqual(shown, { filled: 3, total: 47 });
});

test("compilazione: campi vuoti, liste e influenze", () => {
  assert.deepEqual(
    sectionCompletion({ nome: "Luca", cognome: " ", foto_url: null, nazionalita: "Italia" }, "anagrafica", false),
    { filled: 2, total: 7 },
  );
  assert.deepEqual(
    sectionCompletion({ ruolo_principale: "DC", ruoli_secondari: [], stili_gioco: ["Regista"] }, "posizione", false),
    { filled: 2, total: 3 },
  );
  assert.deepEqual(
    sectionCompletion({ behav_delega_altri: "SI", influenza_neg_arbitro: false }, "comportamento", false),
    { filled: 1, total: 3 },
  );
  assert.deepEqual(
    sectionCompletion({ influenza_neg_arbitro: true }, "comportamento", false),
    { filled: 1, total: 3 },
  );
  assert.deepEqual(sectionCompletion({ valore_mercato_eur: 0 }, "contratto", false), { filled: 1, total: 6 });
});

test("errore → sezione giusta", () => {
  assert.equal(sectionOfField("cognome"), "anagrafica");
  assert.equal(sectionOfField("gk_presa"), "valutazioni");
  assert.equal(sectionOfField("influenza_neg_arbitro"), "comportamento");
  assert.equal(sectionOfField("clip_video_urls"), "stato");
  assert.equal(firstSectionWithError(["scouting_report_url", "data_nascita"]), "anagrafica");
  assert.equal(firstSectionWithError([]), null);
});

test("età e date", () => {
  assert.equal(ageOn("2005-10-28", "2026-10-28"), 21);
  assert.equal(ageOn("2005-10-29", "2026-10-28"), 20);
  assert.equal(ageOn("2005-12-01", "2026-10-28"), 20);
  assert.equal(ageOn("2030-01-01", "2026-10-28"), null);
  assert.equal(ageOn("", "2026-10-28"), null);
  assert.equal(ageOn("28/10/2005", "2026-10-28"), null);
  assert.equal(isFutureDate("2026-10-29", "2026-10-28"), true);
  assert.equal(isFutureDate("2026-10-28", "2026-10-28"), false);
  assert.equal(isPastDate("2026-10-27", "2026-10-28"), true);
  assert.equal(isPastDate(null, "2026-10-28"), false);
});

test("doppioni: maiuscole, accenti e spazi non contano", () => {
  assert.equal(normalizePersonName("  José  María "), "jose maria");
  assert.equal(samePerson({ nome: "Luka", cognome: "Modrić" }, { nome: "luka", cognome: "MODRIC" }), true);
  assert.equal(samePerson({ nome: "Jean-Paul", cognome: "N'Diaye" }, { nome: "Jean Paul", cognome: "N Diaye" }), true);
  assert.equal(samePerson({ nome: "Marco", cognome: "Rossi" }, { nome: "Mario", cognome: "Rossi" }), false);
});
