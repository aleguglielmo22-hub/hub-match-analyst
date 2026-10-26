// Test della creazione senza doppioni. Esecuzione: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { insertOnce } from "./insert-once.ts";

/** Tabella finta con chiave primaria su id, come in Postgres. */
function fakeTable() {
  const rows = new Map();
  return {
    rows,
    insert: (row) => async () => {
      if (rows.has(row.id)) {
        return { error: { code: "23505", message: "duplicate key value" } };
      }
      rows.set(row.id, row);
      return { error: null };
    },
    exists: (id) => async () => rows.has(id),
  };
}

test("doppio invio con lo stesso id: un solo elemento, entrambi riusciti", async () => {
  const t = fakeTable();
  const row = { id: "11111111-1111-4111-8111-111111111111", titolo: "Angolo 2+3" };
  const first = await insertOnce({ insert: t.insert(row), exists: t.exists(row.id) });
  const second = await insertOnce({ insert: t.insert(row), exists: t.exists(row.id) });
  assert.equal(first, "created");
  assert.equal(second, "existing");
  assert.equal(t.rows.size, 1);
});

test("id diversi creano elementi diversi", async () => {
  const t = fakeTable();
  await insertOnce({ insert: t.insert({ id: "a" }), exists: t.exists("a") });
  await insertOnce({ insert: t.insert({ id: "b" }), exists: t.exists("b") });
  assert.equal(t.rows.size, 2);
});

test("altri errori vengono segnalati", async () => {
  await assert.rejects(
    insertOnce({
      insert: async () => ({ error: { code: "42501", message: "permesso negato" } }),
      exists: async () => true,
    }),
    /permesso negato/,
  );
  // Chiave duplicata ma l'elemento non è visibile nel workspace: errore, non successo.
  await assert.rejects(
    insertOnce({
      insert: async () => ({ error: { code: "23505", message: "duplicate key" } }),
      exists: async () => false,
    }),
    /duplicate key/,
  );
});
