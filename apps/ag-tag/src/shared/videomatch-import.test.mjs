// Test dell'importazione del pannello (file di prova inventati). Esecuzione: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { ImportError, OPP_PREFIX, keyCodeToCombo, parseLiveTagJson, parseVideoMatchXml, previewFromFiles } from "./videomatch-import.ts";

const XML = `<VideoMatch versione="1.5">
  <EVENTS>
    <EVENT desc="Attacco\\nRapido" cod="ATT" sh="81" associato="DIF" anticipo="0.0" backgroundColor="255x0x128x0">
      <TAGS>
        <TAG desc="Lungo" cod="ATT-0" associato="" group="1" />
        <TAG desc="Corto" cod="ATT-1" associato="" group="1" />
        <TAG desc="Sponda &amp; tiro" cod="ATT-2" associato="" group="2" />
        <TAG desc="Cross" cod="ATT-3" associato="" group="2" />
      </TAGS>
    </EVENT>
    <EVENT desc="Difesa" cod="DIF" sh="65" associato="ATT" anticipo="3.0" backgroundColor="255x255x0x0">
      <TAGS>
        <TAG desc="Uomo" cod="DIF-0" associato="" group="1" />
      </TAGS>
    </EVENT>
    <EVENT desc="Ripartenza nostra" cod="RIP" sh="89" associato="RIA" anticipo="5.0" backgroundColor="255x0x0x255">
      <TAGS></TAGS>
    </EVENT>
    <EVENT desc="Ripartenza loro" cod="RIA" sh="74" associato="RIP" anticipo="5.0" backgroundColor="255x0x0x255">
      <TAGS></TAGS>
    </EVENT>
    <EVENT desc="Palle inattive A favore" cod="PAF" sh="90" associato="PAC" anticipo="0.0" backgroundColor="255x255x204x0">
      <TAGS></TAGS>
    </EVENT>
    <EVENT desc="Palle inattive Contro" cod="PAC" sh="85" associato="PAF" anticipo="0.0" backgroundColor="255x255x204x0">
      <TAGS></TAGS>
    </EVENT>
    <EVENT desc="Singoli" cod="SIN" sh="75" associato="" anticipo="0.0" backgroundColor="255x128x0x160">
      <TAGS>
        <TAG desc="Tecnica" cod="SIN-0" associato="" group="1" />
        <TAG desc="Duello" cod="SIN-1" associato="" group="1" />
      </TAGS>
    </EVENT>
  </EVENTS>
</VideoMatch>`;

const tagDep = (name, description, before = 0, after = 0, color = "0.5 0.5 0.5") => ({
  type: "tag",
  data: { name, description, time_before: before, time_after: after, color },
});
const LIVETAG = JSON.stringify({
  software: { name: "LiveTagPro" },
  dependencies: [
    tagDep("Attacco Rapido", "Lunghezza: Lungo, Corto | Meccanismo: Sponda & tiro, Cross", 0, 0, "0 0.5 0"),
    tagDep("Difesa", "Riferimento: Uomo", 3, 0, "1 0 0"),
    tagDep("Singoli", "Aspetto: Tecnica, Duello", 5, 10),
    tagDep("Solo in LiveTag", "Gruppo: a"),
    { type: "shortcut", data: { shortcut: "p" } },
  ],
});

const preview = (lt = LIVETAG) => previewFromFiles({ name: "prova.xml", text: XML }, lt ? { name: "prova.json", text: lt } : null);
const ev = (p, code) => p.panel.events.find((e) => e.code === code);

test("lettura dell'XML: eventi, nomi, specchi, lettere, anticipo", () => {
  const vm = parseVideoMatchXml(XML);
  assert.equal(vm.length, 7);
  assert.deepEqual(vm.map((e) => e.code), ["ATT", "DIF", "RIP", "RIA", "PAF", "PAC", "SIN"]);
  assert.equal(vm[0].name, "Attacco Rapido");
  assert.equal(vm[0].mirror, "DIF");
  assert.equal(vm[6].mirror, null);
  assert.equal(vm[1].leadMs, 3000);
  assert.equal(vm[0].color, "#008000");
  assert.equal(vm[0].tags[2].name, "Sponda & tiro");
});

test("lettere: codici tasto di VideoMatch", () => {
  assert.equal(keyCodeToCombo(81), "KeyQ");
  assert.equal(keyCodeToCombo(49), "Digit1");
  assert.equal(keyCodeToCombo(112), null);
  assert.equal(keyCodeToCombo(null), null);
});

test("lettura del JSON di LiveTag: gruppi dalla descrizione, anticipo e coda", () => {
  const lt = parseLiveTagJson(LIVETAG);
  assert.equal(lt.length, 4);
  const singoli = lt.find((l) => l.name === "Singoli");
  assert.deepEqual([singoli.leadMs, singoli.lagMs], [5000, 10000]);
  assert.deepEqual(lt[0].groups, [
    { name: "Lunghezza", items: ["Lungo", "Corto"] },
    { name: "Meccanismo", items: ["Sponda & tiro", "Cross"] },
  ]);
});

test("anteprima: gruppi con nomi, selezione, set per lato", () => {
  const p = preview();
  const att = ev(p, "ATT");
  assert.deepEqual(att.groups.own.map((g) => [g.code, g.name, g.selection]), [
    ["ATT-G1", "Lunghezza", "single"],
    ["ATT-G2", "Meccanismo", "multi"],
  ]);
  // Il set avversario parte identico, con codici distinti.
  assert.deepEqual(att.groups.opp.map((g) => g.name), ["Lunghezza", "Meccanismo"]);
  assert.equal(att.groups.opp[0].labels[0].code, `${OPP_PREFIX}ATT-0`);
  assert.equal(att.groups.opp[0].labels[0].name, "Lungo");
});

test("anteprima: anticipo e coda da LiveTag, altrimenti da VideoMatch", () => {
  const p = preview();
  assert.deepEqual([ev(p, "SIN").leadMs, ev(p, "SIN").lagMs], [5000, 10000]);
  assert.deepEqual([ev(p, "DIF").leadMs, ev(p, "DIF").lagMs], [3000, 0]);
  assert.deepEqual([ev(p, "RIP").leadMs, ev(p, "RIP").lagMs], [5000, 0]);
  assert.deepEqual([ev(p, "ATT").leadMs, ev(p, "ATT").lagMs], [0, 0]);
  assert.ok(p.warnings.some((w) => w.startsWith("Singoli: anticipo 5 s da LiveTag")));
  assert.ok(p.warnings.some((w) => w.includes("Solo in LiveTag")));
  // Senza LiveTag: nomi generici, anticipo di VideoMatch, nessuna coda.
  const solo = preview(null);
  assert.deepEqual([ev(solo, "SIN").leadMs, ev(solo, "SIN").lagMs], [0, 0]);
  assert.equal(ev(solo, "ATT").groups.own[0].name, "Gruppo 1");
});

test("anteprima: famiglie e lettere", () => {
  const p = preview();
  assert.deepEqual(p.panel.events.map((e) => e.family), [
    "possesso", "non_possesso", "transizione", "transizione", "palle_inattive", "palle_inattive", "individuali",
  ]);
  assert.equal(p.keys.ATT, "KeyQ");
  assert.equal(p.keys.SIN, "KeyK");
  assert.equal(ev(p, "SIN").mirrorCode, null);
  assert.equal(ev(p, "ATT").color, "#008000");
});

test("file non validi rifiutati", () => {
  assert.throws(() => parseVideoMatchXml("<altro/>"), ImportError);
  assert.throws(() => parseVideoMatchXml("<VideoMatch></VideoMatch>"), /Nessun evento/);
  assert.throws(() => parseLiveTagJson("{"), ImportError);
  assert.throws(() => parseLiveTagJson("{}"), /non è un pannello LiveTag/);
  const bad = (from, to) => previewFromFiles({ name: "x.xml", text: XML.replace(from, to) }, null);
  assert.throws(() => bad('cod="DIF" sh="65" associato="ATT"', 'cod="DIF" sh="65" associato="SIN"'), /Specchi incoerenti/);
  assert.throws(() => bad('associato="DIF"', 'associato="ZZZ"'), /non esiste/);
  assert.throws(() => bad('cod="DIF-0"', 'cod="ATT-0"'), /ripetuto/);
  assert.throws(() => bad('cod="RIA"', 'cod="RIP"'), /ripetuto/);
});

test("gruppi di LiveTag diversi da VideoMatch: avviso e nomi generici", () => {
  const lt = JSON.stringify({ dependencies: [tagDep("Attacco Rapido", "Lunghezza: Lungo | Meccanismo: Cross")] });
  const p = preview(lt);
  assert.equal(ev(p, "ATT").groups.own[0].name, "Gruppo 1");
  assert.ok(p.warnings.some((w) => w.includes("non coincidono")));
});
