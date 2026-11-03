// La palette di AG Tag coincide con quella di AG Workspace (app/globals.css).
// Esecuzione: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const tag = readFileSync(join(ROOT, "src/renderer/src/theme.css"), "utf8");
const web = readFileSync(join(ROOT, "../../app/globals.css"), "utf8");

function vars(css, selector) {
  const start = css.indexOf(`${selector} {`);
  const end = css.indexOf("\n}", start);
  const out = {};
  for (const m of css.slice(start, end).matchAll(/--([\w-]+):\s*([^;]+);/g)) out[m[1]] = m[2].replace(/\/\*.*?\*\//g, "").trim();
  return out;
}

for (const selector of [":root", ".dark"]) {
  test(`stessi colori di AG Workspace (${selector})`, () => {
    const a = vars(tag, selector);
    const b = vars(web, selector);
    for (const [name, value] of Object.entries(a)) {
      if (name === "stage") continue; // solo AG Tag
      assert.equal(value, b[name], `--${name}`);
    }
  });
}
