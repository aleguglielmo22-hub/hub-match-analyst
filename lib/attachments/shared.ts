/** Costanti e tipi condivisi del sistema allegati (client + server). */

/** Sezioni che supportano gli allegati (file reali su storage privato). */
export const ATTACHMENT_ENTITIES = [
  "player",
  "set_piece",
  "situational",
] as const;
export type AttachmentEntity = (typeof ATTACHMENT_ENTITIES)[number];

export const ATTACHMENTS_BUCKET = "media";
export const ATTACHMENT_MAX_BYTES = 500 * 1024 * 1024; // 500 MB

export type AttachmentItem = {
  id: string;
  file_name: string;
  file_path: string;
  file_size_bytes: number | null;
  mime_type: string | null;
  created_at: string;
  signed_url: string | null;
  can_delete: boolean;
};

export type NewAttachmentInput = {
  file_name: string;
  file_path: string;
  file_size_bytes: number | null;
  mime_type: string | null;
};

export function humanFileSize(bytes: number | null): string {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
