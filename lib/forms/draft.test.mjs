// Test delle bozze dei form. Esecuzione: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clearDraft,
  draftKey,
  itemChangedAfterDraft,
  loadDraft,
  purgeOldDrafts,
  saveDraft,
  DRAFT_MAX_AGE_MS,
} from "./draft.ts";

/** localStorage finto in memoria. */
function memoryStorage() {
  const m = new Map();
  return {
    get length() {
      return m.size;
    },
    key: (i) => [...m.keys()][i] ?? null,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    map: m,
  };
}

/** Storage che rifiuta ogni accesso (es. navigazione privata). */
const brokenStorage = {
  get length() {
    throw new Error("negato");
  },
  key() {
    throw new Error("negato");
  },
  getItem() {
    throw new Error("negato");
  },
  setItem() {
    throw new Error("negato");
  },
  removeItem() {
    throw new Error("negato");
  },
};

test("una bozza per form e per elemento", () => {
  assert.equal(draftKey("set-pieces", null), "agw:draft:set-pieces:nuovo");
  assert.equal(draftKey("cloud", "abc"), "agw:draft:cloud:abc");
});

test("salva e ripristina la bozza con la sua data", () => {
  const s = memoryStorage();
  const key = draftKey("training", null);
  const data = { itemId: "id-1", values: { titolo: "Rondo 4v2", focus_tags: ["press"] } };
  assert.equal(saveDraft(s, key, data, 1_000), true);
  assert.deepEqual(loadDraft(s, key), { savedAt: 1_000, data });
});

test("la bozza cancellata non viene più proposta", () => {
  const s = memoryStorage();
  const key = draftKey("scouting", "p1");
  saveDraft(s, key, { values: { nome: "Mario" } });
  clearDraft(s, key);
  assert.equal(loadDraft(s, key), null);
});

test("bozze illeggibili o di formato diverso vengono ignorate", () => {
  const s = memoryStorage();
  s.setItem("agw:draft:cloud:nuovo", "{non json");
  s.setItem("agw:draft:cloud:x", JSON.stringify({ v: 2, savedAt: 1, data: {} }));
  assert.equal(loadDraft(s, "agw:draft:cloud:nuovo"), null);
  assert.equal(loadDraft(s, "agw:draft:cloud:x"), null);
});

test("se il browser non permette il salvataggio, nessun errore", () => {
  const key = draftKey("cloud", null);
  assert.equal(saveDraft(brokenStorage, key, { a: 1 }), false);
  assert.equal(loadDraft(brokenStorage, key), null);
  assert.doesNotThrow(() => clearDraft(brokenStorage, key));
  assert.equal(purgeOldDrafts(brokenStorage), 0);
  assert.equal(saveDraft(null, key, { a: 1 }), false);
  assert.equal(loadDraft(null, key), null);
});

test("pulizia: elimina solo le bozze più vecchie di 30 giorni", () => {
  const s = memoryStorage();
  const now = 100 * 24 * 60 * 60 * 1000;
  saveDraft(s, draftKey("scouting", "vecchia"), { x: 1 }, now - DRAFT_MAX_AGE_MS - 1);
  saveDraft(s, draftKey("scouting", "recente"), { x: 2 }, now - 1000);
  s.setItem("agw:draft:cloud:rotta", "???");
  s.setItem("tema", "scuro"); // chiave non nostra: non va toccata
  assert.equal(purgeOldDrafts(s, now), 2);
  assert.deepEqual([...s.map.keys()].sort(), ["agw:draft:scouting:recente", "tema"]);
});

test("avvisa se l'elemento è stato modificato dopo la bozza", () => {
  const savedAt = Date.parse("2026-10-20T10:00:00Z");
  assert.equal(itemChangedAfterDraft(savedAt, "2026-10-21T08:00:00+00:00"), true);
  assert.equal(itemChangedAfterDraft(savedAt, "2026-10-19T08:00:00+00:00"), false);
  assert.equal(itemChangedAfterDraft(savedAt, null), false);
});
