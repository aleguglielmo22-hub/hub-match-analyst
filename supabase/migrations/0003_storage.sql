-- ============================================================
-- HUB MATCH ANALYST — Storage bucket "archivio"
-- Bucket privato (signed URL via app), limite 500 MB per file.
-- Convenzione path: {workspace_id}/{archive_item_id}/{uuid}-{file_name_slug}
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'archivio',
  'archivio',
  false,
  524288000,  -- 500 MB
  ARRAY[
    -- video
    'video/mp4','video/quicktime','video/webm','video/x-msvideo','video/mpeg','video/x-m4v',
    -- documenti
    'application/pdf',
    -- immagini (per thumb / report)
    'image/jpeg','image/png','image/webp','image/gif',
    -- excel
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    -- powerpoint / keynote-export
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================
-- POLICY su storage.objects per il bucket "archivio"
-- ============================================================

-- SELECT: tutti i membri attivi del workspace possono leggere i file della propria cartella.
CREATE POLICY "archivio_select_workspace_members" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'archivio'
    AND (storage.foldername(name))[1]::uuid IN (SELECT current_user_workspaces())
  );

-- INSERT: tutti i membri attivi possono caricare file nella cartella del proprio workspace.
CREATE POLICY "archivio_insert_workspace_members" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'archivio'
    AND (storage.foldername(name))[1]::uuid IN (SELECT current_user_workspaces())
  );

-- UPDATE/DELETE: solo se l'utente può modificare anche il parent archive_item
-- (owner del workspace oppure creatore della voce).
CREATE POLICY "archivio_update_owner_or_creator" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'archivio'
    AND (storage.foldername(name))[1]::uuid IN (SELECT current_user_workspaces())
    AND EXISTS (
      SELECT 1 FROM archive_items ai
      WHERE ai.id = (storage.foldername(name))[2]::uuid
        AND (
          ai.workspace_id IN (SELECT current_user_owned_workspaces())
          OR ai.created_by = auth.uid()
        )
    )
  );

CREATE POLICY "archivio_delete_owner_or_creator" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'archivio'
    AND (storage.foldername(name))[1]::uuid IN (SELECT current_user_workspaces())
    AND EXISTS (
      SELECT 1 FROM archive_items ai
      WHERE ai.id = (storage.foldername(name))[2]::uuid
        AND (
          ai.workspace_id IN (SELECT current_user_owned_workspaces())
          OR ai.created_by = auth.uid()
        )
    )
  );
