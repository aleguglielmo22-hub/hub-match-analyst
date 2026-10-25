// Genera favicon e icone PWA di AG Workspace dalla geometria del logo
// (components/brand/logo-geometry.ts). Nessuna dipendenza: il PNG viene
// disegnato calcolando, per ogni pixel, la distanza da linee, archi e cerchi.
//
// Uso: node scripts/generate-icons.mjs   (Node 22.18+ / 24, legge il .ts direttamente)
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BRAND_COLORS,
  LOGO,
  LOGO_SMALL,
  LOGO_TINY,
  aPath,
  gArcPoints,
  gPath,
} from "../components/brand/logo-geometry.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const NAVY = hex(BRAND_COLORS.navy);
const WHITE = hex(BRAND_COLORS.white);
const BLUE = hex(BRAND_COLORS.blue);
const LIGHT_BLUE = hex(BRAND_COLORS.lightBlue);

/* ---------- geometria: distanze ---------- */
function segDist([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
function gArcDist(p) {
  const { cx, cy, r, startDeg, endDeg } = LOGO.g;
  const deg = (Math.atan2(p[1] - cy, p[0] - cx) * 180) / Math.PI;
  // L'arco copre tutto il giro tranne lo spicchio aperto a destra (start → end).
  if (!(deg > startDeg && deg < endDeg)) return Math.abs(Math.hypot(p[0] - cx, p[1] - cy) - r);
  const { start, end } = gArcPoints();
  return Math.min(Math.hypot(p[0] - start[0], p[1] - start[1]), Math.hypot(p[0] - end[0], p[1] - end[1]));
}
function inRoundedTile([x, y]) {
  const { size, radius } = LOGO.tile;
  if (x < 0 || y < 0 || x > size || y > size) return false;
  const cx = Math.min(Math.max(x, radius), size - radius);
  const cy = Math.min(Math.max(y, radius), size - radius);
  return Math.hypot(x - cx, y - cy) <= radius;
}

/** Colore (o null = trasparente) del punto p, in coordinate logo 0..100. */
function colorAt(tileP, glyphP, { small, tiny, tile }) {
  const inTile = tile === "square" ? true : inRoundedTile(tileP);
  if (!inTile) return null;
  const variant = tiny ? LOGO_TINY : small ? LOGO_SMALL : LOGO;
  const stroke = variant.stroke;
  const nodeR = variant.nodeRadius;
  const { apex, left, right } = LOGO.a;
  const { end } = gArcPoints();
  const { barTopY, barEndX } = LOGO.g;
  const half = stroke / 2;
  for (const n of [apex, left, right]) {
    if (Math.hypot(glyphP[0] - n[0], glyphP[1] - n[1]) <= nodeR) return BLUE;
  }
  if (Math.min(segDist(glyphP, left, apex), segDist(glyphP, apex, right)) <= half) return WHITE;
  const gDist = Math.min(
    gArcDist(glyphP),
    segDist(glyphP, end, [end[0], barTopY]),
    segDist(glyphP, [end[0], barTopY], [barEndX, barTopY]),
  );
  if (gDist <= half) return WHITE;
  if (!small) {
    for (const x of LOGO.lane.dots) {
      if (Math.hypot(glyphP[0] - x, glyphP[1] - LOGO.lane.y) <= LOGO.lane.radius) return LIGHT_BLUE;
    }
  }
  return NAVY;
}

/* ---------- PNG ---------- */
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

/**
 * @param size lato in pixel
 * @param opts.tile "rounded" (angoli trasparenti) | "square" (sfondo pieno, per maskable/iPhone)
 * @param opts.scale riduzione del simbolo attorno al centro (margine di sicurezza)
 * @param opts.small versione semplificata per le dimensioni piccole
 * @param opts.tiny versione minima (16 px): solo "AG"
 */
function renderPng(size, { tile = "rounded", scale = 1, small = false, tiny = false } = {}) {
  const SS = 4; // campioni per lato (antialiasing)
  const row = size * 4 + 1;
  const raw = Buffer.alloc(size * row);
  for (let y = 0; y < size; y++) {
    raw[y * row] = 0;
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = ((x + (sx + 0.5) / SS) / size) * 100;
          const v = ((y + (sy + 0.5) / SS) / size) * 100;
          const glyph = [50 + (u - 50) / scale, 50 + (v - 50) / scale];
          const c = colorAt([u, v], glyph, { small: small || tiny, tiny, tile });
          if (c) { r += c[0]; g += c[1]; b += c[2]; a += 1; }
        }
      }
      const o = y * row + 1 + x * 4;
      if (a > 0) { raw[o] = Math.round(r / a); raw[o + 1] = Math.round(g / a); raw[o + 2] = Math.round(b / a); }
      raw[o + 3] = Math.round((a / (SS * SS)) * 255);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** File .ico con immagini PNG incorporate (supportato da tutti i browser moderni). */
function renderIco(sizes) {
  const pngs = sizes.map((s) =>
    s <= 16 ? renderPng(s, { tiny: true, scale: 1.08 }) : renderPng(s, { small: true }),
  );
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = 6 + 16 * pngs.length;
  const entries = pngs.map((png, i) => {
    const e = Buffer.alloc(16);
    e[0] = sizes[i] >= 256 ? 0 : sizes[i];
    e[1] = sizes[i] >= 256 ? 0 : sizes[i];
    e.writeUInt16LE(1, 4); // planes
    e.writeUInt16LE(32, 6); // bpp
    e.writeUInt32LE(png.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += png.length;
    return e;
  });
  return Buffer.concat([header, ...entries, ...pngs]);
}

/** SVG semplificato per la favicon vettoriale (app/icon.svg). */
function renderSmallSvg() {
  const { apex, left, right } = LOGO.a;
  const { size, radius } = LOGO.tile;
  const nodes = [apex, left, right]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${LOGO_SMALL.nodeRadius}" fill="${BRAND_COLORS.blue}"/>`)
    .join("");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">` +
    `<rect width="${size}" height="${size}" rx="${radius}" fill="${BRAND_COLORS.navy}"/>` +
    `<g fill="none" stroke="${BRAND_COLORS.white}" stroke-width="${LOGO_SMALL.stroke}" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="${aPath()}"/><path d="${gPath()}"/></g>${nodes}</svg>\n`
  );
}

const out = (rel, data) => {
  const p = join(ROOT, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, data);
  console.log(`  ${rel} (${data.length} B)`);
};

console.log("Icone AG Workspace:");
out("public/icons/icon-192.png", renderPng(192));
out("public/icons/icon-512.png", renderPng(512));
// Maskable: sfondo pieno e simbolo ridotto dentro la zona sicura (cerchio dell'80%).
out("public/icons/icon-maskable-512.png", renderPng(512, { tile: "square", scale: 0.72 }));
// iPhone arrotonda da solo gli angoli: sfondo pieno.
out("app/apple-icon.png", renderPng(180, { tile: "square", scale: 0.9 }));
out("app/favicon.ico", renderIco([16, 32, 48]));
out("app/icon.svg", renderSmallSvg());
