// Test dell'etichetta dell'esito secondo la fase. Esecuzione: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { esitoLabel, ESITO_FINALE_LABEL } from "./set-pieces.ts";

test("nei piazzati difensivi la transizione subìta è una ripartenza nostra", () => {
  assert.equal(esitoLabel("TRANSIZIONE_SUBITA", "DIFENSIVO"), "Ripartenza nostra");
  assert.equal(esitoLabel("TRANSIZIONE_SUBITA", "OFFENSIVO"), "Transizione subìta");
  assert.equal(
    esitoLabel("TRANSIZIONE_SUBITA", null),
    "Transizione subìta / Ripartenza nostra",
  );
});

test("gli altri esiti hanno la stessa etichetta in entrambe le fasi", () => {
  for (const [esito, label] of Object.entries(ESITO_FINALE_LABEL)) {
    if (esito === "TRANSIZIONE_SUBITA") continue;
    assert.equal(esitoLabel(esito, "DIFENSIVO"), label);
    assert.equal(esitoLabel(esito, "OFFENSIVO"), label);
    assert.equal(esitoLabel(esito, null), label);
  }
});
