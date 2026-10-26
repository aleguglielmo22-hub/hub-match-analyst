// Test dei ruoli dei giocatori nei piazzati. Esecuzione: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { dedupePlayerLinks, defaultRoleForPhase, rolesForPhase, SET_PIECE_ROLES } from "./player-roles.ts";

test("ruoli proposti per fase, sempre con Altro", () => {
  assert.deepEqual(rolesForPhase("OFFENSIVO"), ["BATTITORE", "BERSAGLIO", "BLOCCO", "SECONDO_PALO", "FINALIZZATORE", "ALTRO"]);
  assert.deepEqual(rolesForPhase("DIFENSIVO"), ["MARCATORE", "ZONA", "PALO", "BARRIERA", "UOMO_RIPARTENZA", "ALTRO"]);
  assert.equal(SET_PIECE_ROLES.length, 11);
});

test("ruolo predefinito coerente con la fase", () => {
  assert.ok(rolesForPhase("OFFENSIVO").includes(defaultRoleForPhase("OFFENSIVO")));
  assert.ok(rolesForPhase("DIFENSIVO").includes(defaultRoleForPhase("DIFENSIVO")));
});

test("stesso giocatore: più ruoli sì, stesso ruolo due volte no", () => {
  const out = dedupePlayerLinks([
    { player_id: "a", ruolo: "BATTITORE" },
    { player_id: "a", ruolo: "FINALIZZATORE" },
    { player_id: "a", ruolo: "BATTITORE" },
    { player_id: "b", ruolo: "BATTITORE" },
  ]);
  assert.equal(out.length, 3);
});
