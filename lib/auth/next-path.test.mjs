// Test del ritorno dopo il login (solo percorsi interni). Esecuzione: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_AFTER_LOGIN, safeNextPath } from "./next-path.ts";

test("percorsi interni conservati, con filtri", () => {
  assert.equal(safeNextPath("/scouting/abc"), "/scouting/abc");
  assert.equal(safeNextPath("/archivio?q=roma&tipo=video"), "/archivio?q=roma&tipo=video");
  assert.equal(safeNextPath("/set-pieces/1/modifica#note"), "/set-pieces/1/modifica#note");
  assert.equal(safeNextPath("/dashboard"), "/dashboard");
});

test("indirizzi esterni o ambigui rifiutati", () => {
  for (const bad of [
    "//evil.com",
    "//evil.com/archivio",
    "/\\evil.com",
    "\\\\evil.com",
    "https://evil.com",
    "javascript:alert(1)",
    "evil.com",
    "/\t/evil.com",
    "/\n/evil.com",
    " /archivio",
    "",
    null,
    undefined,
  ]) {
    assert.equal(safeNextPath(bad), DEFAULT_AFTER_LOGIN, String(bad));
  }
});

test("niente ritorno al login", () => {
  assert.equal(safeNextPath("/login"), DEFAULT_AFTER_LOGIN);
  assert.equal(safeNextPath("/login?next=/archivio"), DEFAULT_AFTER_LOGIN);
});
