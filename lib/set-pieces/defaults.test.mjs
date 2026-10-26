// Test delle squadre predefinite per fase. Esecuzione: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { teamsForPhase } from "./defaults.ts";

const MY = "mia";
const none = { esecutrice: false, avversaria: false };

test("offensivo: esecutrice = mia squadra; difensivo: avversaria = mia squadra", () => {
  const empty = { esecutrice: null, avversaria: null };
  assert.deepEqual(teamsForPhase("OFFENSIVO", MY, empty, none), { esecutrice: MY, avversaria: null });
  assert.deepEqual(teamsForPhase("DIFENSIVO", MY, empty, none), { esecutrice: null, avversaria: MY });
});

test("cambio fase: si spostano solo i campi non toccati", () => {
  // Offensivo con avversaria scelta a mano, poi passo a difensivo.
  const cur = { esecutrice: MY, avversaria: "roma" };
  assert.deepEqual(
    teamsForPhase("DIFENSIVO", MY, cur, { esecutrice: false, avversaria: true }),
    { esecutrice: null, avversaria: "roma" },
  );
  // Esecutrice scelta a mano: resta anche cambiando fase.
  assert.deepEqual(
    teamsForPhase("DIFENSIVO", MY, { esecutrice: "lazio", avversaria: null }, { esecutrice: true, avversaria: false }),
    { esecutrice: "lazio", avversaria: MY },
  );
});

test("mai la stessa squadra due volte", () => {
  assert.deepEqual(
    teamsForPhase("DIFENSIVO", MY, { esecutrice: MY, avversaria: null }, { esecutrice: true, avversaria: false }),
    { esecutrice: MY, avversaria: null },
  );
});

test("senza mia squadra nelle preferenze non cambia nulla", () => {
  const cur = { esecutrice: "a", avversaria: "b" };
  assert.deepEqual(teamsForPhase("DIFENSIVO", null, cur, none), cur);
});
