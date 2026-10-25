// Test della lista degli account autorizzati. Esecuzione: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { isEmailAllowed, normalizeEmail } from "./allowlist.ts";

test("l'email autorizzata è accettata", () => {
  assert.equal(isEmailAllowed("aleguglielmo22@gmail.com"), true);
});

test("maiuscole/minuscole e spazi non contano", () => {
  assert.equal(isEmailAllowed("AleGuglielmo22@Gmail.COM"), true);
  assert.equal(isEmailAllowed("  aleguglielmo22@gmail.com  "), true);
  assert.equal(isEmailAllowed("aleguglielmo22@gmail.com\n"), true);
  assert.equal(isEmailAllowed(" aleguglielmo22 @gmail.com"), true);
  assert.equal(normalizeEmail(" A@B.it "), "a@b.it");
});

test("altre email o valori vuoti sono rifiutati", () => {
  assert.equal(isEmailAllowed("altro@gmail.com"), false);
  assert.equal(isEmailAllowed("aleguglielmo22@gmail.co"), false);
  assert.equal(isEmailAllowed("aleguglielmo22@gmail.com.evil.it"), false);
  assert.equal(isEmailAllowed("x.aleguglielmo22@gmail.com"), false);
  assert.equal(isEmailAllowed(""), false);
  assert.equal(isEmailAllowed(null), false);
  assert.equal(isEmailAllowed(undefined), false);
});
