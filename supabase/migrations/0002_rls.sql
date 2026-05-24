-- ============================================================
-- HUB MATCH ANALYST — Row Level Security
-- Policy complete per tutte le tabelle dell'archivio.
-- ============================================================

-- Abilita RLS su tutte le tabelle
ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces          ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams               ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons             ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags                ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive_files       ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive_item_tags   ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER: workspace di cui l'utente corrente è membro attivo
-- ============================================================
CREATE OR REPLACE FUNCTION current_user_workspaces() RETURNS SETOF UUID AS $$
  SELECT workspace_id FROM workspace_members
  WHERE user_id = auth.uid() AND status = 'ACTIVE';
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ============================================================
-- HELPER: workspace di cui l'utente corrente è OWNER
-- ============================================================
CREATE OR REPLACE FUNCTION current_user_owned_workspaces() RETURNS SETOF UUID AS $$
  SELECT id FROM workspaces WHERE owner_id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ============================================================
-- PROFILES
-- Un utente vede: se stesso + profili dei colleghi di workspace.
-- ============================================================
CREATE POLICY "profiles_select_self_or_workmate" ON profiles
  FOR SELECT USING (
    id = auth.uid()
    OR id IN (
      SELECT user_id FROM workspace_members
      WHERE workspace_id IN (SELECT current_user_workspaces())
        AND status = 'ACTIVE' AND user_id IS NOT NULL
    )
  );

CREATE POLICY "profiles_update_self" ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- INSERT/DELETE su profiles sono gestiti dal trigger handle_new_user (SECURITY DEFINER).

-- ============================================================
-- WORKSPACES
-- ============================================================
CREATE POLICY "workspaces_select_members" ON workspaces
  FOR SELECT USING (id IN (SELECT current_user_workspaces()));

CREATE POLICY "workspaces_update_owner" ON workspaces
  FOR UPDATE USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "workspaces_delete_owner" ON workspaces
  FOR DELETE USING (owner_id = auth.uid());

-- INSERT su workspaces è gestito dal trigger handle_new_user.

-- ============================================================
-- WORKSPACE_MEMBERS
-- L'owner gestisce inviti. I membri possono vedere la lista del proprio workspace.
-- ============================================================
CREATE POLICY "members_select_same_workspace" ON workspace_members
  FOR SELECT USING (workspace_id IN (SELECT current_user_workspaces()));

CREATE POLICY "members_insert_owner" ON workspace_members
  FOR INSERT WITH CHECK (workspace_id IN (SELECT current_user_owned_workspaces()));

CREATE POLICY "members_update_owner" ON workspace_members
  FOR UPDATE USING (workspace_id IN (SELECT current_user_owned_workspaces()))
  WITH CHECK (workspace_id IN (SELECT current_user_owned_workspaces()));

CREATE POLICY "members_delete_owner" ON workspace_members
  FOR DELETE USING (workspace_id IN (SELECT current_user_owned_workspaces()));

-- ============================================================
-- LOOKUP CONDIVISE: teams, competitions, seasons, tags
-- Tutti i membri leggono e creano (autocomplete + crea inline dal form).
-- Solo l'OWNER può eliminare voci di lookup (sono condivise tra collaboratori).
-- ============================================================

-- TEAMS
CREATE POLICY "teams_select_workspace" ON teams
  FOR SELECT USING (workspace_id IN (SELECT current_user_workspaces()));
CREATE POLICY "teams_insert_workspace" ON teams
  FOR INSERT WITH CHECK (workspace_id IN (SELECT current_user_workspaces()));
CREATE POLICY "teams_update_workspace" ON teams
  FOR UPDATE USING (workspace_id IN (SELECT current_user_workspaces()))
  WITH CHECK (workspace_id IN (SELECT current_user_workspaces()));
CREATE POLICY "teams_delete_owner" ON teams
  FOR DELETE USING (workspace_id IN (SELECT current_user_owned_workspaces()));

-- COMPETITIONS
CREATE POLICY "competitions_select_workspace" ON competitions
  FOR SELECT USING (workspace_id IN (SELECT current_user_workspaces()));
CREATE POLICY "competitions_insert_workspace" ON competitions
  FOR INSERT WITH CHECK (workspace_id IN (SELECT current_user_workspaces()));
CREATE POLICY "competitions_update_workspace" ON competitions
  FOR UPDATE USING (workspace_id IN (SELECT current_user_workspaces()))
  WITH CHECK (workspace_id IN (SELECT current_user_workspaces()));
CREATE POLICY "competitions_delete_owner" ON competitions
  FOR DELETE USING (workspace_id IN (SELECT current_user_owned_workspaces()));

-- SEASONS
CREATE POLICY "seasons_select_workspace" ON seasons
  FOR SELECT USING (workspace_id IN (SELECT current_user_workspaces()));
CREATE POLICY "seasons_insert_workspace" ON seasons
  FOR INSERT WITH CHECK (workspace_id IN (SELECT current_user_workspaces()));
CREATE POLICY "seasons_update_workspace" ON seasons
  FOR UPDATE USING (workspace_id IN (SELECT current_user_workspaces()))
  WITH CHECK (workspace_id IN (SELECT current_user_workspaces()));
CREATE POLICY "seasons_delete_owner" ON seasons
  FOR DELETE USING (workspace_id IN (SELECT current_user_owned_workspaces()));

-- TAGS
CREATE POLICY "tags_select_workspace" ON tags
  FOR SELECT USING (workspace_id IN (SELECT current_user_workspaces()));
CREATE POLICY "tags_insert_workspace" ON tags
  FOR INSERT WITH CHECK (workspace_id IN (SELECT current_user_workspaces()));
CREATE POLICY "tags_update_workspace" ON tags
  FOR UPDATE USING (workspace_id IN (SELECT current_user_workspaces()))
  WITH CHECK (workspace_id IN (SELECT current_user_workspaces()));
CREATE POLICY "tags_delete_owner" ON tags
  FOR DELETE USING (workspace_id IN (SELECT current_user_owned_workspaces()));

-- ============================================================
-- ARCHIVE_ITEMS
-- ============================================================
CREATE POLICY "archive_items_select_workspace" ON archive_items
  FOR SELECT USING (workspace_id IN (SELECT current_user_workspaces()));

CREATE POLICY "archive_items_insert_workspace" ON archive_items
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT current_user_workspaces())
    AND created_by = auth.uid()
  );

-- Update: solo l'owner del workspace, o il creatore della voce
CREATE POLICY "archive_items_update_owner_or_creator" ON archive_items
  FOR UPDATE USING (
    workspace_id IN (SELECT current_user_owned_workspaces())
    OR created_by = auth.uid()
  )
  WITH CHECK (
    workspace_id IN (SELECT current_user_owned_workspaces())
    OR created_by = auth.uid()
  );

-- Hard delete: solo owner del workspace.
-- Il "Sposta nel cestino" è un UPDATE (deleted_at = NOW()), quindi segue la policy update.
CREATE POLICY "archive_items_delete_owner" ON archive_items
  FOR DELETE USING (workspace_id IN (SELECT current_user_owned_workspaces()));

-- ============================================================
-- ARCHIVE_FILES — permessi legati al parent archive_item
-- ============================================================
CREATE POLICY "archive_files_select_via_parent" ON archive_files
  FOR SELECT USING (
    archive_item_id IN (
      SELECT id FROM archive_items
      WHERE workspace_id IN (SELECT current_user_workspaces())
    )
  );

CREATE POLICY "archive_files_insert_via_parent" ON archive_files
  FOR INSERT WITH CHECK (
    archive_item_id IN (
      SELECT id FROM archive_items
      WHERE workspace_id IN (SELECT current_user_owned_workspaces())
         OR created_by = auth.uid()
    )
  );

CREATE POLICY "archive_files_update_via_parent" ON archive_files
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

CREATE POLICY "archive_files_delete_via_parent" ON archive_files
  FOR DELETE USING (
    archive_item_id IN (
      SELECT id FROM archive_items
      WHERE workspace_id IN (SELECT current_user_owned_workspaces())
         OR created_by = auth.uid()
    )
  );

-- ============================================================
-- ARCHIVE_ITEM_TAGS — permessi legati al parent archive_item
-- ============================================================
CREATE POLICY "archive_item_tags_select_via_parent" ON archive_item_tags
  FOR SELECT USING (
    archive_item_id IN (
      SELECT id FROM archive_items
      WHERE workspace_id IN (SELECT current_user_workspaces())
    )
  );

CREATE POLICY "archive_item_tags_insert_via_parent" ON archive_item_tags
  FOR INSERT WITH CHECK (
    archive_item_id IN (
      SELECT id FROM archive_items
      WHERE workspace_id IN (SELECT current_user_owned_workspaces())
         OR created_by = auth.uid()
    )
  );

CREATE POLICY "archive_item_tags_delete_via_parent" ON archive_item_tags
  FOR DELETE USING (
    archive_item_id IN (
      SELECT id FROM archive_items
      WHERE workspace_id IN (SELECT current_user_owned_workspaces())
         OR created_by = auth.uid()
    )
  );
