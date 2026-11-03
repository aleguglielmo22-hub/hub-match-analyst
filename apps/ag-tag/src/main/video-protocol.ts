/**
 * Protocollo interno agvideo://video/<token>: serve al lettore soltanto i file
 * aperti esplicitamente dal processo principale, con richieste a intervalli
 * (Range) per una ricerca immediata nel video. Il renderer non ottiene mai
 * l'accesso diretto al disco e la sicurezza web resta attiva.
 */
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { protocol } from "electron";

export const VIDEO_SCHEME = "agvideo";

const allowed = new Map<string, string>();

/** Da chiamare prima che l'app sia pronta. */
export function registerVideoScheme(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: VIDEO_SCHEME, privileges: { standard: true, secure: true, stream: true, supportFetchAPI: true } },
  ]);
}

/** Indirizzo per il lettore di un file già verificato. */
export function videoUrlFor(path: string): string {
  for (const [token, p] of allowed) if (p === path) return `${VIDEO_SCHEME}://video/${token}`;
  const token = randomUUID();
  allowed.set(token, path);
  return `${VIDEO_SCHEME}://video/${token}`;
}

const MIME: Record<string, string> = { mp4: "video/mp4", m4v: "video/mp4", mov: "video/quicktime", webm: "video/webm" };

export function handleVideoProtocol(): void {
  protocol.handle(VIDEO_SCHEME, async (request) => {
    const url = new URL(request.url);
    const path = url.hostname === "video" ? allowed.get(url.pathname.slice(1)) : undefined;
    if (!path) return new Response("Non trovato", { status: 404 });
    let size: number;
    try {
      size = (await stat(path)).size;
    } catch {
      return new Response("File non disponibile", { status: 404 });
    }
    const type = MIME[path.split(".").pop()?.toLowerCase() ?? ""] ?? "video/mp4";
    const range = /bytes=(\d*)-(\d*)/.exec(request.headers.get("range") ?? "");
    if (!range) {
      return new Response(Readable.toWeb(createReadStream(path)) as ReadableStream, {
        status: 200,
        headers: { "Content-Type": type, "Content-Length": String(size), "Accept-Ranges": "bytes" },
      });
    }
    let start = range[1] ? Number(range[1]) : 0;
    let end = range[2] ? Number(range[2]) : size - 1;
    if (!range[1] && range[2]) {
      start = Math.max(0, size - Number(range[2]));
      end = size - 1;
    }
    end = Math.min(end, size - 1);
    if (start > end || start >= size) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    return new Response(Readable.toWeb(createReadStream(path, { start, end })) as ReadableStream, {
      status: 206,
      headers: {
        "Content-Type": type,
        "Content-Length": String(end - start + 1),
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Accept-Ranges": "bytes",
      },
    });
  });
}
