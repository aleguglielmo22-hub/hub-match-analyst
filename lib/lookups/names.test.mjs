// Test del confronto dei nomi delle anagrafiche. Esecuzione: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { findByName, lookupKey } from "./names.ts";

const teams = [
  { id: "1", label: "Inter" },
  { id: "2", label: "atalanta" },
  { id: "3", label: "Guidonia Montecelio u17" },
];

test("maiuscole e spazi iniziali/finali non contano", () => {
  assert.equal(lookupKey("  INTER "), "inter");
  assert.equal(findByName(teams, " inter ")?.id, "1");
  assert.equal(findByName(teams, "Atalanta")?.id, "2");
});

test("nomi diversi restano diversi", () => {
  assert.equal(findByName(teams, "Inter U19"), undefined);
  assert.equal(findByName(teams, "Guidonia Montecelio"), undefined);
  assert.equal(findByName(teams, "   "), undefined);
});
