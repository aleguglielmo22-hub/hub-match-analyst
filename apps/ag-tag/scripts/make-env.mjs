// Crea apps/ag-tag/.env con URL e chiave pubblica di Supabase prese da
// .env.local di AG Workspace (stesso progetto). I valori non vengono stampati.
// Uso: npm run env
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(join(ROOT, "..", "..", ".env.local"), "utf8");
const get = (key) => source.match(new RegExp(`^${key}=(.*)$`, "m"))?.[1]?.trim().replace(/^["']|["']$/g, "");
const url = get("NEXT_PUBLIC_SUPABASE_URL");
const anon = get("NEXT_PUBLIC_SUPABASE_ANON_KEY");
if (!url || !anon) {
  console.error("In .env.local mancano NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  process.exit(1);
}
writeFileSync(join(ROOT, ".env"), `MAIN_VITE_SUPABASE_URL=${url}\nMAIN_VITE_SUPABASE_ANON_KEY=${anon}\n`, { mode: 0o600 });
console.log("Creato apps/ag-tag/.env (URL e chiave pubblica di Supabase).");
