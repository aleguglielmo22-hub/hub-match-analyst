// Ogni tabella creata nelle migrazioni deve finire nel backup. Esecuzione: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { BACKUP_TABLES } from "./tables.ts";

const MIGRATIONS = join(import.meta.dirname, "../../supabase/migrations");

function tablesInMigrations() {
  const names = new Set();
  for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql"))) {
    const sql = readFileSync(join(MIGRATIONS, file), "utf8").replace(/--.*$/gm, "");
    for (const m of sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?([a-z_][a-z0-9_]*)"?/gi)) {
      names.add(m[1].toLowerCase());
    }
  }
  return names;
}

test("tutte le tabelle delle migrazioni sono nel backup", () => {
  const inBackup = new Set(BACKUP_TABLES.map((t) => t.name));
  const missing = [...tablesInMigrations()].filter((t) => !inBackup.has(t)).sort();
  assert.deepEqual(missing, [], `Tabelle mancanti nel backup: ${missing.join(", ")}`);
});

test("nessuna tabella è elencata due volte", () => {
  const names = BACKUP_TABLES.map((t) => t.name);
  assert.equal(new Set(names).size, names.length);
});
