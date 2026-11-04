/**
 * Pannello di codifica in uso. Parte A della fase 2: resta solo in memoria
 * fino alla chiusura dell'app; con la migrazione 0019 passerà al database
 * (tag_codes, tag_label_groups, tag_label_codes).
 */
import { randomUUID } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { basename, extname } from "node:path";
import { MAX_LEAD_LAG_MS, type Panel } from "@shared/panel";
import { ImportError, previewFromFiles, type ImportPreview } from "@shared/videomatch-import";

const MAX_BYTES = 5 * 1024 * 1024;

let current: Panel | null = null;
/** Anteprime in attesa di conferma: il renderer conosce solo il token. */
const previews = new Map<string, ImportPreview>();

export function getPanel(): Panel | null {
  return current;
}

async function readSmall(path: string): Promise<{ name: string; text: string }> {
  if ((await stat(path)).size > MAX_BYTES) throw new ImportError(`«${basename(path)}» è troppo grande.`);
  return { name: basename(path), text: await readFile(path, "utf8") };
}

/** Anteprima da un file .xml di VideoMatch e, facoltativo, un .json di LiveTag. */
export async function previewImport(paths: string[]): Promise<{ token: string; preview: ImportPreview }> {
  const xml = paths.filter((p) => extname(p).toLowerCase() === ".xml");
  const json = paths.filter((p) => extname(p).toLowerCase() === ".json");
  if (xml.length !== 1) throw new ImportError("Scegli un file .xml di VideoMatch (e, se vuoi, un solo .json di LiveTag).");
  if (json.length > 1) throw new ImportError("Scegli al massimo un file .json di LiveTag.");
  const preview = previewFromFiles(await readSmall(xml[0]), json[0] ? await readSmall(json[0]) : null);
  const token = randomUUID();
  previews.clear();
  previews.set(token, preview);
  return { token, preview };
}

export function confirmImport(token: string): ImportPreview {
  const preview = previews.get(token);
  if (!preview) throw new Error("Anteprima scaduta: importa di nuovo il file.");
  previews.delete(token);
  current = preview.panel;
  return preview;
}

export function setTiming(code: string, leadMs: number, lagMs: number): Panel {
  if (!current) throw new Error("Nessun pannello importato.");
  if (!current.events.some((e) => e.code === code)) throw new Error("Evento non trovato.");
  const clamp = (n: number) => Math.max(0, Math.min(MAX_LEAD_LAG_MS, Math.round(n)));
  current = { events: current.events.map((e) => (e.code === code ? { ...e, leadMs: clamp(leadMs), lagMs: clamp(lagMs) } : e)) };
  return current;
}
