/**
 * Tabelle dati incluse nel backup, ricavate da supabase/migrations/0001–0012.
 * Ordine = ordine di ripristino (prima le tabelle referenziate dalle foreign key).
 * `orderBy` = chiave primaria, per una paginazione stabile a blocchi.
 */
export const BACKUP_TABLES = [
  { name: "profiles", orderBy: ["id"] },
  { name: "workspaces", orderBy: ["id"] },
  { name: "workspace_members", orderBy: ["id"] },
  { name: "teams", orderBy: ["id"] },
  { name: "competitions", orderBy: ["id"] },
  { name: "seasons", orderBy: ["id"] },
  { name: "tags", orderBy: ["id"] },
  { name: "archive_items", orderBy: ["id"] },
  { name: "archive_files", orderBy: ["id"] },
  { name: "archive_item_tags", orderBy: ["archive_item_id", "tag_id"] },
  { name: "archive_item_links", orderBy: ["id"] },
  { name: "players", orderBy: ["id"] },
  { name: "player_observations", orderBy: ["id"] },
  { name: "set_pieces", orderBy: ["id"] },
  { name: "situational_tactics", orderBy: ["id"] },
  { name: "attachments", orderBy: ["id"] },
] as const;

export type BackupTableName = (typeof BACKUP_TABLES)[number]["name"];

/** Bucket Storage privati (0003_storage.sql, 0010_attachments.sql). */
export const BACKUP_BUCKETS = ["archivio", "media"] as const;
export type BackupBucket = (typeof BACKUP_BUCKETS)[number];

/** Righe per blocco: coincide con il limite massimo predefinito di PostgREST. */
export const BACKUP_PAGE_SIZE = 1000;
