/**
 * Tempo e fotogrammi del lettore. Il numero di fotogramma parte da 0.
 * Modulo puro, testato in time.test.mjs.
 */

/** Piccolo margine per non cadere sul confine tra due fotogrammi per arrotondamento. */
const EPS = 1e-6;

/** Fotogramma mostrato all'istante `seconds`. */
export function frameAt(seconds: number, fps: number): number {
  if (!(fps > 0) || !(seconds > 0)) return 0;
  return Math.floor(seconds * fps + EPS);
}

/** Istante a cui spostarsi per mostrare il fotogramma `frame` (metà del fotogramma: niente ambiguità). */
export function timeOfFrame(frame: number, fps: number): number {
  if (!(fps > 0)) return 0;
  return (Math.max(0, frame) + 0.5) / fps;
}

/** Istante per avanzare (+1) o arretrare (-1) di `delta` fotogrammi, entro la durata. */
export function stepFrames(seconds: number, fps: number, delta: number, duration: number): number {
  // Ultimo fotogramma: quello che inizia prima della fine del video.
  const last = Math.max(0, Math.ceil(duration * fps - EPS) - 1);
  const target = Math.min(last, Math.max(0, frameAt(seconds, fps) + delta));
  return Math.min(duration, timeOfFrame(target, fps));
}

/** Salto di `deltaSeconds` (±5 s), entro la durata. */
export function jump(seconds: number, deltaSeconds: number, duration: number): number {
  return Math.min(Math.max(0, seconds + deltaSeconds), Math.max(0, duration));
}

/** "1:02:03.040" oppure "02:03.040" sotto l'ora. */
export function formatTimecode(seconds: number): string {
  const totalMs = Math.max(0, Math.round(seconds * 1000));
  const ms = totalMs % 1000;
  const s = Math.floor(totalMs / 1000) % 60;
  const m = Math.floor(totalMs / 60000) % 60;
  const h = Math.floor(totalMs / 3600000);
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  const base = `${pad(m)}:${pad(s)}.${pad(ms, 3)}`;
  return h > 0 ? `${h}:${base}` : base;
}

/** Durata leggibile: "1 h 32 min", "45 min", "38 s". */
export function formatDuration(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return "—";
  const totalS = Math.round(ms / 1000);
  const h = Math.floor(totalS / 3600);
  const m = Math.floor((totalS % 3600) / 60);
  if (h > 0) return `${h} h ${m} min`;
  if (m > 0) return `${m} min`;
  return `${totalS} s`;
}

/** Fotogrammi al secondo da una frazione di FFprobe ("30000/1001", "25/1"). */
export function parseFps(rate: string | null | undefined): number | null {
  if (!rate) return null;
  const [n, d] = rate.split("/").map(Number);
  const fps = d ? n / d : n;
  return Number.isFinite(fps) && fps > 0 && fps < 1000 ? Math.round(fps * 1000) / 1000 : null;
}

export const PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2] as const;

/** Velocità successiva o precedente nella scala 0,25–2×. */
export function nextRate(current: number, direction: 1 | -1): number {
  const i = PLAYBACK_RATES.findIndex((r) => r >= current - EPS);
  const idx = i === -1 ? PLAYBACK_RATES.length - 1 : i;
  const next = Math.min(PLAYBACK_RATES.length - 1, Math.max(0, idx + direction));
  return PLAYBACK_RATES[next];
}
