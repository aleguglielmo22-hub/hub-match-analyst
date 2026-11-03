// Genera favicon e icone PWA di AG Workspace dagli SVG del marchio
// (public/brand/icona-app.svg e public/brand/favicon.svg), con sharp.
//
// Uso: node scripts/generate-icons.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");

const APP_ICON = read("public/brand/icona-app.svg"); // riquadro arrotondato #141414
const FAVICON = read("public/brand/favicon.svg"); // versione per le dimensioni piccole

/**
 * Icona a sfondo pieno (senza angoli arrotondati): per maskable e iPhone, che
 * ritagliano da soli la forma. `logoWidth` = larghezza del simbolo sul lato
 * dell'icona: con 0.6 il simbolo resta dentro la zona sicura (cerchio dell'80%).
 */
function squareIcon(logoWidth) {
  const inner = APP_ICON.match(/<svg x="[^"]*" y="[^"]*" width="[^"]*" height="[^"]*" (viewBox="[^"]*">[\s\S]*<\/svg>)<\/svg>/);
  if (!inner) throw new Error("Struttura di icona-app.svg non riconosciuta");
  const bg = APP_ICON.match(/<rect [^>]*fill="(#[0-9a-fA-F]{6})"/)[1];
  const w = 1024 * logoWidth;
  const h = (w * 104) / 240;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">` +
    `<rect width="1024" height="1024" fill="${bg}"/>` +
    `<svg x="${(1024 - w) / 2}" y="${(1024 - h) / 2}" width="${w}" height="${h}" ${inner[1]}</svg>`
  );
}

/**
 * Il convertitore sfuma i bordi dove due forme delle lettere si toccano e
 * lascia una riga sottile: un contorno dello stesso colore (0,6 unità su 240)
 * la chiude. Gli SVG del marchio restano invariati.
 */
const sealSeams = (svg) =>
  svg.replace(/(<g mask="url\(#\w+\)" fill="(#[0-9a-fA-F]{3,6})")/g, '$1 stroke="$2" stroke-width="0.6"');

// Densità scelta perché lo SVG venga disegnato già alla dimensione finale (nitido).
const png = (rawSvg, size) => {
  const svg = sealSeams(rawSvg);
  const viewWidth = Number(svg.match(/viewBox="[\d.-]+ [\d.-]+ ([\d.]+)/)[1]);
  return sharp(Buffer.from(svg), { density: (72 * size) / viewWidth })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer();
};

/** File .ico con le immagini PNG dentro (formato accettato da tutti i browser). */
function ico(pngs, sizes) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = 6 + 16 * pngs.length;
  const entries = pngs.map((data, i) => {
    const e = Buffer.alloc(16);
    e[0] = sizes[i] >= 256 ? 0 : sizes[i];
    e[1] = sizes[i] >= 256 ? 0 : sizes[i];
    e.writeUInt16LE(1, 4); // planes
    e.writeUInt16LE(32, 6); // bpp
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    return e;
  });
  return Buffer.concat([header, ...entries, ...pngs]);
}

const out = (rel, data) => {
  const p = join(ROOT, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, data);
  console.log(`  ${rel} (${data.length} B)`);
};

console.log("Icone AG Workspace:");
out("public/icons/icon-192.png", await png(APP_ICON, 192));
out("public/icons/icon-512.png", await png(APP_ICON, 512));
out("public/icons/icon-maskable-512.png", await png(squareIcon(0.6), 512));
// iPhone arrotonda da solo gli angoli: sfondo pieno.
out("app/apple-icon.png", await png(squareIcon(0.7), 180));
const favSizes = [16, 32, 48];
out("app/favicon.ico", ico(await Promise.all(favSizes.map((s) => png(FAVICON, s))), favSizes));
out("app/icon.svg", Buffer.from(FAVICON));
