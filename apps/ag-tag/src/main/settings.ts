/**
 * Impostazioni salvate sul Mac (non nel database): cartella delle copie di
 * lavoro, scorciatoie del lettore, tema, lettere degli eventi del pannello.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { app } from "electron";
import type { Settings } from "@shared/api";
import { mergeEventKeys } from "@shared/panel-shortcuts";
import { mergeShortcuts } from "@shared/shortcuts";

const file = () => join(app.getPath("userData"), "impostazioni.json");
const defaultCacheDir = () => join(app.getPath("videos"), "AG Tag", "Copie di lavoro");

let cached: Settings | null = null;

export function getSettings(): Settings {
  if (cached) return cached;
  let raw: Partial<Settings> = {};
  try {
    if (existsSync(file())) raw = JSON.parse(readFileSync(file(), "utf8"));
  } catch {
    raw = {};
  }
  cached = {
    cacheDir: typeof raw.cacheDir === "string" && raw.cacheDir ? raw.cacheDir : defaultCacheDir(),
    shortcuts: mergeShortcuts(raw.shortcuts),
    theme: raw.theme === "light" ? "light" : "dark",
    eventKeys: mergeEventKeys(raw.eventKeys),
  };
  return cached;
}

export function updateSettings(patch: Partial<Settings>): Settings {
  cached = { ...getSettings(), ...patch };
  writeFileSync(file(), JSON.stringify(cached, null, 2));
  return cached;
}

/** Cartella delle copie di lavoro (creata se manca). */
export function cacheDir(): string {
  const dir = getSettings().cacheDir;
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** Copia di lavoro di un video, riconosciuta dall'impronta dell'originale. */
export function workingCopyPath(fingerprint: string): string {
  return join(cacheDir(), `${fingerprint}.mp4`);
}
