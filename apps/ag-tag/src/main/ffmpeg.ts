/**
 * FFprobe e FFmpeg inclusi nell'app (resources/bin, build GPL v3: vedi
 * FFMPEG-LICENSE.txt). Sempre programmi separati, avviati con argomenti
 * (mai una shell): nessun rischio con nomi di file particolari.
 */
import { spawn, execFile } from "node:child_process";
import { existsSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";
import { app } from "electron";
import { progressFromLine, summarizeProbe, workingCopyArgs, type ProbeInfo } from "@shared/media";

function binary(name: "ffmpeg" | "ffprobe"): string {
  const dir = app.isPackaged ? join(process.resourcesPath, "bin") : join(app.getAppPath(), "resources", "bin");
  const path = join(dir, name);
  if (!existsSync(path)) throw new Error(`${name} non trovato: in sviluppo esegui "npm run ffmpeg".`);
  return path;
}

export function probe(path: string): Promise<ProbeInfo> {
  return new Promise((resolve, reject) => {
    execFile(
      binary("ffprobe"),
      ["-v", "error", "-print_format", "json", "-show_streams", "-show_format", path],
      { maxBuffer: 16 * 1024 * 1024 },
      (err, stdout) => {
        if (err) return reject(new Error("Il file non sembra un video leggibile."));
        try {
          resolve(summarizeProbe(JSON.parse(stdout)));
        } catch {
          reject(new Error("Analisi del video non riuscita."));
        }
      },
    );
  });
}

const jobs = new Map<string, ReturnType<typeof spawn>>();

/**
 * Copia di lavoro H.264: scrive prima in un file ".part" e lo rinomina solo a
 * fine lavoro, così una copia interrotta non viene mai scambiata per buona.
 * L'originale è solo letto.
 */
export function makeWorkingCopy(
  key: string,
  input: string,
  output: string,
  info: ProbeInfo,
  onProgress: (p: number) => void,
): Promise<void> {
  const part = output.replace(/\.mp4$/, ".part.mp4");
  return new Promise((resolve, reject) => {
    const child = spawn(binary("ffmpeg"), workingCopyArgs(input, part, info), { stdio: ["ignore", "pipe", "pipe"] });
    jobs.set(key, child);
    let stderr = "";
    let buffer = "";
    child.stdout.on("data", (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const p = progressFromLine(line, info.durationMs);
        if (p !== null) onProgress(p);
      }
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr = (stderr + chunk.toString()).slice(-4000);
    });
    child.on("close", (code, signal) => {
      jobs.delete(key);
      if (code === 0) {
        renameSync(part, output);
        onProgress(1);
        resolve();
        return;
      }
      rmSync(part, { force: true });
      if (signal) reject(new Error("Copia di lavoro annullata."));
      else {
        console.error("[FFmpeg]", stderr);
        reject(new Error("Creazione della copia di lavoro non riuscita."));
      }
    });
    child.on("error", (e) => {
      jobs.delete(key);
      rmSync(part, { force: true });
      reject(e);
    });
  });
}

export function cancelWorkingCopy(key: string): void {
  jobs.get(key)?.kill("SIGTERM");
}

export function cancelAllJobs(): void {
  for (const child of jobs.values()) child.kill("SIGTERM");
}
