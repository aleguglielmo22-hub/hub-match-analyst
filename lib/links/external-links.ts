/**
 * Link a file esterni (Cloud): normalizzazione dell'indirizzo, riconoscimento
 * della fonte e anteprima incorporata per YouTube/Vimeo.
 * Modulo puro, testato in external-links.test.mjs.
 */

export const LINK_URL_MAX = 2048;
export const LINK_LABEL_MAX = 200;

export type LinkSource =
  | "google-drive"
  | "dropbox"
  | "onedrive"
  | "youtube"
  | "vimeo"
  | "wyscout"
  | "altro";

export const LINK_SOURCE_LABEL: Record<LinkSource, string> = {
  "google-drive": "Google Drive",
  dropbox: "Dropbox",
  onedrive: "OneDrive",
  youtube: "YouTube",
  vimeo: "Vimeo",
  wyscout: "Wyscout",
  altro: "Link",
};

/**
 * Indirizzo pronto da salvare, oppure null se non valido.
 * Accetta anche indirizzi senza "https://" (lo aggiunge).
 */
export function normalizeExternalUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  let u: URL;
  try {
    u = new URL(withScheme);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  // Serve un dominio vero (es. "drive.google.com"), non una parola qualsiasi.
  if (!/^[^.\s]+(\.[^.\s]+)+$/.test(u.hostname)) return null;
  const out = u.toString();
  return out.length <= LINK_URL_MAX ? out : null;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function hostIs(host: string, ...domains: string[]): boolean {
  return domains.some((d) => host === d || host.endsWith(`.${d}`));
}

export function detectLinkSource(url: string): LinkSource {
  const host = hostOf(url);
  if (hostIs(host, "drive.google.com", "docs.google.com")) return "google-drive";
  if (hostIs(host, "dropbox.com", "db.tt")) return "dropbox";
  if (hostIs(host, "onedrive.live.com", "1drv.ms", "sharepoint.com")) return "onedrive";
  if (hostIs(host, "youtube.com", "youtu.be", "youtube-nocookie.com")) return "youtube";
  if (hostIs(host, "vimeo.com")) return "vimeo";
  if (hostIs(host, "wyscout.com")) return "wyscout";
  return "altro";
}

/** URL dell'anteprima incorporata (YouTube/Vimeo), oppure null. */
export function videoEmbedUrl(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  const parts = u.pathname.split("/").filter(Boolean);

  if (hostIs(host, "youtube.com", "youtu.be", "youtube-nocookie.com")) {
    let id: string | null = null;
    if (host === "youtu.be") id = parts[0] ?? null;
    else if (u.searchParams.get("v")) id = u.searchParams.get("v");
    else if (["embed", "shorts", "live", "v"].includes(parts[0] ?? ""))
      id = parts[1] ?? null;
    return id && /^[\w-]{6,}$/.test(id) ? `https://www.youtube.com/embed/${id}` : null;
  }

  if (hostIs(host, "vimeo.com")) {
    // vimeo.com/123, vimeo.com/channels/x/123, player.vimeo.com/video/123
    const id = parts.find((p) => /^\d+$/.test(p));
    return id ? `https://player.vimeo.com/video/${id}` : null;
  }

  return null;
}
