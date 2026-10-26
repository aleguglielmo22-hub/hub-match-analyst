-- 0014 — Collegamenti tra sezioni: giocatore ↔ squadra, piazzato ↔ giocatore
-- (con ruolo), Cloud ↔ giocatore / piazzato / esercitazione.
-- Nessuna colonna rimossa o rinominata: il testo della squadra del giocatore resta.

-- 1) Giocatore → squadra attuale -------------------------------------------------
ALTER TABLE players
  ADD COLUMN team_attuale_id UUID REFERENCES teams(id) ON DELETE SET NULL;
CREATE INDEX idx_players_team_attuale ON players (team_attuale_id);

-- Conversione dei testi (stessa logica della 0013): maiuscole e spazi non
-- contano, le squadre mancanti vengono create. La data di modifica dei
-- giocatori non cambia (conversione tecnica).
CREATE FUNCTION pg_temp.lookup_key(t TEXT) RETURNS TEXT
  LANGUAGE sql IMMUTABLE AS $$ SELECT lower(regexp_replace(btrim(t), '\s+', ' ', 'g')) $$;
CREATE FUNCTION pg_temp.clean(t TEXT) RETURNS TEXT
  LANGUAGE sql IMMUTABLE AS $$ SELECT regexp_replace(btrim(t), '\s+', ' ', 'g') $$;

INSERT INTO teams (workspace_id, nome)
SELECT DISTINCT ON (p.workspace_id, pg_temp.lookup_key(p.squadra_attuale)) p.workspace_id, pg_temp.clean(p.squadra_attuale)
FROM players p
WHERE nullif(btrim(p.squadra_attuale), '') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM teams tm
    WHERE tm.workspace_id = p.workspace_id AND pg_temp.lookup_key(tm.nome) = pg_temp.lookup_key(p.squadra_attuale)
  )
ON CONFLICT DO NOTHING;

ALTER TABLE players DISABLE TRIGGER trg_players_updated_at;
UPDATE players p SET team_attuale_id = (
  SELECT tm.id FROM teams tm
  WHERE tm.workspace_id = p.workspace_id AND pg_temp.lookup_key(tm.nome) = pg_temp.lookup_key(p.squadra_attuale)
  ORDER BY tm.created_at LIMIT 1)
WHERE nullif(btrim(p.squadra_attuale), '') IS NOT NULL;
ALTER TABLE players ENABLE TRIGGER trg_players_updated_at;

-- "Unisci anagrafiche" sposta anche la squadra attuale dei giocatori.
CREATE OR REPLACE FUNCTION merge_lookup(p_kind TEXT, p_source UUID, p_target UUID)
RETURNS JSONB AS $$
DECLARE
  ws_source UUID;
  ws_target UUID;
  target_name TEXT;
  n_cloud INT := 0;
  n_sp INT := 0;
  n_obs INT := 0;
  n_prefs INT := 0;
  n_players INT := 0;
  n INT;
BEGIN
  IF p_source = p_target THEN
    RAISE EXCEPTION 'Scegli due anagrafiche diverse';
  END IF;

  IF p_kind = 'team' THEN
    SELECT workspace_id INTO ws_source FROM teams WHERE id = p_source;
    SELECT workspace_id, nome INTO ws_target, target_name FROM teams WHERE id = p_target;
  ELSIF p_kind = 'competition' THEN
    SELECT workspace_id INTO ws_source FROM competitions WHERE id = p_source;
    SELECT workspace_id, nome INTO ws_target, target_name FROM competitions WHERE id = p_target;
  ELSIF p_kind = 'season' THEN
    SELECT workspace_id INTO ws_source FROM seasons WHERE id = p_source;
    SELECT workspace_id, label INTO ws_target, target_name FROM seasons WHERE id = p_target;
  ELSE
    RAISE EXCEPTION 'Tipo di anagrafica non valido';
  END IF;

  IF ws_source IS NULL OR ws_target IS NULL OR ws_source <> ws_target
     OR ws_source NOT IN (SELECT current_user_owned_workspaces()) THEN
    RAISE EXCEPTION 'Anagrafiche non trovate o non hai i permessi (solo il proprietario del workspace)';
  END IF;

  PERFORM set_config('app.keep_updated_at', 'on', true);

  IF p_kind = 'team' THEN
    UPDATE archive_items SET team_principale_id = CASE WHEN team_avversario_id = p_target THEN NULL ELSE p_target END
      WHERE team_principale_id = p_source;
    GET DIAGNOSTICS n = ROW_COUNT; n_cloud := n_cloud + n;
    UPDATE archive_items SET team_avversario_id = CASE WHEN team_principale_id = p_target THEN NULL ELSE p_target END
      WHERE team_avversario_id = p_source;
    GET DIAGNOSTICS n = ROW_COUNT; n_cloud := n_cloud + n;

    UPDATE set_pieces SET team_esecutrice_id = CASE WHEN team_avversaria_id = p_target THEN NULL ELSE p_target END
      WHERE team_esecutrice_id = p_source;
    GET DIAGNOSTICS n = ROW_COUNT; n_sp := n_sp + n;
    UPDATE set_pieces SET team_avversaria_id = CASE WHEN team_esecutrice_id = p_target THEN NULL ELSE p_target END
      WHERE team_avversaria_id = p_source;
    GET DIAGNOSTICS n = ROW_COUNT; n_sp := n_sp + n;
    UPDATE set_pieces SET squadra_esecutrice = target_name WHERE team_esecutrice_id = p_target;
    UPDATE set_pieces SET squadra_avversaria = target_name WHERE team_avversaria_id = p_target;

    UPDATE player_observations SET team_casa_id = CASE WHEN team_ospite_id = p_target THEN NULL ELSE p_target END
      WHERE team_casa_id = p_source;
    GET DIAGNOSTICS n = ROW_COUNT; n_obs := n_obs + n;
    UPDATE player_observations SET team_ospite_id = CASE WHEN team_casa_id = p_target THEN NULL ELSE p_target END
      WHERE team_ospite_id = p_source;
    GET DIAGNOSTICS n = ROW_COUNT; n_obs := n_obs + n;

    UPDATE players SET team_attuale_id = p_target, squadra_attuale = target_name
      WHERE team_attuale_id = p_source;
    GET DIAGNOSTICS n_players = ROW_COUNT;

    UPDATE user_preferences SET my_team_id = p_target WHERE my_team_id = p_source;
    GET DIAGNOSTICS n_prefs = ROW_COUNT;
    DELETE FROM teams WHERE id = p_source;

  ELSIF p_kind = 'competition' THEN
    UPDATE archive_items SET competition_id = p_target WHERE competition_id = p_source;
    GET DIAGNOSTICS n_cloud = ROW_COUNT;
    UPDATE set_pieces SET competition_id = p_target, competizione = target_name WHERE competition_id = p_source;
    GET DIAGNOSTICS n_sp = ROW_COUNT;
    UPDATE player_observations SET competition_id = p_target WHERE competition_id = p_source;
    GET DIAGNOSTICS n_obs = ROW_COUNT;
    UPDATE user_preferences SET main_competition_id = p_target WHERE main_competition_id = p_source;
    GET DIAGNOSTICS n_prefs = ROW_COUNT;
    DELETE FROM competitions WHERE id = p_source;

  ELSE
    UPDATE archive_items SET season_id = p_target WHERE season_id = p_source;
    GET DIAGNOSTICS n_cloud = ROW_COUNT;
    UPDATE set_pieces SET season_id = p_target, stagione = target_name WHERE season_id = p_source;
    GET DIAGNOSTICS n_sp = ROW_COUNT;
    UPDATE user_preferences SET current_season_id = p_target WHERE current_season_id = p_source;
    GET DIAGNOSTICS n_prefs = ROW_COUNT;
    DELETE FROM seasons WHERE id = p_source;
  END IF;

  PERFORM set_config('app.keep_updated_at', 'off', true);
  RETURN jsonb_build_object('cloud', n_cloud, 'set_pieces', n_sp, 'osservazioni', n_obs, 'giocatori', n_players, 'preferenze', n_prefs);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Eseguibile solo da utenti autenticati (il controllo owner è nella funzione).
REVOKE EXECUTE ON FUNCTION merge_lookup(TEXT, UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION merge_lookup(TEXT, UUID, UUID) TO authenticated;

-- 2) Piazzato ↔ giocatore, con ruolo ---------------------------------------------
CREATE TYPE sp_ruolo_giocatore_enum AS ENUM (
  -- offensivi
  'BATTITORE','BERSAGLIO','BLOCCO','SECONDO_PALO','FINALIZZATORE',
  -- difensivi
  'MARCATORE','ZONA','PALO','BARRIERA','UOMO_RIPARTENZA',
  'ALTRO'
);

CREATE TABLE set_piece_players (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  set_piece_id  UUID NOT NULL REFERENCES set_pieces(id) ON DELETE CASCADE,
  player_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  ruolo         sp_ruolo_giocatore_enum NOT NULL DEFAULT 'ALTRO',
  created_by    UUID NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (set_piece_id, player_id, ruolo)
);
CREATE INDEX idx_spp_player ON set_piece_players (player_id);

ALTER TABLE set_piece_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "set_piece_players_select_workspace" ON set_piece_players
  FOR SELECT USING (
    set_piece_id IN (SELECT id FROM set_pieces WHERE workspace_id IN (SELECT current_user_workspaces()))
  );

-- Modifica: owner, o chi ha creato uno dei due elementi collegati (stesso workspace).
CREATE POLICY "set_piece_players_insert_editors" ON set_piece_players
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM set_pieces a JOIN players b ON b.workspace_id = a.workspace_id
      WHERE a.id = set_piece_players.set_piece_id AND b.id = set_piece_players.player_id
        AND a.workspace_id IN (SELECT current_user_workspaces())
        AND (a.workspace_id IN (SELECT current_user_owned_workspaces())
             OR a.created_by = auth.uid() OR b.created_by = auth.uid())
    )
  );

CREATE POLICY "set_piece_players_update_editors" ON set_piece_players
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM set_pieces a JOIN players b ON b.workspace_id = a.workspace_id
      WHERE a.id = set_piece_players.set_piece_id AND b.id = set_piece_players.player_id
        AND a.workspace_id IN (SELECT current_user_workspaces())
        AND (a.workspace_id IN (SELECT current_user_owned_workspaces())
             OR a.created_by = auth.uid() OR b.created_by = auth.uid())
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM set_pieces a JOIN players b ON b.workspace_id = a.workspace_id
      WHERE a.id = set_piece_players.set_piece_id AND b.id = set_piece_players.player_id
        AND a.workspace_id IN (SELECT current_user_workspaces())
        AND (a.workspace_id IN (SELECT current_user_owned_workspaces())
             OR a.created_by = auth.uid() OR b.created_by = auth.uid())
    )
  );

CREATE POLICY "set_piece_players_delete_editors" ON set_piece_players
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM set_pieces a JOIN players b ON b.workspace_id = a.workspace_id
      WHERE a.id = set_piece_players.set_piece_id AND b.id = set_piece_players.player_id
        AND a.workspace_id IN (SELECT current_user_workspaces())
        AND (a.workspace_id IN (SELECT current_user_owned_workspaces())
             OR a.created_by = auth.uid() OR b.created_by = auth.uid())
    )
  );

-- 3) Cloud ↔ giocatore / piazzato / esercitazione -------------------------------
CREATE TABLE archive_item_players (
  archive_item_id  UUID NOT NULL REFERENCES archive_items(id) ON DELETE CASCADE,
  player_id        UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_by       UUID NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (archive_item_id, player_id)
);
CREATE INDEX idx_aip_player ON archive_item_players (player_id);

ALTER TABLE archive_item_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "archive_item_players_select_workspace" ON archive_item_players
  FOR SELECT USING (
    archive_item_id IN (SELECT id FROM archive_items WHERE workspace_id IN (SELECT current_user_workspaces()))
  );

-- Modifica: owner, o chi ha creato uno dei due elementi collegati (stesso workspace).
CREATE POLICY "archive_item_players_insert_editors" ON archive_item_players
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM archive_items a JOIN players b ON b.workspace_id = a.workspace_id
      WHERE a.id = archive_item_players.archive_item_id AND b.id = archive_item_players.player_id
        AND a.workspace_id IN (SELECT current_user_workspaces())
        AND (a.workspace_id IN (SELECT current_user_owned_workspaces())
             OR a.created_by = auth.uid() OR b.created_by = auth.uid())
    )
  );

CREATE POLICY "archive_item_players_update_editors" ON archive_item_players
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM archive_items a JOIN players b ON b.workspace_id = a.workspace_id
      WHERE a.id = archive_item_players.archive_item_id AND b.id = archive_item_players.player_id
        AND a.workspace_id IN (SELECT current_user_workspaces())
        AND (a.workspace_id IN (SELECT current_user_owned_workspaces())
             OR a.created_by = auth.uid() OR b.created_by = auth.uid())
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM archive_items a JOIN players b ON b.workspace_id = a.workspace_id
      WHERE a.id = archive_item_players.archive_item_id AND b.id = archive_item_players.player_id
        AND a.workspace_id IN (SELECT current_user_workspaces())
        AND (a.workspace_id IN (SELECT current_user_owned_workspaces())
             OR a.created_by = auth.uid() OR b.created_by = auth.uid())
    )
  );

CREATE POLICY "archive_item_players_delete_editors" ON archive_item_players
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM archive_items a JOIN players b ON b.workspace_id = a.workspace_id
      WHERE a.id = archive_item_players.archive_item_id AND b.id = archive_item_players.player_id
        AND a.workspace_id IN (SELECT current_user_workspaces())
        AND (a.workspace_id IN (SELECT current_user_owned_workspaces())
             OR a.created_by = auth.uid() OR b.created_by = auth.uid())
    )
  );

CREATE TABLE archive_item_set_pieces (
  archive_item_id  UUID NOT NULL REFERENCES archive_items(id) ON DELETE CASCADE,
  set_piece_id     UUID NOT NULL REFERENCES set_pieces(id) ON DELETE CASCADE,
  created_by       UUID NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (archive_item_id, set_piece_id)
);
CREATE INDEX idx_aisp_set_piece ON archive_item_set_pieces (set_piece_id);

ALTER TABLE archive_item_set_pieces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "archive_item_set_pieces_select_workspace" ON archive_item_set_pieces
  FOR SELECT USING (
    archive_item_id IN (SELECT id FROM archive_items WHERE workspace_id IN (SELECT current_user_workspaces()))
  );

-- Modifica: owner, o chi ha creato uno dei due elementi collegati (stesso workspace).
CREATE POLICY "archive_item_set_pieces_insert_editors" ON archive_item_set_pieces
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM archive_items a JOIN set_pieces b ON b.workspace_id = a.workspace_id
      WHERE a.id = archive_item_set_pieces.archive_item_id AND b.id = archive_item_set_pieces.set_piece_id
        AND a.workspace_id IN (SELECT current_user_workspaces())
        AND (a.workspace_id IN (SELECT current_user_owned_workspaces())
             OR a.created_by = auth.uid() OR b.created_by = auth.uid())
    )
  );

CREATE POLICY "archive_item_set_pieces_update_editors" ON archive_item_set_pieces
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM archive_items a JOIN set_pieces b ON b.workspace_id = a.workspace_id
      WHERE a.id = archive_item_set_pieces.archive_item_id AND b.id = archive_item_set_pieces.set_piece_id
        AND a.workspace_id IN (SELECT current_user_workspaces())
        AND (a.workspace_id IN (SELECT current_user_owned_workspaces())
             OR a.created_by = auth.uid() OR b.created_by = auth.uid())
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM archive_items a JOIN set_pieces b ON b.workspace_id = a.workspace_id
      WHERE a.id = archive_item_set_pieces.archive_item_id AND b.id = archive_item_set_pieces.set_piece_id
        AND a.workspace_id IN (SELECT current_user_workspaces())
        AND (a.workspace_id IN (SELECT current_user_owned_workspaces())
             OR a.created_by = auth.uid() OR b.created_by = auth.uid())
    )
  );

CREATE POLICY "archive_item_set_pieces_delete_editors" ON archive_item_set_pieces
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM archive_items a JOIN set_pieces b ON b.workspace_id = a.workspace_id
      WHERE a.id = archive_item_set_pieces.archive_item_id AND b.id = archive_item_set_pieces.set_piece_id
        AND a.workspace_id IN (SELECT current_user_workspaces())
        AND (a.workspace_id IN (SELECT current_user_owned_workspaces())
             OR a.created_by = auth.uid() OR b.created_by = auth.uid())
    )
  );

CREATE TABLE archive_item_situational (
  archive_item_id  UUID NOT NULL REFERENCES archive_items(id) ON DELETE CASCADE,
  situational_id   UUID NOT NULL REFERENCES situational_tactics(id) ON DELETE CASCADE,
  created_by       UUID NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (archive_item_id, situational_id)
);
CREATE INDEX idx_ais_situational ON archive_item_situational (situational_id);

ALTER TABLE archive_item_situational ENABLE ROW LEVEL SECURITY;

CREATE POLICY "archive_item_situational_select_workspace" ON archive_item_situational
  FOR SELECT USING (
    archive_item_id IN (SELECT id FROM archive_items WHERE workspace_id IN (SELECT current_user_workspaces()))
  );

-- Modifica: owner, o chi ha creato uno dei due elementi collegati (stesso workspace).
CREATE POLICY "archive_item_situational_insert_editors" ON archive_item_situational
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM archive_items a JOIN situational_tactics b ON b.workspace_id = a.workspace_id
      WHERE a.id = archive_item_situational.archive_item_id AND b.id = archive_item_situational.situational_id
        AND a.workspace_id IN (SELECT current_user_workspaces())
        AND (a.workspace_id IN (SELECT current_user_owned_workspaces())
             OR a.created_by = auth.uid() OR b.created_by = auth.uid())
    )
  );

CREATE POLICY "archive_item_situational_update_editors" ON archive_item_situational
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM archive_items a JOIN situational_tactics b ON b.workspace_id = a.workspace_id
      WHERE a.id = archive_item_situational.archive_item_id AND b.id = archive_item_situational.situational_id
        AND a.workspace_id IN (SELECT current_user_workspaces())
        AND (a.workspace_id IN (SELECT current_user_owned_workspaces())
             OR a.created_by = auth.uid() OR b.created_by = auth.uid())
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM archive_items a JOIN situational_tactics b ON b.workspace_id = a.workspace_id
      WHERE a.id = archive_item_situational.archive_item_id AND b.id = archive_item_situational.situational_id
        AND a.workspace_id IN (SELECT current_user_workspaces())
        AND (a.workspace_id IN (SELECT current_user_owned_workspaces())
             OR a.created_by = auth.uid() OR b.created_by = auth.uid())
    )
  );

CREATE POLICY "archive_item_situational_delete_editors" ON archive_item_situational
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM archive_items a JOIN situational_tactics b ON b.workspace_id = a.workspace_id
      WHERE a.id = archive_item_situational.archive_item_id AND b.id = archive_item_situational.situational_id
        AND a.workspace_id IN (SELECT current_user_workspaces())
        AND (a.workspace_id IN (SELECT current_user_owned_workspaces())
             OR a.created_by = auth.uid() OR b.created_by = auth.uid())
    )
  );
