-- 0010 — Allegati generici (file reali) per Scouting / Set Pieces / Training
-- Sistema speculare al Cloud (archivio): storage PRIVATO + record in tabella,
-- esposizione via signed URL lato app. I campi-link esistenti restano.
--
-- Tabella polimorfica `attachments` (entity_type + entity_id) e bucket "media".
-- Convenzione path: {workspace_id}/{entity_type}/{entity_id}/{uuid}-{file_name_slug}

-- 1) Tabella -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attachments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by      UUID NOT NULL REFERENCES profiles(id),
  entity_type     TEXT NOT NULL CHECK (entity_type IN ('player', 'set_piece', 'situational')),
  entity_id       UUID NOT NULL,
  file_name       TEXT NOT NULL,
  file_path       TEXT NOT NULL UNIQUE,
  file_size_bytes BIGINT,
  mime_type       TEXT,
  posizione       INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS attachments_entity_idx
  ON attachments (workspace_id, entity_type, entity_id, posizione);

-- 2) RLS sulla tabella -------------------------------------------------------
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attachments_select_workspace" ON attachments
  FOR SELECT USING (workspace_id IN (SELECT current_user_workspaces()));

CREATE POLICY "attachments_insert_workspace" ON attachments
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT current_user_workspaces())
    AND created_by = auth.uid()
  );

-- Cancellazione: owner del workspace oppure creatore dell'allegato.
CREATE POLICY "attachments_delete_owner_or_creator" ON attachments
  FOR DELETE USING (
    workspace_id IN (SELECT current_user_owned_workspaces())
    OR created_by = auth.uid()
  );

-- 3) Bucket "media" (privato) -----------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  false,
  524288000,  -- 500 MB
  ARRAY[
    'video/mp4','video/quicktime','video/webm','video/x-msvideo','video/mpeg','video/x-m4v',
    'application/pdf',
    'image/jpeg','image/png','image/webp','image/gif',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 4) Policy storage.objects per il bucket "media" ---------------------------
-- La cartella di primo livello è il workspace_id: i membri attivi gestiscono i
-- file del proprio workspace. La cancellazione fine (owner/creatore) è applicata
-- dalla RLS della tabella attachments, attraverso cui passa l'app.
CREATE POLICY "media_select_workspace_members" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'media'
    AND (storage.foldername(name))[1]::uuid IN (SELECT current_user_workspaces())
  );

CREATE POLICY "media_insert_workspace_members" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'media'
    AND (storage.foldername(name))[1]::uuid IN (SELECT current_user_workspaces())
  );

CREATE POLICY "media_update_workspace_members" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'media'
    AND (storage.foldername(name))[1]::uuid IN (SELECT current_user_workspaces())
  );

CREATE POLICY "media_delete_workspace_members" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'media'
    AND (storage.foldername(name))[1]::uuid IN (SELECT current_user_workspaces())
  );
