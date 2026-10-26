-- 0013 — Anagrafiche condivise per i Set Pieces, preferenze di lavoro,
-- unione di anagrafiche doppie e ricerca Scouting più ampia.
-- Nessuna colonna rimossa o rinominata: i testi dei Set Pieces restano.

-- 0) Anti-doppioni: un nome per workspace, ignorando maiuscole e spazi ----------
-- iniziali/finali (verificato prima: oggi nessun doppione).
CREATE UNIQUE INDEX uq_teams_workspace_nome_ci ON teams (workspace_id, lower(btrim(nome)));
CREATE UNIQUE INDEX uq_competitions_workspace_nome_ci ON competitions (workspace_id, lower(btrim(nome)));
CREATE UNIQUE INDEX uq_seasons_workspace_label_ci ON seasons (workspace_id, lower(btrim(label)));

-- Data di modifica: se la transazione ha attivato app.keep_updated_at
-- (lo fa solo "Unisci anagrafiche"), updated_at non cambia. Altrimenti
-- comportamento identico a prima.
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('app.keep_updated_at', true) = 'on' THEN
    RETURN NEW;
  END IF;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 1) Set Pieces collegati alle anagrafiche --------------------------------------
ALTER TABLE set_pieces
  ADD COLUMN team_esecutrice_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  ADD COLUMN team_avversaria_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  ADD COLUMN competition_id     UUID REFERENCES competitions(id) ON DELETE SET NULL,
  ADD COLUMN season_id          UUID REFERENCES seasons(id) ON DELETE SET NULL,
  ADD CONSTRAINT sp_squadre_diverse CHECK (
    team_esecutrice_id IS NULL OR team_avversaria_id IS NULL
    OR team_esecutrice_id <> team_avversaria_id
  );

CREATE INDEX idx_sp_team_esecutrice ON set_pieces (team_esecutrice_id);
CREATE INDEX idx_sp_team_avversaria ON set_pieces (team_avversaria_id);
CREATE INDEX idx_sp_competition     ON set_pieces (competition_id);
CREATE INDEX idx_sp_season          ON set_pieces (season_id);

-- Conversione dei testi esistenti: confronto ignorando maiuscole e spazi;
-- le anagrafiche mancanti vengono create. (Funzione temporanea, sparisce a
-- fine migrazione.)
CREATE FUNCTION pg_temp.lookup_key(t TEXT) RETURNS TEXT
  LANGUAGE sql IMMUTABLE AS $$ SELECT lower(regexp_replace(btrim(t), '\s+', ' ', 'g')) $$;
CREATE FUNCTION pg_temp.clean(t TEXT) RETURNS TEXT
  LANGUAGE sql IMMUTABLE AS $$ SELECT regexp_replace(btrim(t), '\s+', ' ', 'g') $$;

INSERT INTO teams (workspace_id, nome)
SELECT DISTINCT ON (x.workspace_id, pg_temp.lookup_key(x.t)) x.workspace_id, pg_temp.clean(x.t)
FROM (
  SELECT workspace_id, squadra_esecutrice AS t FROM set_pieces
  UNION ALL SELECT workspace_id, squadra_avversaria FROM set_pieces
) x
WHERE nullif(btrim(x.t), '') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM teams tm
    WHERE tm.workspace_id = x.workspace_id AND pg_temp.lookup_key(tm.nome) = pg_temp.lookup_key(x.t)
  )
ON CONFLICT DO NOTHING;

INSERT INTO competitions (workspace_id, nome)
SELECT DISTINCT ON (sp.workspace_id, pg_temp.lookup_key(sp.competizione)) sp.workspace_id, pg_temp.clean(sp.competizione)
FROM set_pieces sp
WHERE nullif(btrim(sp.competizione), '') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM competitions c
    WHERE c.workspace_id = sp.workspace_id AND pg_temp.lookup_key(c.nome) = pg_temp.lookup_key(sp.competizione)
  )
ON CONFLICT DO NOTHING;

INSERT INTO seasons (workspace_id, label)
SELECT DISTINCT ON (sp.workspace_id, pg_temp.lookup_key(sp.stagione)) sp.workspace_id, pg_temp.clean(sp.stagione)
FROM set_pieces sp
WHERE nullif(btrim(sp.stagione), '') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM seasons s
    WHERE s.workspace_id = sp.workspace_id AND pg_temp.lookup_key(s.label) = pg_temp.lookup_key(sp.stagione)
  )
ON CONFLICT DO NOTHING;

-- Collegamento: la data di modifica dei piazzati non cambia (conversione tecnica).
ALTER TABLE set_pieces DISABLE TRIGGER trg_set_pieces_updated_at;

UPDATE set_pieces sp SET
  team_esecutrice_id = (
    SELECT tm.id FROM teams tm
    WHERE tm.workspace_id = sp.workspace_id AND pg_temp.lookup_key(tm.nome) = pg_temp.lookup_key(sp.squadra_esecutrice)
    ORDER BY tm.created_at LIMIT 1),
  competition_id = (
    SELECT c.id FROM competitions c
    WHERE c.workspace_id = sp.workspace_id AND pg_temp.lookup_key(c.nome) = pg_temp.lookup_key(sp.competizione)
    ORDER BY c.created_at LIMIT 1),
  season_id = (
    SELECT s.id FROM seasons s
    WHERE s.workspace_id = sp.workspace_id AND pg_temp.lookup_key(s.label) = pg_temp.lookup_key(sp.stagione)
    ORDER BY s.created_at LIMIT 1)
WHERE nullif(btrim(sp.squadra_esecutrice), '') IS NOT NULL
   OR nullif(btrim(sp.competizione), '') IS NOT NULL
   OR nullif(btrim(sp.stagione), '') IS NOT NULL;

-- Avversaria dopo l'esecutrice: se i due testi indicano la stessa squadra,
-- l'avversaria resta vuota (il testo originale resta comunque salvato).
UPDATE set_pieces sp SET
  team_avversaria_id = m.id
FROM (
  SELECT sp2.id AS sp_id, (
    SELECT tm.id FROM teams tm
    WHERE tm.workspace_id = sp2.workspace_id AND pg_temp.lookup_key(tm.nome) = pg_temp.lookup_key(sp2.squadra_avversaria)
    ORDER BY tm.created_at LIMIT 1) AS id
  FROM set_pieces sp2
  WHERE nullif(btrim(sp2.squadra_avversaria), '') IS NOT NULL
) m
WHERE sp.id = m.sp_id AND m.id IS DISTINCT FROM sp.team_esecutrice_id;

ALTER TABLE set_pieces ENABLE TRIGGER trg_set_pieces_updated_at;

-- 2) Preferenze di lavoro (per utente e workspace) ------------------------------
CREATE TABLE user_preferences (
  user_id              UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workspace_id         UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  my_team_id           UUID REFERENCES teams(id) ON DELETE SET NULL,
  current_season_id    UUID REFERENCES seasons(id) ON DELETE SET NULL,
  main_competition_id  UUID REFERENCES competitions(id) ON DELETE SET NULL,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, workspace_id)
);

CREATE TRIGGER trg_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Ognuno vede e modifica solo le proprie preferenze, nei propri workspace,
-- con anagrafiche dello stesso workspace.
CREATE POLICY "prefs_select_own" ON user_preferences
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "prefs_insert_own" ON user_preferences
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND workspace_id IN (SELECT current_user_workspaces())
    AND (my_team_id IS NULL OR my_team_id IN (SELECT id FROM teams WHERE workspace_id = user_preferences.workspace_id))
    AND (current_season_id IS NULL OR current_season_id IN (SELECT id FROM seasons WHERE workspace_id = user_preferences.workspace_id))
    AND (main_competition_id IS NULL OR main_competition_id IN (SELECT id FROM competitions WHERE workspace_id = user_preferences.workspace_id))
  );

CREATE POLICY "prefs_update_own" ON user_preferences
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND workspace_id IN (SELECT current_user_workspaces())
    AND (my_team_id IS NULL OR my_team_id IN (SELECT id FROM teams WHERE workspace_id = user_preferences.workspace_id))
    AND (current_season_id IS NULL OR current_season_id IN (SELECT id FROM seasons WHERE workspace_id = user_preferences.workspace_id))
    AND (main_competition_id IS NULL OR main_competition_id IN (SELECT id FROM competitions WHERE workspace_id = user_preferences.workspace_id))
  );

CREATE POLICY "prefs_delete_own" ON user_preferences
  FOR DELETE USING (user_id = auth.uid());

-- 3) Unisci anagrafiche ---------------------------------------------------------
-- Sposta tutti i riferimenti da `p_source` a `p_target` (stesso tipo, stesso
-- workspace) ed elimina il doppione, tutto in un'unica transazione.
-- Solo l'owner del workspace. SECURITY DEFINER per poter aggiornare anche le
-- preferenze degli altri membri; il controllo owner è esplicito.
-- Se un elemento avrebbe due volte la stessa squadra (es. casa = ospite),
-- il campo spostato resta vuoto. Le date di modifica degli elementi toccati
-- non cambiano (app.keep_updated_at, valido solo in questa transazione).
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
  RETURN jsonb_build_object('cloud', n_cloud, 'set_pieces', n_sp, 'osservazioni', n_obs, 'preferenze', n_prefs);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Eseguibile solo da utenti autenticati (il controllo owner è nella funzione).
REVOKE EXECUTE ON FUNCTION merge_lookup(TEXT, UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION merge_lookup(TEXT, UUID, UUID) TO authenticated;

-- 4) Ricerca Scouting: nome, cognome, squadra, campionato, ruoli e stili --------
-- Colonna calcolata dal database (aggiungerla non tocca le date di modifica).
CREATE FUNCTION players_search_text(
  p_nome TEXT, p_cognome TEXT, p_squadra TEXT, p_campionato TEXT,
  p_stili TEXT[], p_ruolo public.ruolo_enum, p_ruoli public.ruolo_enum[]
) RETURNS TEXT
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT concat_ws(' ', p_nome, p_cognome, p_squadra, p_campionato,
    array_to_string(p_stili, ' '), p_ruolo::text, array_to_string(p_ruoli::text[], ' '))
$$;

ALTER TABLE players
  ADD COLUMN search_text TEXT GENERATED ALWAYS AS (
    players_search_text(nome, cognome, squadra_attuale, campionato, stili_gioco, ruolo_principale, ruoli_secondari)
  ) STORED;

CREATE INDEX idx_players_search_text_trgm ON players USING GIN (search_text gin_trgm_ops);
