// Scarica FFmpeg e FFprobe 6.1.1 per Mac arm64 (build GPL v3 di ffmpeg-static,
// release b6.1.1 su GitHub), verifica l'impronta SHA-256 fissata qui sotto e li
// mette in resources/bin/ (cartella esclusa da git, inclusa nell'app).
// Uso: npm run ffmpeg
import { createHash } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { arch, platform } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BIN = join(ROOT, "resources", "bin");
const CACHE = join(BIN, ".cache");
const BASE = "https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1";

// Impronte verificate anche con quelle dichiarate da GitHub per la release.
const FILES = [
  { name: "ffmpeg-darwin-arm64.gz", out: "ffmpeg", sha256: "8923876afa8db5585022d7860ec7e589af192f441c56793971276d450ed3bbfa" },
  { name: "ffprobe-darwin-arm64.gz", out: "ffprobe", sha256: "d986a8ec7b030899fe66a8a288ed809a3543338705a3ce178cfb85869c5d80be" },
  { name: "darwin-arm64.LICENSE", out: "FFMPEG-LICENSE.txt", sha256: "cb48bf09a11f5fb576cddb0431c8f5ed0a60157a9ec942adffc13907cbe083f2" },
  { name: "darwin-arm64.README", out: "FFMPEG-README.txt", sha256: "05ba4b92c96605434b1aaae3eedf5a2c280c9607bf78ffca9a5b536d9af2dc6a" },
];

if (platform() !== "darwin" || arch() !== "arm64") {
  console.error(`Questa build è per Mac Apple Silicon (darwin-arm64); questo computer è ${platform()}-${arch()}.`);
  process.exit(1);
}

const sha = (buf) => createHash("sha256").update(buf).digest("hex");
mkdirSync(CACHE, { recursive: true });

for (const f of FILES) {
  const cached = join(CACHE, f.name);
  let data = existsSync(cached) ? readFileSync(cached) : null;
  if (!data || sha(data) !== f.sha256) {
    console.log(`Scarico ${f.name}…`);
    const res = await fetch(`${BASE}/${f.name}`);
    if (!res.ok) throw new Error(`Download non riuscito (${res.status}): ${f.name}`);
    data = Buffer.from(await res.arrayBuffer());
    writeFileSync(cached, data);
  }
  if (sha(data) !== f.sha256) throw new Error(`Impronta SHA-256 diversa da quella attesa: ${f.name}`);
  const out = join(BIN, f.out);
  writeFileSync(out, f.name.endsWith(".gz") ? gunzipSync(data) : data);
  if (f.name.endsWith(".gz")) chmodSync(out, 0o755);
  console.log(`  ok ${f.out}`);
}
