/**
 * Riepilogo di FFprobe e scelta tra file originale e copia di lavoro H.264.
 * Il lettore è Chromium (dentro Electron): si riproduce l'originale solo se
 * contenitore, codec e formato dei pixel sono affidabili per la ricerca dei
 * fotogrammi. Modulo puro, testato in media.test.mjs.
 */
import { parseFps } from "./time.ts";

export type ProbeInfo = {
  durationMs: number | null;
  fps: number | null;
  width: number | null;
  height: number | null;
  videoCodec: string | null;
  audioCodec: string | null;
  container: string | null;
  pixelFormat: string | null;
  interlaced: boolean;
};

type FfprobeStream = {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  avg_frame_rate?: string;
  r_frame_rate?: string;
  pix_fmt?: string;
  field_order?: string;
  disposition?: { attached_pic?: number };
};
type FfprobeOutput = { streams?: FfprobeStream[]; format?: { format_name?: string; duration?: string } };

/** Dati utili dall'uscita JSON di `ffprobe -show_streams -show_format`. */
export function summarizeProbe(raw: FfprobeOutput): ProbeInfo {
  const streams = raw.streams ?? [];
  const video = streams.find((s) => s.codec_type === "video" && !s.disposition?.attached_pic);
  const audio = streams.find((s) => s.codec_type === "audio");
  const duration = Number(raw.format?.duration);
  const field = video?.field_order ?? "progressive";
  return {
    durationMs: Number.isFinite(duration) && duration > 0 ? Math.round(duration * 1000) : null,
    fps: parseFps(video?.avg_frame_rate) ?? parseFps(video?.r_frame_rate),
    width: video?.width ?? null,
    height: video?.height ?? null,
    videoCodec: video?.codec_name ?? null,
    audioCodec: audio?.codec_name ?? null,
    container: raw.format?.format_name ?? null,
    pixelFormat: video?.pix_fmt ?? null,
    interlaced: !["progressive", "unknown", ""].includes(field),
  };
}

const CONTAINERS = ["mov", "mp4", "m4a", "3gp", "3g2", "mj2", "webm"];
const VIDEO_CODECS = ["h264", "hevc", "vp8", "vp9", "av1"];
const AUDIO_CODECS = ["aac", "mp3", "opus", "vorbis", "flac"];
const PIXEL_FORMATS = ["yuv420p", "yuvj420p", "nv12"];

export type Playability = { playable: true } | { playable: false; reason: string };

/** Il file si può riprodurre direttamente con ricerca affidabile dei fotogrammi? */
export function playability(info: ProbeInfo): Playability {
  if (!info.videoCodec) return { playable: false, reason: "nessuna traccia video" };
  const containers = (info.container ?? "").split(",");
  if (!containers.some((c) => CONTAINERS.includes(c))) {
    return { playable: false, reason: `contenitore ${info.container ?? "sconosciuto"}` };
  }
  if (!VIDEO_CODECS.includes(info.videoCodec)) return { playable: false, reason: `codec video ${info.videoCodec}` };
  if (info.audioCodec && !AUDIO_CODECS.includes(info.audioCodec)) {
    return { playable: false, reason: `codec audio ${info.audioCodec}` };
  }
  if (info.pixelFormat && !PIXEL_FORMATS.includes(info.pixelFormat)) {
    return { playable: false, reason: `formato dei pixel ${info.pixelFormat}` };
  }
  if (info.interlaced) return { playable: false, reason: "video interlacciato" };
  if (!info.fps) return { playable: false, reason: "fotogrammi al secondo non determinabili" };
  return { playable: true };
}

/**
 * Argomenti di FFmpeg per la copia di lavoro: H.264 con l'encoder hardware di
 * macOS (VideoToolbox, nessuna dipendenza da x264), un fotogramma chiave al
 * secondo per una ricerca precisa, deinterlacciamento se serve, audio AAC,
 * avanzamento su stdout.
 */
export function workingCopyArgs(input: string, output: string, info: ProbeInfo): string[] {
  const fps = info.fps ?? 25;
  const filters = [info.interlaced ? "bwdif=mode=send_frame" : null, "format=yuv420p"].filter(Boolean).join(",");
  return [
    "-hide_banner", "-nostdin", "-y",
    "-i", input,
    "-map", "0:v:0", "-map", "0:a:0?",
    "-vf", filters,
    "-c:v", "h264_videotoolbox", "-b:v", bitrateFor(info), "-g", String(Math.max(1, Math.round(fps))),
    "-c:a", "aac", "-b:a", "160k",
    "-movflags", "+faststart",
    "-progress", "pipe:1", "-nostats",
    output,
  ];
}

/** Bitrate della copia di lavoro in base alla risoluzione (qualità da analisi, non da archivio). */
export function bitrateFor(info: Pick<ProbeInfo, "width" | "height">): string {
  const pixels = (info.width ?? 1920) * (info.height ?? 1080);
  if (pixels > 2560 * 1440) return "24M";
  if (pixels > 1920 * 1080) return "16M";
  if (pixels > 1280 * 720) return "10M";
  return "6M";
}

/** Avanzamento 0–1 dalle righe "out_time_us=" di `-progress`. */
export function progressFromLine(line: string, durationMs: number | null): number | null {
  const m = /^out_time_(?:us|ms)=(\d+)$/.exec(line.trim());
  if (!m || !durationMs) return null;
  return Math.min(1, Number(m[1]) / 1000 / durationMs);
}
