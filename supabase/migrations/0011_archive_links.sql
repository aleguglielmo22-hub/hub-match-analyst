-- 0011 — Cloud: link esterni e limiti di caricamento.
-- Principio "l'hub cataloga, non custodisce": ogni voce del Cloud può avere
-- link a file esterni (Drive, Dropbox, YouTube…); l'upload resta per file leggeri.
-- Nessuna colonna esistente rimossa o rinominata; i file già caricati restano.

-- 1) Tabella dei link ----------------------------------------------------------
CREATE TABLE archive_item_links (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  archive_item_id  UUID NOT NULL REFERENCES archive_items(id) ON DELETE CASCADE,
  url              TEXT NOT NULL
                   CHECK (url ~* '^https?://' AND length(url) <= 2048),
  etichetta        TEXT CHECK (etichetta IS NULL OR length(etichetta) <= 200),
  posizione        INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_links_archive_item ON archive_item_links (archive_item_id, posizione);

-- 2) RLS: stesse regole di archive_files (permessi legati alla voce) ----------
ALTER TABLE archive_item_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "archive_item_links_select_via_parent" ON archive_item_links
  FOR SELECT USING (
    archive_item_id IN (
      SELECT id FROM archive_items
      WHERE workspace_id IN (SELECT current_user_workspaces())
    )
  );

CREATE POLICY "archive_item_links_insert_via_parent" ON archive_item_links
  FOR INSERT WITH CHECK (
    archive_item_id IN (
      SELECT id FROM archive_items
      WHERE workspace_id IN (SELECT current_user_owned_workspaces())
         OR created_by = auth.uid()
    )
  );

CREATE POLICY "archive_item_links_update_via_parent" ON archive_item_links
  FOR UPDATE USING (
    archive_item_id IN (
      SELECT id FROM archive_items
      WHERE workspace_id IN (SELECT current_user_owned_workspaces())
         OR created_by = auth.uid()
    )
  )
  WITH CHECK (
    archive_item_id IN (
      SELECT id FROM archive_items
      WHERE workspace_id IN (SELECT current_user_owned_workspaces())
         OR created_by = auth.uid()
    )
  );

CREATE POLICY "archive_item_links_delete_via_parent" ON archive_item_links
  FOR DELETE USING (
    archive_item_id IN (
      SELECT id FROM archive_items
      WHERE workspace_id IN (SELECT current_user_owned_workspaces())
         OR created_by = auth.uid()
    )
  );

-- 3) Ricerca: le etichette dei link entrano nel search_vector della voce ------
-- (peso C, dopo titolo A e descrizione B). La query di ricerca non cambia.
CREATE OR REPLACE FUNCTION archive_items_update_search_vector() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('italian', coalesce(NEW.titolo_archivio, '')), 'A') ||
    setweight(to_tsvector('italian', coalesce(NEW.descrizione_estesa, '')), 'B') ||
    setweight(to_tsvector('italian', coalesce((
      SELECT string_agg(l.etichetta, ' ')
      FROM archive_item_links l
      WHERE l.archive_item_id = NEW.id
    ), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at cambia solo per le modifiche dirette alla voce, non per gli UPDATE
-- lanciati da altri trigger (come il ricalcolo della ricerca qui sotto).
DROP TRIGGER trg_archive_updated_at ON archive_items;
CREATE TRIGGER trg_archive_updated_at
  BEFORE UPDATE ON archive_items
  FOR EACH ROW
  WHEN (pg_trigger_depth() = 0)
  EXECUTE FUNCTION set_updated_at();

-- Quando cambiano i link, ricalcola il search_vector della voce: l'UPDATE del
-- titolo (con lo stesso valore) riattiva trg_archive_search_vector.
CREATE OR REPLACE FUNCTION archive_item_links_touch_parent() RETURNS TRIGGER AS $$
BEGIN
  UPDATE archive_items
    SET titolo_archivio = titolo_archivio
    WHERE id = COALESCE(NEW.archive_item_id, OLD.archive_item_id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_archive_item_links_search
  AFTER INSERT OR UPDATE OF etichetta, archive_item_id OR DELETE ON archive_item_links
  FOR EACH ROW EXECUTE FUNCTION archive_item_links_touch_parent();

-- 4) Bucket "archivio" e "media": 20 MB per file, niente video -----------------
-- Vale solo per i nuovi caricamenti: i file già presenti non vengono toccati.
UPDATE storage.buckets
SET
  file_size_limit = 20971520,  -- 20 MB
  allowed_mime_types = ARRAY[
    -- PDF
    'application/pdf',
    -- immagini
    'image/jpeg','image/png','image/webp','image/gif',
    -- Word
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    -- Excel
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    -- PowerPoint
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
WHERE id IN ('archivio', 'media');
