/**
 * Tabelle dati incluse nel backup: tutte quelle create in supabase/migrations/
 * (tables.test.mjs fallisce se una tabella nuova viene dimenticata).
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
  { name: "set_piece_players", orderBy: ["id"] },
  { name: "archive_item_players", orderBy: ["archive_item_id", "player_id"] },
  { name: "archive_item_set_pieces", orderBy: ["archive_item_id", "set_piece_id"] },
  { name: "archive_item_situational", orderBy: ["archive_item_id", "situational_id"] },
  { name: "attachments", orderBy: ["id"] },
  { name: "user_preferences", orderBy: ["user_id", "workspace_id"] },
  // AG Tag (0018): definizioni dei codici, partite, eventi e loro collegamenti.
  { name: "tag_codes", orderBy: ["id"] },
  { name: "tag_label_codes", orderBy: ["id"] },
  { name: "tag_matches", orderBy: ["id"] },
  { name: "tag_events", orderBy: ["id"] },
  { name: "tag_event_labels", orderBy: ["event_id", "label_code"] },
  { name: "tag_event_players", orderBy: ["event_id", "player_id"] },
  // AG Studio (0019): partite, formazioni, pannello di codifica e azioni.
  { name: "matches", orderBy: ["id"] },
  { name: "match_lineups", orderBy: ["id"] },
  { name: "coding_panels", orderBy: ["id"] },
  { name: "coding_events", orderBy: ["id"] },
  { name: "coding_subtag_groups", orderBy: ["id"] },
  { name: "coding_subtags", orderBy: ["id"] },
  { name: "match_actions", orderBy: ["id"] },
  { name: "match_action_subtags", orderBy: ["action_id", "subtag_id"] },
  // Eventi importanti della partita (0020) e statistiche importate (0021).
  { name: "match_key_events", orderBy: ["id"] },
  { name: "stat_sets", orderBy: ["id"] },
  // Studi (0023).
  { name: "study_books", orderBy: ["id"] },
  { name: "study_book_chapters", orderBy: ["id"] },
  { name: "study_courses", orderBy: ["id"] },
  { name: "study_course_modules", orderBy: ["id"] },
  { name: "study_exam_questions", orderBy: ["id"] },
  { name: "study_exams", orderBy: ["id"] },
  { name: "study_readings", orderBy: ["id"] },
  { name: "study_highlights", orderBy: ["id"] },
  // Finanze (0024).
  { name: "fin_accounts", orderBy: ["id"] },
  { name: "fin_categories", orderBy: ["id"] },
  { name: "fin_recurring", orderBy: ["id"] },
  { name: "fin_transactions", orderBy: ["id"] },
  { name: "fin_goals", orderBy: ["id"] },
  // Benessere (0025).
  { name: "health_sync", orderBy: ["workspace_id"] },
  { name: "health_metrics", orderBy: ["id"] },
  { name: "wk_exercises", orderBy: ["id"] },
  { name: "wk_templates", orderBy: ["id"] },
  { name: "wk_template_items", orderBy: ["id"] },
  { name: "wk_sessions", orderBy: ["id"] },
  { name: "wk_sets", orderBy: ["id"] },
  { name: "nut_foods", orderBy: ["id"] },
  { name: "nut_log", orderBy: ["id"] },
  { name: "nut_goals", orderBy: ["id"] },
  { name: "nut_plans", orderBy: ["id"] },
] as const;

export type BackupTableName = (typeof BACKUP_TABLES)[number]["name"];

/** Bucket Storage privati (0003_storage.sql, 0010_attachments.sql). */
export const BACKUP_BUCKETS = ["archivio", "media"] as const;
export type BackupBucket = (typeof BACKUP_BUCKETS)[number];

/** Righe per blocco: coincide con il limite massimo predefinito di PostgREST. */
export const BACKUP_PAGE_SIZE = 1000;
