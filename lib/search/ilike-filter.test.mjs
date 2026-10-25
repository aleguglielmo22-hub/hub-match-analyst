// Test del filtro di ricerca sicuro. Esecuzione: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { ilikeAnyFilter } from "./ilike-filter.ts";

const one = (q) => ilikeAnyFilter(["nome"], q);

test("testo semplice racchiuso tra virgolette con i jolly", () => {
  assert.equal(one("Rossi"), 'nome.ilike."%Rossi%"');
});

test("virgole, parentesi, punti, due punti e apostrofi restano dentro le virgolette", () => {
  assert.equal(one("Rossi, Mario"), 'nome.ilike."%Rossi, Mario%"');
  assert.equal(one("Inter (U19)"), 'nome.ilike."%Inter (U19)%"');
  assert.equal(one("D'Ambrosio"), `nome.ilike."%D'Ambrosio%"`);
  assert.equal(one("A.C. Milan: 2-1"), 'nome.ilike."%A.C. Milan: 2-1%"');
});

test("virgolette e backslash vengono protetti", () => {
  assert.equal(one('il "Mago"'), 'nome.ilike."%il \\"Mago\\"%"');
  // \ → \\ per LIKE, poi ogni \ raddoppiato per PostgREST
  assert.equal(one("a\\b"), 'nome.ilike."%a\\\\\\\\b%"');
});

test("% e _ cercati come caratteri, non come jolly", () => {
  assert.equal(one("50%"), 'nome.ilike."%50\\\\%%"');
  assert.equal(one("U_19"), 'nome.ilike."%U\\\\_19%"');
});

test("più colonne separate da virgola", () => {
  assert.equal(
    ilikeAnyFilter(["titolo", "squadra"], "Inter (U19)"),
    'titolo.ilike."%Inter (U19)%",squadra.ilike."%Inter (U19)%"',
  );
});
