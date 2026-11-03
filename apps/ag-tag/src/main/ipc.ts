/**
 * Gestori delle chiamate dal renderer. Ogni chiamata è accettata solo dalla
 * finestra dell'app e i dati in ingresso sono controllati con zod. I percorsi
 * dei file non arrivano mai dal renderer: restano qui, dietro un token.
 */
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { basename } from "node:path";
import { BrowserWindow, dialog, ipcMain, type IpcMainInvokeEvent } from "electron";
import { z } from "zod";
import { IPC, type NewMatchInput, type OpenVideoResult, type PickedVideo, type Settings } from "@shared/api";
import { playability, type ProbeInfo } from "@shared/media";
import { mergeShortcuts } from "@shared/shortcuts";
import { fingerprintFile } from "./fingerprint";
import { cancelWorkingCopy, makeWorkingCopy, probe } from "./ffmpeg";
import { getSettings, updateSettings, workingCopyPath } from "./settings";
import * as db from "./supabase";
import { videoUrlFor } from "./video-protocol";

const VIDEO_EXTENSIONS = ["mp4", "m4v", "mov", "mkv", "avi", "mts", "m2ts", "ts", "mpg", "mpeg", "webm", "wmv", "flv", "mxf"];

/** File scelti in questa sessione: il renderer conosce solo il token. */
const picked = new Map<string, { path: string; name: string; sizeBytes: number; fingerprint: string; probe: ProbeInfo }>();

const uuid = z.string().uuid();

let trustedUrl = "";
export function setTrustedRendererUrl(url: string): void {
  trustedUrl = url;
}

function assertSender(e: IpcMainInvokeEvent): void {
  const url = e.senderFrame?.url ?? "";
  if (!trustedUrl || !url.startsWith(trustedUrl)) throw new Error("Richiesta non consentita.");
}

function handle<A extends unknown[], R>(channel: string, fn: (e: IpcMainInvokeEvent, ...args: A) => Promise<R> | R) {
  ipcMain.handle(channel, async (e, ...args) => {
    assertSender(e);
    return fn(e, ...(args as A));
  });
}

async function analyze(path: string) {
  const [info, fp] = await Promise.all([probe(path), fingerprintFile(path)]);
  const check = playability(info);
  return { info, fp, playable: check.playable, reason: check.playable ? null : check.reason };
}

/** Il file al percorso indicato è proprio quello della partita? (dimensione + impronta) */
async function sameFile(path: string | null, sizeBytes: number, fingerprint: string): Promise<boolean> {
  if (!path || !existsSync(path)) return false;
  try {
    const fp = await fingerprintFile(path);
    return fp.sizeBytes === sizeBytes && fp.fingerprint === fingerprint;
  } catch {
    return false;
  }
}

const newMatchSchema = z.object({
  token: uuid,
  titolo: z.string().trim().max(200).nullable(),
  data_partita: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  home_team_id: uuid,
  away_team_id: uuid,
  competition_id: uuid.nullable(),
  season_id: uuid.nullable(),
  preferred_team_id: uuid.nullable(),
});

export function registerIpc(): void {
  handle(IPC.authCurrent, () => db.currentUser());
  handle(IPC.authSignIn, (_e, email: unknown, password: unknown) =>
    db.signIn(z.string().email().max(200).parse(email), z.string().min(1).max(200).parse(password)),
  );
  handle(IPC.authSignOut, () => db.signOut());

  handle(IPC.lookupsList, () => db.listLookups());
  handle(IPC.lookupsCreate, (_e, kind: unknown, name: unknown) =>
    db.createLookup(z.enum(["team", "competition", "season"]).parse(kind), z.string().max(100).parse(name)),
  );

  handle(IPC.mediaPick, async (e): Promise<PickedVideo | null> => {
    const win = BrowserWindow.fromWebContents(e.sender);
    const res = await dialog.showOpenDialog(win!, {
      title: "Scegli il video della partita",
      properties: ["openFile"],
      filters: [{ name: "Video", extensions: VIDEO_EXTENSIONS }],
    });
    const path = res.filePaths[0];
    if (res.canceled || !path) return null;
    const a = await analyze(path);
    const token = randomUUID();
    const name = basename(path);
    picked.set(token, { path, name, sizeBytes: a.fp.sizeBytes, fingerprint: a.fp.fingerprint, probe: a.info });
    return {
      token,
      fileName: name,
      sizeBytes: a.fp.sizeBytes,
      fingerprint: a.fp.fingerprint,
      probe: a.info,
      playable: a.playable,
      reason: a.reason,
    };
  });

  handle(IPC.matchesList, async () => (await db.listMatches()).map(db.publicMatch));
  handle(IPC.matchesGet, async (_e, id: unknown) => {
    const m = await db.getMatch(uuid.parse(id));
    return m ? db.publicMatch(m) : null;
  });

  handle(IPC.matchesCreate, async (_e, raw: unknown) => {
    const input: NewMatchInput = newMatchSchema.parse(raw);
    if (input.home_team_id === input.away_team_id) throw new Error("Casa e ospite devono essere squadre diverse.");
    if (input.preferred_team_id && ![input.home_team_id, input.away_team_id].includes(input.preferred_team_id)) {
      throw new Error("La squadra preferita deve essere una delle due.");
    }
    const file = picked.get(input.token);
    if (!file) throw new Error("Scegli di nuovo il file video.");
    const { token: _t, ...match } = input;
    void _t;
    const res = await db.insertMatch({ ...match, file });
    picked.delete(input.token);
    return res;
  });

  handle(IPC.matchesOpenVideo, async (_e, rawId: unknown): Promise<OpenVideoResult> => {
    const m = await db.getMatch(uuid.parse(rawId));
    if (!m) throw new Error("Partita non trovata.");
    if (!(await sameFile(m.video_path, m.video_size_bytes, m.video_fingerprint))) {
      return { status: "missing", fileName: m.video_file_name, lastPath: m.video_path };
    }
    const a = await analyze(m.video_path!);
    const fps = a.info.fps ?? m.fps ?? 25;
    if (a.playable) return { status: "ready", url: videoUrlFor(m.video_path!), source: "original", fps, durationMs: a.info.durationMs };
    const copy = workingCopyPath(m.video_fingerprint);
    if (existsSync(copy)) {
      const c = await probe(copy);
      return { status: "ready", url: videoUrlFor(copy), source: "working", fps: c.fps ?? fps, durationMs: c.durationMs };
    }
    return { status: "needs-working-copy", reason: a.reason ?? "formato non affidabile" };
  });

  handle(IPC.matchesRelink, async (e, rawId: unknown) => {
    const m = await db.getMatch(uuid.parse(rawId));
    if (!m) throw new Error("Partita non trovata.");
    const win = BrowserWindow.fromWebContents(e.sender);
    const res = await dialog.showOpenDialog(win!, {
      title: `Dov'è «${m.video_file_name}»?`,
      properties: ["openFile"],
      filters: [{ name: "Video", extensions: VIDEO_EXTENSIONS }],
    });
    const path = res.filePaths[0];
    if (res.canceled || !path) return { ok: false as const, message: "Nessun file scelto." };
    if (!(await sameFile(path, m.video_size_bytes, m.video_fingerprint))) {
      return { ok: false as const, message: "Il file scelto non è quello della partita (impronta diversa)." };
    }
    await db.updateMatchPath(m.id, path, basename(path));
    return { ok: true as const };
  });

  handle(IPC.matchesMakeWorkingCopy, async (e, rawId: unknown) => {
    const id = uuid.parse(rawId);
    const m = await db.getMatch(id);
    if (!m) throw new Error("Partita non trovata.");
    if (!(await sameFile(m.video_path, m.video_size_bytes, m.video_fingerprint))) {
      return { ok: false as const, message: "Il file originale non si trova." };
    }
    try {
      const info = await probe(m.video_path!);
      await makeWorkingCopy(id, m.video_path!, workingCopyPath(m.video_fingerprint), info, (progress) => {
        if (!e.sender.isDestroyed()) e.sender.send(IPC.matchesProgress, { matchId: id, progress });
      });
      return { ok: true as const };
    } catch (err) {
      return { ok: false as const, message: err instanceof Error ? err.message : "Errore sconosciuto" };
    }
  });
  handle(IPC.matchesCancelWorkingCopy, (_e, rawId: unknown) => cancelWorkingCopy(uuid.parse(rawId)));

  handle(IPC.settingsGet, (): Settings => getSettings());
  handle(IPC.settingsChooseCacheDir, async (e) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    const res = await dialog.showOpenDialog(win!, {
      title: "Cartella per le copie di lavoro",
      defaultPath: getSettings().cacheDir,
      properties: ["openDirectory", "createDirectory"],
    });
    return res.canceled || !res.filePaths[0] ? getSettings() : updateSettings({ cacheDir: res.filePaths[0] });
  });
  handle(IPC.settingsSetShortcuts, (_e, raw: unknown) => updateSettings({ shortcuts: mergeShortcuts(raw) }));
  handle(IPC.settingsSetTheme, (_e, raw: unknown) => updateSettings({ theme: z.enum(["dark", "light"]).parse(raw) }));
}
