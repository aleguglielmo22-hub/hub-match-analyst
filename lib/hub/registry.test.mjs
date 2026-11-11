// Il registro delle sezioni personali deve corrispondere alle migrazioni.
// Esecuzione: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { COLLECTIONS, COLLECTION_KEYS, ROUTED_COLLECTIONS, collectionBySlug } from "./registry.ts";
import { BACKUP_TABLES } from "../backup/tables.ts";

const MIGRATIONS = join(import.meta.dirname, "../../supabase/migrations");
const sql = readdirSync(MIGRATIONS)
  .filter((f) => f.endsWith(".sql"))
  .map((f) => readFileSync(join(MIGRATIONS, f), "utf8").replace(/--.*$/gm, ""))
  .join("\n");

/** Colonne di una tabella creata nelle migrazioni (prima parola di ogni riga). */
function columnsOf(table) {
  const m = sql.match(new RegExp(`CREATE TABLE ${table} \\(([\\s\\S]*?)\\n\\);`, "i"));
  assert.ok(m, `tabella ${table} non trovata nelle migrazioni`);
  return new Set(
    m[1]
      .split("\n")
      .map((l) => l.trim().split(/\s+/)[0])
      .filter((w) => /^[a-z_][a-z0-9_]*$/.test(w ?? "")),
  );
}

test("ogni campo del registro è una colonna della sua tabella", () => {
  for (const key of COLLECTION_KEYS) {
    const c = COLLECTIONS[key];
    const cols = columnsOf(c.table);
    for (const f of c.fields) assert.ok(cols.has(f.key), `${c.table}.${f.key} manca nella migrazione`);
    for (const s of c.sort) assert.ok(cols.has(s.field), `${c.table}: ordinamento su ${s.field} inesistente`);
    assert.equal(cols.has("deleted_at"), c.trash, `${c.table}: "trash" non corrisponde a deleted_at`);
    if (c.reviewable) assert.ok(cols.has("completato_il") && cols.has("ripassi"), `${c.table}: mancano i campi del ripasso`);
  }
});

test("sezioni figlie, riferimenti, filtri e titoli puntano a cose esistenti", () => {
  for (const key of COLLECTION_KEYS) {
    const c = COLLECTIONS[key];
    const fieldKeys = new Set(c.fields.map((f) => f.key));
    assert.ok(fieldKeys.has(c.titleField), `${key}: titolo inesistente`);
    for (const k of c.filters ?? []) assert.ok(fieldKeys.has(k), `${key}: filtro ${k} inesistente`);
    for (const k of c.subtitleFields ?? []) assert.ok(fieldKeys.has(k), `${key}: sottotitolo ${k} inesistente`);
    for (const f of c.fields) if (f.type === "ref") assert.ok(COLLECTIONS[f.ref], `${key}.${f.key}: ref ${f.ref} inesistente`);
    for (const ch of c.children ?? []) {
      assert.ok(COLLECTIONS[ch.collection], `${key}: figlia ${ch.collection} inesistente`);
      assert.ok(columnsOf(COLLECTIONS[ch.collection].table).has(ch.parentField), `${key}: ${ch.parentField} non esiste`);
    }
  }
});

test("ogni tabella delle sezioni personali è nel backup", () => {
  const inBackup = new Set(BACKUP_TABLES.map((t) => t.name));
  for (const key of COLLECTION_KEYS) assert.ok(inBackup.has(COLLECTIONS[key].table), `${COLLECTIONS[key].table} manca nel backup`);
});

test("ogni tabella personale ha le regole di accesso solo-proprietario", () => {
  for (const key of COLLECTION_KEYS) {
    const t = COLLECTIONS[key].table;
    assert.match(sql, new RegExp(`'${t}'`), `${t} non è nell'elenco delle regole di accesso`);
  }
});

test("indirizzi unici per area e nessun conflitto con le pagine speciali", () => {
  const reserved = new Set(["ripasso", "riepilogo", "settimana", "alimentazione"]);
  const seen = new Set();
  for (const c of ROUTED_COLLECTIONS) {
    const k = `${c.area}/${c.slug}`;
    assert.ok(!seen.has(k), `indirizzo doppio: ${k}`);
    assert.ok(!reserved.has(c.slug), `${k} si scontra con una pagina speciale`);
    seen.add(k);
    assert.equal(collectionBySlug(c.area, c.slug)?.key, c.key);
  }
});
