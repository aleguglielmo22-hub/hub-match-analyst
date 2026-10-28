// Test dell'elenco paesi e della proposta di passaporto. Esecuzione: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  COUNTRIES,
  TOP_COUNTRIES,
  findCountry,
  formatNationalities,
  parseNationalities,
  searchCountries,
  suggestPassport,
} from "./countries.ts";

test("elenco: più usati in cima, nessun doppione", () => {
  assert.deepEqual(COUNTRIES.slice(0, TOP_COUNTRIES.length), TOP_COUNTRIES);
  assert.equal(new Set(COUNTRIES).size, COUNTRIES.length);
  assert.ok(COUNTRIES.includes("Senegal") && COUNTRIES.includes("Australia"));
});

test("ricerca senza accenti, prima chi inizia con il testo", () => {
  assert.equal(searchCountries("peru")[0], "Perù");
  assert.equal(searchCountries("costa d")[0], "Costa d'Avorio");
  const ser = searchCountries("ser");
  assert.equal(ser[0], "Serbia");
  assert.deepEqual(searchCountries("ital", ["Italia"]), []);
  assert.equal(searchCountries("").length, COUNTRIES.length);
  assert.equal(findCountry("  francia "), "Francia");
  assert.equal(findCountry("Atlantide"), null);
});

test("testo salvato ↔ elenco di nazionalità", () => {
  assert.deepEqual(parseNationalities("Francia/Senegal"), ["Francia", "Senegal"]);
  assert.deepEqual(parseNationalities(" Argentina "), ["Argentina"]);
  assert.deepEqual(parseNationalities(null), []);
  assert.equal(formatNationalities(["Francia", "Senegal"]), "Francia/Senegal");
  assert.equal(formatNationalities([]), null);
});

test("passaporto: comunitario solo con un paese UE", () => {
  assert.equal(suggestPassport(["Francia", "Senegal"]), "COMUNITARIO");
  assert.equal(suggestPassport(["Brasile", "Italia"]), "COMUNITARIO");
  for (const c of ["Regno Unito", "Inghilterra", "Svizzera", "Norvegia", "Islanda", "Liechtenstein", "Argentina"]) {
    assert.equal(suggestPassport([c]), null, c);
  }
  assert.equal(suggestPassport([]), null);
});
