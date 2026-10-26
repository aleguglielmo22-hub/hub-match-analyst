/**
 * Limiti dei file caricati nei bucket "archivio" e "media" (migrazione 0011):
 * 20 MB per file; solo PDF, immagini e documenti Office. Niente video: video e
 * file pesanti si inseriscono come link ("l'hub cataloga, non custodisce").
 * Il controllo avviene nel browser PRIMA dell'invio; il bucket lo ribadisce.
 * Modulo puro, testato in limits.test.mjs.
 */

export const UPLOAD_MAX_MB = 20;
export const UPLOAD_MAX_BYTES = UPLOAD_MAX_MB * 1024 * 1024;

/** Tipi ammessi, per estensione (stesso elenco del bucket). */
const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

const ALLOWED_MIME = new Set(Object.values(MIME_BY_EXT));

/** Valore per l'attributo `accept` del selettore file. */
export const UPLOAD_ACCEPT = [
  ...Object.keys(MIME_BY_EXT).map((e) => `.${e}`),
  ...ALLOWED_MIME,
].join(",");

export const UPLOAD_HINT = `PDF · immagini · Word · Excel · PowerPoint · max ${UPLOAD_MAX_MB} MB per file`;

type FileLike = { name: string; size: number; type: string };

/**
 * Tipo del file da dichiarare al caricamento. Se il browser non lo indica
 * (succede con alcuni file Office), lo ricava dall'estensione.
 */
export function uploadMimeType(file: Pick<FileLike, "name" | "type">): string | null {
  if (file.type && ALLOWED_MIME.has(file.type)) return file.type;
  const dot = file.name.lastIndexOf(".");
  const ext = dot > 0 ? file.name.slice(dot + 1).toLowerCase() : "";
  const byExt = MIME_BY_EXT[ext];
  if (byExt && (!file.type || file.type === "application/octet-stream")) return byExt;
  return null;
}

function formatMb(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(1).replace(".", ",");
}

/** Messaggio d'errore se il file non può essere caricato, altrimenti null. */
export function checkUploadFile(file: FileLike): string | null {
  if (!uploadMimeType(file)) {
    return file.type.startsWith("video/")
      ? "I video non si caricano: inseriscili come link."
      : "Tipo di file non ammesso: carica PDF, immagini o documenti Office. Per gli altri file usa un link.";
  }
  if (file.size > UPLOAD_MAX_BYTES) {
    return `File troppo pesante (${formatMb(file.size)} MB): il limite è ${UPLOAD_MAX_MB} MB. Per video e file pesanti usa un link.`;
  }
  return null;
}
