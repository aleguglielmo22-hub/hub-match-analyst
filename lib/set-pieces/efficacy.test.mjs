// Test dell'efficacia dei piazzati per fase. Esecuzione: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeSetPiecesEfficacy } from "./efficacy.ts";
import { ESITO_TONE } from "../tones.ts";

const row = (fase, tipo_piazzato, esito_finale) => ({
  fase,
  tipo_piazzato,
  esito_finale,
});

const rows = [
  // Offensivi: 2 positivi (gol, tiro in porta) su 4 con esito, 1 senza esito
  row("OFFENSIVO", "ANGOLO", "GOL"),
  row("OFFENSIVO", "ANGOLO", "TIRO_FUORI"),
  row("OFFENSIVO", "PUNIZIONE", "TIRO_IN_PORTA"),
  row("OFFENSIVO", "PUNIZIONE", "FUORIGIOCO"),
  row("OFFENSIVO", "RIGORE", null),
  // Difensivi: 2 gol subiti e 1 fallo commesso (negativi) su 5
  row("DIFENSIVO", "ANGOLO", "GOL"),
  row("DIFENSIVO", "ANGOLO", "LIBERATO_DIFESA"),
  row("DIFENSIVO", "ANGOLO", "TIRO_FUORI"),
  row("DIFENSIVO", "RIMESSA_LATERALE", "GOL"),
  row("DIFENSIVO", "RIMESSA_LATERALE", "FALLO_COMMESSO"),
];

test("attacco: esiti positivi e gol fatti solo sui piazzati offensivi", () => {
  const off = computeSetPiecesEfficacy(rows, ESITO_TONE).OFFENSIVO;
  assert.equal(off.total, 5);
  assert.equal(off.tracked, 4);
  assert.equal(off.riusciti, 2);
  assert.equal(off.riuscitiPct, 50);
  assert.equal(off.gol, 1);
  assert.equal(off.golPct, 25);
  // Il rigore senza esito non compare nella ripartizione
  assert.deepEqual(
    off.perTipo.map((t) => [t.tipo, t.riusciti, t.tracked, t.gol]),
    [
      ["ANGOLO", 1, 2, 1],
      ["PUNIZIONE", 1, 2, 0],
    ],
  );
});

test("difesa: i gol subiti abbassano la tenuta, non alzano l'efficacia", () => {
  const dif = computeSetPiecesEfficacy(rows, ESITO_TONE).DIFENSIVO;
  assert.equal(dif.tracked, 5);
  assert.equal(dif.riusciti, 2); // liberato + tiro fuori
  assert.equal(dif.riuscitiPct, 40);
  assert.equal(dif.gol, 2);
  assert.equal(dif.golPct, 40);
  assert.deepEqual(
    dif.perTipo.map((t) => [t.tipo, t.riuscitiPct, t.golPct]),
    [
      ["ANGOLO", 67, 33],
      ["RIMESSA_LATERALE", 0, 50],
    ],
  );
});

test("fase vuota o senza esiti: nessuna percentuale (mai 0% o NaN)", () => {
  const onlyOff = computeSetPiecesEfficacy(rows.slice(0, 5), ESITO_TONE);
  assert.equal(onlyOff.DIFENSIVO.total, 0);
  assert.equal(onlyOff.DIFENSIVO.riuscitiPct, null);
  assert.equal(onlyOff.DIFENSIVO.golPct, null);
  assert.deepEqual(onlyOff.DIFENSIVO.perTipo, []);

  const noEsito = computeSetPiecesEfficacy(
    [row("DIFENSIVO", "ANGOLO", null)],
    ESITO_TONE,
  ).DIFENSIVO;
  assert.equal(noEsito.total, 1);
  assert.equal(noEsito.tracked, 0);
  assert.equal(noEsito.riuscitiPct, null);
});
