-- 0018 — AG Tag (programma desktop di video analisi): fondamenta dei dati.
-- Nel database solo metadati: i video restano sul disco del Mac.
-- Tabelle con prefisso tag_. Nessun dato esistente modificato.
--
-- Codici stabili: eventi e sottotag salvano un CODICE (es. "att_posizionale"),
-- mai il testo mostrato. Le definizioni (nome visibile, tag speculare, gruppo
-- del sottotag) stanno in tag_codes e tag_label_codes: rinominare un tag cambia
-- solo il nome, gli eventi già salvati restano validi. I pannelli della Fase 2
-- (tag_panels, tag_panel_buttons: disposizione, colori, scorciatoie) faranno
-- riferimento a questi stessi codici.
--
-- Stesso spazio di lavoro garantito dal database: le tabelle figlie si legano
-- alla madre con la coppia (id, workspace_id).

-- 1) Definizioni dei tag principali -------------------------------------------
CREATE TABLE tag_codes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  code          TEXT NOT NULL CHECK (code ~ '^[a-z0-9_]{1,40}$'),
  nome          TEXT NOT NULL CHECK (btrim(nome) <> '' AND length(nome) <= 80),
  -- Tag che lo stesso evento rappresenta per la squadra avversaria (codifica speculare).
  mirror_code   TEXT,
  created_by    UUID NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, code),
  FOREIGN KEY (workspace_id, mirror_code) REFERENCES tag_codes (workspace_id, code)
    ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED
);

-- 2) Definizioni dei sottotag (zona, esito, …), raggruppati per categoria -------
CREATE TABLE tag_label_codes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  code          TEXT NOT NULL CHECK (code ~ '^[a-z0-9_]{1,40}$'),
  gruppo        TEXT NOT NULL CHECK (gruppo ~ '^[a-z0-9_]{1,40}$'), -- es. zona, esito
  nome          TEXT NOT NULL CHECK (btrim(nome) <> '' AND length(nome) <= 80),
  created_by    UUID NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, code)
);

-- 3) Partite --------------------------------------------------------------------
CREATE TABLE tag_matches (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id       UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by         UUID NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ,
  titolo             TEXT CHECK (titolo IS NULL OR length(titolo) <= 200),
  data_partita       DATE,
  home_team_id       UUID REFERENCES teams(id) ON DELETE SET NULL,
  away_team_id       UUID REFERENCES teams(id) ON DELETE SET NULL,
  preferred_team_id  UUID REFERENCES teams(id) ON DELETE SET NULL,
  competition_id     UUID REFERENCES competitions(id) ON DELETE SET NULL,
  season_id          UUID REFERENCES seasons(id) ON DELETE SET NULL,
  -- File video (solo metadati: il file resta sul Mac)
  video_file_name    TEXT NOT NULL CHECK (length(video_file_name) <= 255),
  video_path         TEXT CHECK (video_path IS NULL OR length(video_path) <= 2048), -- ultimo percorso noto
  video_size_bytes   BIGINT NOT NULL CHECK (video_size_bytes > 0),
  video_fingerprint  TEXT NOT NULL CHECK (video_fingerprint ~ '^[0-9a-f]{64}$'), -- SHA-256 di dimensione + 3 blocchi
  duration_ms        INTEGER CHECK (duration_ms IS NULL OR duration_ms >= 0),
  fps                NUMERIC(8,3) CHECK (fps IS NULL OR fps > 0),
  width              INTEGER CHECK (width IS NULL OR width > 0),
  height             INTEGER CHECK (height IS NULL OR height > 0),
  video_codec        TEXT CHECK (video_codec IS NULL OR length(video_codec) <= 40),
  audio_codec        TEXT CHECK (audio_codec IS NULL OR length(audio_codec) <= 40),
  container          TEXT CHECK (container IS NULL OR length(container) <= 80),
  CHECK (home_team_id IS NULL OR away_team_id IS NULL OR home_team_id <> away_team_id),
  -- La squadra preferita è una delle due in campo.
  CHECK (preferred_team_id IS NULL OR preferred_team_id = home_team_id OR preferred_team_id = away_team_id),
  UNIQUE (id, workspace_id)
);
CREATE INDEX tag_matches_list_idx ON tag_matches (workspace_id, data_partita DESC NULLS LAST);
CREATE INDEX tag_matches_fingerprint_idx ON tag_matches (workspace_id, video_fingerprint);

-- 4) Eventi codificati (usati dalla Fase 2) ---------------------------------------
-- Un solo evento per azione: la versione speculare per l'altra squadra si ricava
-- dal tag (tag_codes.mirror_code) nella vista tag_events_view.
CREATE TABLE tag_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL,
  match_id      UUID NOT NULL,
  start_ms      INTEGER NOT NULL CHECK (start_ms >= 0),
  end_ms        INTEGER NOT NULL,
  side          TEXT NOT NULL CHECK (side IN ('home', 'away')), -- squadra protagonista
  tag_code      TEXT NOT NULL,
  nota          TEXT CHECK (nota IS NULL OR length(nota) <= 2000),
  stella        BOOLEAN NOT NULL DEFAULT false, -- azione di rilievo
  created_by    UUID NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_ms >= start_ms),
  UNIQUE (id, workspace_id),
  FOREIGN KEY (match_id, workspace_id) REFERENCES tag_matches (id, workspace_id) ON DELETE CASCADE,
  -- Un tag in uso non si può eliminare (si rinomina soltanto).
  FOREIGN KEY (workspace_id, tag_code) REFERENCES tag_codes (workspace_id, code) ON UPDATE CASCADE
);
CREATE INDEX tag_events_match_idx ON tag_events (match_id, start_ms);
CREATE INDEX tag_events_tag_idx ON tag_events (workspace_id, tag_code);

-- 5) Sottotag di un evento: più di uno per evento (zona, esito, …) -------------
-- Tabella e non array: filtri e statistiche diventano join e GROUP BY su un
-- indice, ogni codice è verificato dal database e un gruppo di sottotag si può
-- aggiungere senza cambiare la tabella degli eventi.
CREATE TABLE tag_event_labels (
  event_id      UUID NOT NULL,
  workspace_id  UUID NOT NULL,
  label_code    TEXT NOT NULL,
  PRIMARY KEY (event_id, label_code),
  FOREIGN KEY (event_id, workspace_id) REFERENCES tag_events (id, workspace_id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, label_code) REFERENCES tag_label_codes (workspace_id, code) ON UPDATE CASCADE
);
CREATE INDEX tag_event_labels_code_idx ON tag_event_labels (workspace_id, label_code);

-- 6) Giocatori coinvolti in un evento (giocatori dello Scouting di AG Workspace) -
CREATE TABLE tag_event_players (
  event_id      UUID NOT NULL,
  workspace_id  UUID NOT NULL,
  player_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, player_id),
  FOREIGN KEY (event_id, workspace_id) REFERENCES tag_events (id, workspace_id) ON DELETE CASCADE
);
CREATE INDEX tag_event_players_player_idx ON tag_event_players (player_id);

-- 7) Vista eventi con la versione speculare ----------------------------------------
-- Ogni evento compare una volta come originale (is_mirror = false) e, se il suo
-- tag ha un tag speculare, una seconda volta per l'altra squadra (is_mirror = true).
-- Le statistiche per evento contano solo is_mirror = false (o event_id distinti).
-- Per ora si rispecchia solo il tag principale: i sottotag (tag_event_labels)
-- si collegano con event_id; una futura tabella di corrispondenza dei sottotag
-- si aggancerà qui senza cambiare gli eventi salvati.
CREATE VIEW tag_events_view WITH (security_invoker = true) AS
  SELECT e.id AS event_id, false AS is_mirror, e.workspace_id, e.match_id,
         e.side, e.tag_code, e.start_ms, e.end_ms, e.nota, e.stella, e.created_by
  FROM tag_events e
  UNION ALL
  SELECT e.id, true, e.workspace_id, e.match_id,
         CASE e.side WHEN 'home' THEN 'away' ELSE 'home' END, c.mirror_code,
         e.start_ms, e.end_ms, e.nota, e.stella, e.created_by
  FROM tag_events e
  JOIN tag_codes c ON c.workspace_id = e.workspace_id AND c.code = e.tag_code
  WHERE c.mirror_code IS NOT NULL;

-- 8) Date di modifica e blocco dello spazio di lavoro --------------------------------
CREATE TRIGGER trg_tag_codes_updated_at BEFORE UPDATE ON tag_codes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_tag_label_codes_updated_at BEFORE UPDATE ON tag_label_codes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_tag_matches_updated_at BEFORE UPDATE ON tag_matches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_tag_events_updated_at BEFORE UPDATE ON tag_events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['tag_codes', 'tag_label_codes', 'tag_matches', 'tag_events', 'tag_event_labels', 'tag_event_players'] LOOP
    EXECUTE format(
      'CREATE TRIGGER lock_workspace_id BEFORE UPDATE OF workspace_id ON %I
         FOR EACH ROW EXECUTE FUNCTION prevent_workspace_change()', t);
  END LOOP;
END $$;

-- 9) Regole di accesso (RLS), come nel resto del database ----------------------------
ALTER TABLE tag_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tag_label_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tag_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE tag_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tag_event_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE tag_event_players ENABLE ROW LEVEL SECURITY;

-- Definizioni condivise (come le anagrafiche): i membri leggono, creano e
-- rinominano; elimina solo il proprietario dello spazio di lavoro.
CREATE POLICY "tag_codes_select" ON tag_codes FOR SELECT
  USING (workspace_id IN (SELECT current_user_workspaces()));
CREATE POLICY "tag_codes_insert" ON tag_codes FOR INSERT
  WITH CHECK (workspace_id IN (SELECT current_user_workspaces()) AND created_by = auth.uid());
CREATE POLICY "tag_codes_update" ON tag_codes FOR UPDATE
  USING (workspace_id IN (SELECT current_user_workspaces()))
  WITH CHECK (workspace_id IN (SELECT current_user_workspaces()));
CREATE POLICY "tag_codes_delete" ON tag_codes FOR DELETE
  USING (workspace_id IN (SELECT current_user_owned_workspaces()));

CREATE POLICY "tag_label_codes_select" ON tag_label_codes FOR SELECT
  USING (workspace_id IN (SELECT current_user_workspaces()));
CREATE POLICY "tag_label_codes_insert" ON tag_label_codes FOR INSERT
  WITH CHECK (workspace_id IN (SELECT current_user_workspaces()) AND created_by = auth.uid());
CREATE POLICY "tag_label_codes_update" ON tag_label_codes FOR UPDATE
  USING (workspace_id IN (SELECT current_user_workspaces()))
  WITH CHECK (workspace_id IN (SELECT current_user_workspaces()));
CREATE POLICY "tag_label_codes_delete" ON tag_label_codes FOR DELETE
  USING (workspace_id IN (SELECT current_user_owned_workspaces()));

-- Partite: leggono i membri; crea un membro a nome proprio; modifica ed elimina
-- il proprietario o l'autore. Squadre, competizione e stagione dello stesso spazio.
CREATE POLICY "tag_matches_select" ON tag_matches FOR SELECT
  USING (workspace_id IN (SELECT current_user_workspaces()));
CREATE POLICY "tag_matches_insert" ON tag_matches FOR INSERT
  WITH CHECK (
    workspace_id IN (SELECT current_user_workspaces()) AND created_by = auth.uid()
    AND (home_team_id IS NULL OR home_team_id IN (SELECT id FROM teams WHERE workspace_id = tag_matches.workspace_id))
    AND (away_team_id IS NULL OR away_team_id IN (SELECT id FROM teams WHERE workspace_id = tag_matches.workspace_id))
    AND (competition_id IS NULL OR competition_id IN (SELECT id FROM competitions WHERE workspace_id = tag_matches.workspace_id))
    AND (season_id IS NULL OR season_id IN (SELECT id FROM seasons WHERE workspace_id = tag_matches.workspace_id))
  );
CREATE POLICY "tag_matches_update" ON tag_matches FOR UPDATE
  USING (workspace_id IN (SELECT current_user_owned_workspaces()) OR created_by = auth.uid())
  WITH CHECK (
    (workspace_id IN (SELECT current_user_owned_workspaces()) OR created_by = auth.uid())
    AND (home_team_id IS NULL OR home_team_id IN (SELECT id FROM teams WHERE workspace_id = tag_matches.workspace_id))
    AND (away_team_id IS NULL OR away_team_id IN (SELECT id FROM teams WHERE workspace_id = tag_matches.workspace_id))
    AND (competition_id IS NULL OR competition_id IN (SELECT id FROM competitions WHERE workspace_id = tag_matches.workspace_id))
    AND (season_id IS NULL OR season_id IN (SELECT id FROM seasons WHERE workspace_id = tag_matches.workspace_id))
  );
CREATE POLICY "tag_matches_delete" ON tag_matches FOR DELETE
  USING (workspace_id IN (SELECT current_user_owned_workspaces()) OR created_by = auth.uid());

-- Eventi: stesse regole delle partite (lo spazio coincide con quello della partita
-- per la chiave (match_id, workspace_id)).
CREATE POLICY "tag_events_select" ON tag_events FOR SELECT
  USING (workspace_id IN (SELECT current_user_workspaces()));
CREATE POLICY "tag_events_insert" ON tag_events FOR INSERT
  WITH CHECK (workspace_id IN (SELECT current_user_workspaces()) AND created_by = auth.uid());
CREATE POLICY "tag_events_update" ON tag_events FOR UPDATE
  USING (workspace_id IN (SELECT current_user_owned_workspaces()) OR created_by = auth.uid())
  WITH CHECK (workspace_id IN (SELECT current_user_owned_workspaces()) OR created_by = auth.uid());
CREATE POLICY "tag_events_delete" ON tag_events FOR DELETE
  USING (workspace_id IN (SELECT current_user_owned_workspaces()) OR created_by = auth.uid());

-- Sottotag e giocatori di un evento: li gestisce chi può modificare l'evento.
CREATE POLICY "tag_event_labels_select" ON tag_event_labels FOR SELECT
  USING (workspace_id IN (SELECT current_user_workspaces()));
CREATE POLICY "tag_event_labels_insert" ON tag_event_labels FOR INSERT
  WITH CHECK (event_id IN (
    SELECT id FROM tag_events
    WHERE workspace_id IN (SELECT current_user_owned_workspaces()) OR created_by = auth.uid()));
CREATE POLICY "tag_event_labels_delete" ON tag_event_labels FOR DELETE
  USING (event_id IN (
    SELECT id FROM tag_events
    WHERE workspace_id IN (SELECT current_user_owned_workspaces()) OR created_by = auth.uid()));

CREATE POLICY "tag_event_players_select" ON tag_event_players FOR SELECT
  USING (workspace_id IN (SELECT current_user_workspaces()));
CREATE POLICY "tag_event_players_insert" ON tag_event_players FOR INSERT
  WITH CHECK (
    event_id IN (
      SELECT id FROM tag_events
      WHERE workspace_id IN (SELECT current_user_owned_workspaces()) OR created_by = auth.uid())
    AND player_id IN (SELECT id FROM players WHERE workspace_id = tag_event_players.workspace_id)
  );
CREATE POLICY "tag_event_players_delete" ON tag_event_players FOR DELETE
  USING (event_id IN (
    SELECT id FROM tag_events
    WHERE workspace_id IN (SELECT current_user_owned_workspaces()) OR created_by = auth.uid()));

-- 10) "Unisci anagrafiche" sposta anche le partite di AG Tag --------------------------
-- Stessa funzione della 0014, con le partite in più (chiave "ag_tag" nel risultato).
-- Le squadre si spostano in un'unica istruzione per riga, così la squadra
-- preferita resta sempre una delle due in campo.
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
  n_tag INT := 0;
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

    UPDATE tag_matches SET
      home_team_id = CASE WHEN home_team_id = p_source
                          THEN CASE WHEN away_team_id = p_target THEN NULL ELSE p_target END
                          ELSE home_team_id END,
      away_team_id = CASE WHEN away_team_id = p_source
                          THEN CASE WHEN home_team_id = p_target THEN NULL ELSE p_target END
                          ELSE away_team_id END,
      preferred_team_id = CASE WHEN preferred_team_id = p_source THEN p_target ELSE preferred_team_id END
      WHERE p_source IN (home_team_id, away_team_id, preferred_team_id);
    GET DIAGNOSTICS n_tag = ROW_COUNT;

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
    UPDATE tag_matches SET competition_id = p_target WHERE competition_id = p_source;
    GET DIAGNOSTICS n_tag = ROW_COUNT;
    UPDATE user_preferences SET main_competition_id = p_target WHERE main_competition_id = p_source;
    GET DIAGNOSTICS n_prefs = ROW_COUNT;
    DELETE FROM competitions WHERE id = p_source;

  ELSE
    UPDATE archive_items SET season_id = p_target WHERE season_id = p_source;
    GET DIAGNOSTICS n_cloud = ROW_COUNT;
    UPDATE set_pieces SET season_id = p_target, stagione = target_name WHERE season_id = p_source;
    GET DIAGNOSTICS n_sp = ROW_COUNT;
    UPDATE tag_matches SET season_id = p_target WHERE season_id = p_source;
    GET DIAGNOSTICS n_tag = ROW_COUNT;
    UPDATE user_preferences SET current_season_id = p_target WHERE current_season_id = p_source;
    GET DIAGNOSTICS n_prefs = ROW_COUNT;
    DELETE FROM seasons WHERE id = p_source;
  END IF;

  PERFORM set_config('app.keep_updated_at', 'off', true);
  RETURN jsonb_build_object('cloud', n_cloud, 'set_pieces', n_sp, 'osservazioni', n_obs,
                            'giocatori', n_players, 'preferenze', n_prefs, 'ag_tag', n_tag);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION merge_lookup(TEXT, UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION merge_lookup(TEXT, UUID, UUID) TO authenticated;

-- 11) Controllo finale: blocco dello spazio di lavoro su tutte le tabelle che lo hanno.
DO $$
DECLARE missing TEXT;
BEGIN
  SELECT string_agg(c.table_name, ', ') INTO missing
  FROM information_schema.columns c
  JOIN information_schema.tables t USING (table_schema, table_name)
  WHERE c.table_schema = 'public' AND c.column_name = 'workspace_id'
    AND t.table_type = 'BASE TABLE'
    AND NOT EXISTS (
      SELECT 1 FROM pg_trigger tg
      WHERE tg.tgrelid = format('public.%I', c.table_name)::regclass
        AND tg.tgname = 'lock_workspace_id' AND NOT tg.tgisinternal
    );
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'Blocco workspace_id mancante su: %', missing;
  END IF;
END $$;
