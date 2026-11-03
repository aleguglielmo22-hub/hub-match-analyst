// Controllo del contrasto WCAG AA dei temi di app/globals.css (chiaro :root e
// scuro .dark). Calcola le variabili, comprese le miscele color-mix(in oklab, …),
// e verifica le coppie testo/sfondo (≥ 4,5:1) e gli elementi grafici (≥ 3:1).
// Esce con errore se una coppia non passa. Uso: node scripts/check-contrast.mjs
// (eseguito anche da npm test).
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(ROOT, "app/globals.css"), "utf8");

function block(selector) {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`Blocco ${selector} non trovato`);
  const end = css.indexOf("\n}", start);
  const vars = {};
  for (const m of css.slice(start, end).matchAll(/--([\w-]+):\s*([^;]+);/g)) vars[m[1]] = m[2].trim();
  return vars;
}

/* ---------- colori: hex ↔ sRGB lineare ↔ OKLab ---------- */
const toLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const fromLin = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? [...h].map((x) => x + x).join("") : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
}
function rgbToOklab([r, g, b]) {
  [r, g, b] = [r, g, b].map(toLin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
function oklabToRgb([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((c) => Math.min(1, Math.max(0, fromLin(c))));
}
const rgbToHex = (rgb) => "#" + rgb.map((c) => Math.round(c * 255).toString(16).padStart(2, "0")).join("");

/** Valore di una variabile nel tema (lo scuro eredita dal chiaro). */
function resolver(vars) {
  const cache = {};
  const resolve = (expr) => {
    expr = expr.trim();
    if (/^#[0-9a-f]{3,6}$/i.test(expr)) return hexToRgb(expr);
    const v = expr.match(/^var\(--([\w-]+)\)$/);
    if (v) return get(v[1]);
    const mix = expr.match(/^color-mix\(in oklab,\s*(.+?)\s+([\w%()\-.\s]+?),\s*(.+)\)$/);
    if (mix) {
      const pctExpr = mix[2].trim();
      const pct = parseFloat(pctExpr.startsWith("var(") ? vars[pctExpr.slice(6, -1)] : pctExpr) / 100;
      const [a, b] = [rgbToOklab(resolve(mix[1])), rgbToOklab(resolve(mix[3]))];
      return oklabToRgb(a.map((x, i) => x * pct + b[i] * (1 - pct)));
    }
    throw new Error(`Valore non gestito: ${expr}`);
  };
  const get = (name) => {
    if (!(name in cache)) {
      if (!(name in vars)) throw new Error(`Variabile --${name} mancante`);
      cache[name] = resolve(vars[name].replace(/\/\*.*\*\//, ""));
    }
    return cache[name];
  };
  return get;
}

const lum = (rgb) => {
  const [r, g, b] = rgb.map(toLin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/* ---------- coppie da verificare ---------- */
const TONES = [
  "success", "danger", "neutral", "info", "warning",
  "possesso", "transizione-offensiva", "non-possesso", "transizione-difensiva",
  ...Array.from({ length: 10 }, (_, i) => `voto-${i + 1}`),
];
const TEXT = [
  ["foreground", "background"], ["foreground", "card"], ["foreground", "muted"], ["foreground", "primary-soft"],
  ["muted-foreground", "background"], ["muted-foreground", "card"], ["muted-foreground", "muted"],
  ["primary-foreground", "primary"],
  ["primary-text", "background"], ["primary-text", "card"], ["primary-text", "primary-soft"],
  ["destructive", "background"], ["destructive", "card"],
  ["sidebar-foreground", "sidebar"], ["sidebar-foreground", "sidebar-accent"],
  ["sidebar-primary", "sidebar"], ["sidebar-primary", "sidebar-accent"],
  ["sidebar-primary-foreground", "sidebar-primary"],
  ["overlay-foreground", "overlay"],
  ...TONES.flatMap((t) => [
    [`tone-${t}-fg`, `tone-${t}-soft`],
    [`tone-${t}-fg`, "card"],
    [`tone-${t}-fg`, "background"],
  ]),
  // Numero del voto sul colore della scala.
  ...Array.from({ length: 10 }, (_, i) => ["voto-ink", `voto-${i + 1}`]),
];
const GRAPHIC = [
  ["ring", "background"], ["ring", "card"],
  ["sidebar-primary", "sidebar"],
  // Punti e barre a colore pieno su card e sfondo (la scala voti è sempre accompagnata dal numero).
  ...["success", "danger", "neutral", "info", "possesso", "transizione-offensiva", "non-possesso", "transizione-difensiva"]
    .flatMap((t) => [[`tone-${t}`, "card"], [`tone-${t}`, "background"]]),
];

const light = block(":root");
const dark = { ...light, ...block(".dark") };
let failures = 0;
for (const [name, vars] of [["chiaro (Carta)", light], ["scuro (Grafite)", dark]]) {
  const get = resolver(vars);
  const rows = [];
  for (const [list, min] of [[TEXT, 4.5], [GRAPHIC, 3]]) {
    for (const [fg, bg] of list) {
      const r = ratio(get(fg), get(bg));
      if (r < min) {
        failures++;
        rows.push(`  ✗ ${fg} ${rgbToHex(get(fg))} su ${bg} ${rgbToHex(get(bg))}: ${r.toFixed(2)} (min ${min})`);
      }
    }
  }
  console.log(`Tema ${name}: ${TEXT.length + GRAPHIC.length} coppie, ${rows.length} sotto la soglia`);
  rows.forEach((r) => console.log(r));
}
if (failures) process.exit(1);
