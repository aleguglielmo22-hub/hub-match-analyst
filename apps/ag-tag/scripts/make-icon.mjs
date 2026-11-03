// Icona di AG Tag (build/icon.png, 1024×1024) dal logo AG di AG Workspace
// (public/brand/icona-app.svg). electron-builder ne ricava l'icona .icns.
// Uso: npm run icon
import { readFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(join(ROOT, "..", "..", "public", "brand", "icona-app.svg"), "utf8")
  // Stesso accorgimento di scripts/generate-icons.mjs: contorno dello stesso colore
  // per non lasciare righe dove le forme delle lettere si toccano.
  .replace(/(<g mask="url\(#\w+\)" fill="(#[0-9a-fA-F]{3,6})")/g, '$1 stroke="$2" stroke-width="0.6"');

// Formato delle icone macOS: riquadro arrotondato con un margine attorno (824 su 1024).
const inner = await sharp(Buffer.from(svg), { density: 72 * (824 / 1024) }).resize(824, 824).png().toBuffer();
mkdirSync(join(ROOT, "build"), { recursive: true });
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: inner, top: 100, left: 100 }])
  .png({ compressionLevel: 9 })
  .toFile(join(ROOT, "build", "icon.png"));
console.log("Creato build/icon.png");
