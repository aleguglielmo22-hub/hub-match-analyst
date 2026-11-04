-- 0019 — AG Studio: partite condivise, formazioni, pannello di codifica e azioni.
-- Sostituisce la vecchia 0019 di AG Tag (mai applicata).
--
-- Solo aggiunte: nessuna tabella o colonna esistente viene rimossa o rinominata,
-- nessun DROP. Le tabelle tag_* di AG Tag restano intatte finché AG Tag è in uso.
-- Nel database solo dati: i video restano sul Mac (qui nome, percorso e impronta).
--
-- Riuso di AG Workspace (nessun doppione): squadre (teams), competizioni,
-- stagioni, giocatori (players) e "mia squadra" (user_preferences.my_team_id).
--
-- Stesso spazio di lavoro garantito dal database: le tabelle figlie si legano
-- alla madre con la coppia (id, workspace_id), come nella 0018.

-- 1) Partite (condivise da AG Studio e AG Workspace) ----------------------------
CREATE TABLE matches (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id          UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by            UUID NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ,
  -- Contesto
  season_id             UUID REFERENCES seasons(id) ON DELETE SET NULL,
  competition_id        UUID REFERENCES competitions(id) ON DELETE SET NULL,
  home_team_id          UUID REFERENCES teams(id) ON DELETE SET NULL,
  away_team_id          UUID REFERENCES teams(id) ON DELETE SET NULL,
  data_partita          DATE,
  giornata              TEXT CHECK (giornata IS NULL OR length(giornata) <= 40),
  titolo                TEXT CHECK (titolo IS NULL OR length(titolo) <= 200),
  gol_casa              SMALLINT CHECK (gol_casa IS NULL OR gol_casa BETWEEN 0 AND 99),
  gol_ospite            SMALLINT CHECK (gol_ospite IS NULL OR gol_ospite BETWEEN 0 AND 99),
  modulo_casa           TEXT CHECK (modulo_casa IS NULL OR length(modulo_casa) <= 20),
  modulo_ospite         TEXT CHECK (modulo_ospite IS NULL OR length(modulo_ospite) <= 20),
  note                  TEXT CHECK (note IS NULL OR length(note) <= 4000),
  -- Squadra dal cui punto di vista si codifica (bloccata quando ci sono azioni: vedi 7).
  preferred_team_id     UUID REFERENCES teams(id) ON DELETE SET NULL,
  -- Verso d'attacco della squadra preferita nel 1° tempo (il campo si inverte da solo nel 2°).
  preferred_attacks_right_1t BOOLEAN,
  -- Inizio dei tempi dentro il video, per il minuto di gioco.
  first_half_start_ms   INTEGER CHECK (first_half_start_ms IS NULL OR first_half_start_ms >= 0),
  second_half_start_ms  INTEGER CHECK (second_half_start_ms IS NULL OR second_half_start_ms >= 0),
  -- Video (facoltativo; solo metadati: il file resta sul Mac)
  video_file_name       TEXT CHECK (video_file_name IS NULL OR length(video_file_name) <= 255),
  video_path            TEXT CHECK (video_path IS NULL OR length(video_path) <= 2048), -- ultimo percorso noto
  video_size_bytes      BIGINT CHECK (video_size_bytes IS NULL OR video_size_bytes > 0),
  video_fingerprint     TEXT CHECK (video_fingerprint IS NULL OR video_fingerprint ~ '^[0-9a-f]{64}$'),
  duration_ms           INTEGER CHECK (duration_ms IS NULL OR duration_ms >= 0),
  fps                   NUMERIC(8,3) CHECK (fps IS NULL OR fps > 0),
  width                 INTEGER CHECK (width IS NULL OR width > 0),
  height                INTEGER CHECK (height IS NULL OR height > 0),
  video_codec           TEXT CHECK (video_codec IS NULL OR length(video_codec) <= 40),
  audio_codec           TEXT CHECK (audio_codec IS NULL OR length(audio_codec) <= 40),
  container             TEXT CHECK (container IS NULL OR length(container) <= 80),
  CHECK (home_team_id IS NULL OR away_team_id IS NULL OR home_team_id <> away_team_id),
  CHECK (preferred_team_id IS NULL OR preferred_team_id = home_team_id OR preferred_team_id = away_team_id),
  CHECK (second_half_start_ms IS NULL OR (first_half_start_ms IS NOT NULL AND second_half_start_ms > first_half_start_ms)),
  -- Il video c'è tutto (nome, dimensione, impronta) oppure non c'è.
  CHECK ((video_file_name IS NULL) = (video_fingerprint IS NULL) AND (video_fingerprint IS NULL) = (video_size_bytes IS NULL)),
  UNIQUE (id, workspace_id)
);
CREATE INDEX matches_list_idx ON matches (workspace_id, data_partita DESC NULLS LAST);
CREATE INDEX matches_fingerprint_idx ON matches (workspace_id, video_fingerprint);
CREATE INDEX matches_home_idx ON matches (home_team_id);
CREATE INDEX matches_away_idx ON matches (away_team_id);
CREATE INDEX matches_competition_idx ON matches (competition_id);
CREATE INDEX matches_season_idx ON matches (season_id);

-- 2) Formazioni: giocatori di Workspace in una partita -----------------------------
CREATE TABLE match_lineups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL,
  match_id      UUID NOT NULL,
  team_id       UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  numero        SMALLINT CHECK (numero IS NULL OR numero BETWEEN 0 AND 99),
  ruolo         TEXT CHECK (ruolo IS NULL OR length(ruolo) <= 20),
  titolare      BOOLEAN NOT NULL DEFAULT true,
  ordine        SMALLINT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (match_id, player_id),
  FOREIGN KEY (match_id, workspace_id) REFERENCES matches (id, workspace_id) ON DELETE CASCADE
);
CREATE INDEX match_lineups_match_idx ON match_lineups (match_id, team_id, ordine);
CREATE INDEX match_lineups_player_idx ON match_lineups (player_id);

-- La squadra della formazione è una delle due in campo.
CREATE FUNCTION check_lineup_team() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM matches m
    WHERE m.id = NEW.match_id AND NEW.team_id IN (m.home_team_id, m.away_team_id)
  ) THEN
    RAISE EXCEPTION 'La squadra non gioca questa partita';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER trg_match_lineups_team BEFORE INSERT OR UPDATE OF team_id, match_id ON match_lineups
  FOR EACH ROW EXECUTE FUNCTION check_lineup_team();

-- 3) Pannello di codifica (Fase 2) ----------------------------------------------------
CREATE TABLE coding_panels (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  nome          TEXT NOT NULL CHECK (btrim(nome) <> '' AND length(nome) <= 80),
  predefinito   BOOLEAN NOT NULL DEFAULT false,
  created_by    UUID NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (id, workspace_id)
);
-- Un solo pannello predefinito per spazio di lavoro.
CREATE UNIQUE INDEX coding_panels_default_idx ON coding_panels (workspace_id) WHERE predefinito;

-- 13 eventi (RFF↔RFC, COS↔PRS, SVI↔DPO, RIF↔DAR, TRD↔TRO, PIF↔PIC, INDV).
CREATE TABLE coding_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL,
  panel_id      UUID NOT NULL,
  code          TEXT NOT NULL CHECK (code ~ '^[A-Za-z0-9_-]{1,20}$'),
  nome          TEXT NOT NULL CHECK (btrim(nome) <> '' AND length(nome) <= 80),
  -- Tasto sulla tastiera, es. "KeyQ".
  tasto         TEXT CHECK (tasto IS NULL OR length(tasto) <= 40),
  famiglia      TEXT NOT NULL CHECK (famiglia IN ('possesso', 'non_possesso', 'transizione', 'palle_inattive', 'individuali')),
  colore        TEXT NOT NULL CHECK (colore ~ '^#[0-9a-fA-F]{6}$'),
  anticipo_ms   INTEGER NOT NULL DEFAULT 0 CHECK (anticipo_ms BETWEEN 0 AND 60000),
  coda_ms       INTEGER NOT NULL DEFAULT 0 CHECK (coda_ms BETWEEN 0 AND 60000),
  -- Evento specchio per l'avversario (stesso pannello); Individuali non ne ha.
  mirror_code   TEXT,
  ordine        SMALLINT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (panel_id, code),
  UNIQUE (id, workspace_id),
  CHECK (mirror_code IS NULL OR mirror_code <> code),
  CHECK (famiglia <> 'individuali' OR mirror_code IS NULL),
  FOREIGN KEY (panel_id, workspace_id) REFERENCES coding_panels (id, workspace_id) ON DELETE CASCADE,
  FOREIGN KEY (panel_id, mirror_code) REFERENCES coding_events (panel_id, code)
    ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED
);

-- Due set di sottotag per evento (mia squadra / avversario), in gruppi a scelta singola o multipla.
CREATE TABLE coding_subtag_groups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL,
  event_id      UUID NOT NULL,
  lato          TEXT NOT NULL CHECK (lato IN ('mia', 'avversario')),
  nome          TEXT NOT NULL CHECK (btrim(nome) <> '' AND length(nome) <= 80),
  scelta        TEXT NOT NULL DEFAULT 'singola' CHECK (scelta IN ('singola', 'multipla')),
  ordine        SMALLINT NOT NULL DEFAULT 0,
  UNIQUE (id, workspace_id),
  FOREIGN KEY (event_id, workspace_id) REFERENCES coding_events (id, workspace_id) ON DELETE CASCADE
);
CREATE INDEX coding_subtag_groups_event_idx ON coding_subtag_groups (event_id, lato, ordine);

CREATE TABLE coding_subtags (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL,
  group_id      UUID NOT NULL,
  nome          TEXT NOT NULL CHECK (btrim(nome) <> '' AND length(nome) <= 80),
  tasto         TEXT CHECK (tasto IS NULL OR length(tasto) <= 40),
  ordine        SMALLINT NOT NULL DEFAULT 0,
  UNIQUE (id, workspace_id),
  FOREIGN KEY (group_id, workspace_id) REFERENCES coding_subtag_groups (id, workspace_id) ON DELETE CASCADE
);
CREATE INDEX coding_subtags_group_idx ON coding_subtags (group_id, ordine);

-- 4) Azioni codificate (Fase 2) ---------------------------------------------------------
-- Un'azione è un intervallo di tempo dentro il video, non un file.
CREATE TABLE match_actions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL,
  match_id      UUID NOT NULL,
  -- Un evento usato da azioni non si può eliminare (si rinomina soltanto).
  event_id      UUID NOT NULL REFERENCES coding_events(id) ON DELETE RESTRICT,
  side          TEXT NOT NULL CHECK (side IN ('home', 'away')), -- squadra protagonista
  start_ms      INTEGER NOT NULL CHECK (start_ms >= 0),          -- già con l'anticipo
  end_ms        INTEGER NOT NULL,                                 -- già con la coda
  anticipo_ms   INTEGER NOT NULL DEFAULT 0 CHECK (anticipo_ms BETWEEN 0 AND 60000),
  coda_ms       INTEGER NOT NULL DEFAULT 0 CHECK (coda_ms BETWEEN 0 AND 60000),
  -- 0 nessuna; 1 utile da ricordare; 2 può determinare la partita; 3 determina la partita.
  stelle        SMALLINT NOT NULL DEFAULT 0 CHECK (stelle BETWEEN 0 AND 3),
  nota          TEXT CHECK (nota IS NULL OR length(nota) <= 2000),
  -- Facoltativi: giocatore, "a giocatore", esito, posizione (0–100 nel verso d'attacco).
  player_id     UUID REFERENCES players(id) ON DELETE SET NULL,
  to_player_id  UUID REFERENCES players(id) ON DELETE SET NULL,
  -- Esito libero e breve (es. riuscita / non riuscita, gol / parato / fuori).
  esito         TEXT CHECK (esito IS NULL OR (btrim(esito) <> '' AND length(esito) <= 40)),
  pos_x         NUMERIC(5,2) CHECK (pos_x IS NULL OR pos_x BETWEEN 0 AND 100),
  pos_y         NUMERIC(5,2) CHECK (pos_y IS NULL OR pos_y BETWEEN 0 AND 100),
  -- Minuto di gioco (dagli inizi dei tempi della partita).
  periodo       SMALLINT CHECK (periodo IS NULL OR periodo IN (1, 2)),
  minuto        SMALLINT CHECK (minuto IS NULL OR minuto BETWEEN 0 AND 200),
  -- Riga specchio: punta all'azione originale; eliminando l'originale si elimina anche lo specchio.
  mirror_of     UUID UNIQUE,
  created_by    UUID NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_ms >= start_ms),
  CHECK ((pos_x IS NULL) = (pos_y IS NULL)),
  CHECK (mirror_of IS NULL OR mirror_of <> id),
  UNIQUE (id, workspace_id),
  FOREIGN KEY (match_id, workspace_id) REFERENCES matches (id, workspace_id) ON DELETE CASCADE,
  FOREIGN KEY (mirror_of, workspace_id) REFERENCES match_actions (id, workspace_id) ON DELETE CASCADE
);
CREATE INDEX match_actions_match_idx ON match_actions (match_id, start_ms);
CREATE INDEX match_actions_event_idx ON match_actions (event_id);
CREATE INDEX match_actions_player_idx ON match_actions (player_id);
CREATE INDEX match_actions_stars_idx ON match_actions (match_id, stelle) WHERE stelle > 0;

CREATE TABLE match_action_subtags (
  action_id     UUID NOT NULL,
  workspace_id  UUID NOT NULL,
  subtag_id     UUID NOT NULL,
  PRIMARY KEY (action_id, subtag_id),
  FOREIGN KEY (action_id, workspace_id) REFERENCES match_actions (id, workspace_id) ON DELETE CASCADE,
  FOREIGN KEY (subtag_id, workspace_id) REFERENCES coding_subtags (id, workspace_id) ON DELETE CASCADE
);
CREATE INDEX match_action_subtags_subtag_idx ON match_action_subtags (subtag_id);

-- 5) Coppia specchio automatica ------------------------------------------------------------
-- Ogni azione originale con un evento che ha uno specchio crea la riga dell'avversario:
-- evento specchio, squadra opposta, stesso intervallo e minuto. Sottotag, stelle e note
-- dello specchio sono separati (all'inizio vuoti: "da completare").
-- Se cambiano intervallo o evento dell'originale, lo specchio si allinea.
CREATE FUNCTION sync_action_mirror() RETURNS trigger AS $$
DECLARE
  mirror_event UUID;
BEGIN
  SELECT m.id INTO mirror_event
  FROM coding_events e
  JOIN coding_events m ON m.panel_id = e.panel_id AND m.code = e.mirror_code
  WHERE e.id = NEW.event_id;

  IF TG_OP = 'INSERT' THEN
    IF mirror_event IS NOT NULL THEN
      INSERT INTO match_actions (workspace_id, match_id, event_id, side, start_ms, end_ms,
                                 anticipo_ms, coda_ms, periodo, minuto, mirror_of, created_by)
      VALUES (NEW.workspace_id, NEW.match_id, mirror_event,
              CASE NEW.side WHEN 'home' THEN 'away' ELSE 'home' END,
              NEW.start_ms, NEW.end_ms, NEW.anticipo_ms, NEW.coda_ms, NEW.periodo, NEW.minuto,
              NEW.id, NEW.created_by);
    END IF;
    RETURN NULL;
  END IF;

  -- UPDATE dell'originale
  IF mirror_event IS NULL THEN
    DELETE FROM match_actions WHERE mirror_of = NEW.id;
  ELSIF EXISTS (SELECT 1 FROM match_actions WHERE mirror_of = NEW.id) THEN
    UPDATE match_actions SET
      event_id = mirror_event,
      side = CASE NEW.side WHEN 'home' THEN 'away' ELSE 'home' END,
      start_ms = NEW.start_ms, end_ms = NEW.end_ms,
      anticipo_ms = NEW.anticipo_ms, coda_ms = NEW.coda_ms,
      periodo = NEW.periodo, minuto = NEW.minuto
    WHERE mirror_of = NEW.id;
    -- Evento cambiato: i sottotag dello specchio appartenevano al vecchio evento.
    IF NEW.event_id IS DISTINCT FROM OLD.event_id THEN
      DELETE FROM match_action_subtags
      WHERE action_id = (SELECT id FROM match_actions WHERE mirror_of = NEW.id);
    END IF;
  ELSE
    INSERT INTO match_actions (workspace_id, match_id, event_id, side, start_ms, end_ms,
                               anticipo_ms, coda_ms, periodo, minuto, mirror_of, created_by)
    VALUES (NEW.workspace_id, NEW.match_id, mirror_event,
            CASE NEW.side WHEN 'home' THEN 'away' ELSE 'home' END,
            NEW.start_ms, NEW.end_ms, NEW.anticipo_ms, NEW.coda_ms, NEW.periodo, NEW.minuto,
            NEW.id, NEW.created_by);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_match_actions_mirror_insert AFTER INSERT ON match_actions
  FOR EACH ROW WHEN (NEW.mirror_of IS NULL) EXECUTE FUNCTION sync_action_mirror();
CREATE TRIGGER trg_match_actions_mirror_update
  AFTER UPDATE OF event_id, side, start_ms, end_ms, anticipo_ms, coda_ms, periodo, minuto ON match_actions
  FOR EACH ROW WHEN (NEW.mirror_of IS NULL) EXECUTE FUNCTION sync_action_mirror();

-- 6) Le azioni appartengono a un evento del pannello e a un'azione dello stesso spazio ---------
CREATE FUNCTION check_action_refs() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM coding_events WHERE id = NEW.event_id AND workspace_id = NEW.workspace_id) THEN
    RAISE EXCEPTION 'Evento non valido per questo spazio di lavoro';
  END IF;
  IF NEW.mirror_of IS NULL AND TG_OP = 'UPDATE' AND OLD.mirror_of IS NOT NULL THEN
    RAISE EXCEPTION 'Una riga specchio resta legata alla sua azione originale';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER trg_match_actions_refs BEFORE INSERT OR UPDATE OF event_id, workspace_id, mirror_of ON match_actions
  FOR EACH ROW EXECUTE FUNCTION check_action_refs();

-- 7) Squadra preferita bloccata quando la partita ha azioni -------------------------------------
-- Eccezione: "Unisci anagrafiche" (che imposta app.keep_updated_at) sposta la stessa squadra.
CREATE FUNCTION lock_preferred_team() RETURNS trigger AS $$
BEGIN
  IF NEW.preferred_team_id IS DISTINCT FROM OLD.preferred_team_id
     AND coalesce(current_setting('app.keep_updated_at', true), '') <> 'on'
     AND EXISTS (SELECT 1 FROM match_actions WHERE match_id = OLD.id) THEN
    RAISE EXCEPTION 'La squadra preferita non si può cambiare: la partita ha già azioni codificate';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER trg_matches_lock_preferred BEFORE UPDATE OF preferred_team_id ON matches
  FOR EACH ROW EXECUTE FUNCTION lock_preferred_team();

-- 8) Date di modifica e blocco dello spazio di lavoro --------------------------------------------
CREATE TRIGGER trg_matches_updated_at BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_coding_panels_updated_at BEFORE UPDATE ON coding_panels
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_coding_events_updated_at BEFORE UPDATE ON coding_events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_match_actions_updated_at BEFORE UPDATE ON match_actions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['matches', 'match_lineups', 'coding_panels', 'coding_events', 'coding_subtag_groups',
                           'coding_subtags', 'match_actions', 'match_action_subtags'] LOOP
    EXECUTE format(
      'CREATE TRIGGER lock_workspace_id BEFORE UPDATE OF workspace_id ON %I
         FOR EACH ROW EXECUTE FUNCTION prevent_workspace_change()', t);
  END LOOP;
END $$;

-- 9) Regole di accesso (RLS), come nel resto del database -----------------------------------------
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_lineups ENABLE ROW LEVEL SECURITY;
ALTER TABLE coding_panels ENABLE ROW LEVEL SECURITY;
ALTER TABLE coding_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE coding_subtag_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE coding_subtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_action_subtags ENABLE ROW LEVEL SECURITY;

-- Partite: leggono i membri; crea un membro a nome proprio; modifica ed elimina il
-- proprietario o l'autore. Squadre, competizione e stagione dello stesso spazio.
CREATE POLICY "matches_select" ON matches FOR SELECT
  USING (workspace_id IN (SELECT current_user_workspaces()));
CREATE POLICY "matches_insert" ON matches FOR INSERT
  WITH CHECK (
    workspace_id IN (SELECT current_user_workspaces()) AND created_by = auth.uid()
    AND (home_team_id IS NULL OR home_team_id IN (SELECT id FROM teams WHERE workspace_id = matches.workspace_id))
    AND (away_team_id IS NULL OR away_team_id IN (SELECT id FROM teams WHERE workspace_id = matches.workspace_id))
    AND (competition_id IS NULL OR competition_id IN (SELECT id FROM competitions WHERE workspace_id = matches.workspace_id))
    AND (season_id IS NULL OR season_id IN (SELECT id FROM seasons WHERE workspace_id = matches.workspace_id))
  );
CREATE POLICY "matches_update" ON matches FOR UPDATE
  USING (workspace_id IN (SELECT current_user_owned_workspaces()) OR created_by = auth.uid())
  WITH CHECK (
    (workspace_id IN (SELECT current_user_owned_workspaces()) OR created_by = auth.uid())
    AND (home_team_id IS NULL OR home_team_id IN (SELECT id FROM teams WHERE workspace_id = matches.workspace_id))
    AND (away_team_id IS NULL OR away_team_id IN (SELECT id FROM teams WHERE workspace_id = matches.workspace_id))
    AND (competition_id IS NULL OR competition_id IN (SELECT id FROM competitions WHERE workspace_id = matches.workspace_id))
    AND (season_id IS NULL OR season_id IN (SELECT id FROM seasons WHERE workspace_id = matches.workspace_id))
  );
CREATE POLICY "matches_delete" ON matches FOR DELETE
  USING (workspace_id IN (SELECT current_user_owned_workspaces()) OR created_by = auth.uid());

-- Formazioni: le gestisce chi può modificare la partita; giocatori dello stesso spazio.
CREATE POLICY "match_lineups_select" ON match_lineups FOR SELECT
  USING (workspace_id IN (SELECT current_user_workspaces()));
CREATE POLICY "match_lineups_insert" ON match_lineups FOR INSERT
  WITH CHECK (
    match_id IN (SELECT id FROM matches
                 WHERE workspace_id IN (SELECT current_user_owned_workspaces()) OR created_by = auth.uid())
    AND player_id IN (SELECT id FROM players WHERE workspace_id = match_lineups.workspace_id)
    AND team_id IN (SELECT id FROM teams WHERE workspace_id = match_lineups.workspace_id)
  );
CREATE POLICY "match_lineups_update" ON match_lineups FOR UPDATE
  USING (match_id IN (SELECT id FROM matches
                      WHERE workspace_id IN (SELECT current_user_owned_workspaces()) OR created_by = auth.uid()))
  WITH CHECK (
    player_id IN (SELECT id FROM players WHERE workspace_id = match_lineups.workspace_id)
    AND team_id IN (SELECT id FROM teams WHERE workspace_id = match_lineups.workspace_id)
  );
CREATE POLICY "match_lineups_delete" ON match_lineups FOR DELETE
  USING (match_id IN (SELECT id FROM matches
                      WHERE workspace_id IN (SELECT current_user_owned_workspaces()) OR created_by = auth.uid()));

-- Pannello (definizioni condivise, come le anagrafiche): i membri leggono, creano e
-- modificano; elimina il proprietario dello spazio o l'autore del pannello.
CREATE POLICY "coding_panels_select" ON coding_panels FOR SELECT
  USING (workspace_id IN (SELECT current_user_workspaces()));
CREATE POLICY "coding_panels_insert" ON coding_panels FOR INSERT
  WITH CHECK (workspace_id IN (SELECT current_user_workspaces()) AND created_by = auth.uid());
CREATE POLICY "coding_panels_update" ON coding_panels FOR UPDATE
  USING (workspace_id IN (SELECT current_user_workspaces()))
  WITH CHECK (workspace_id IN (SELECT current_user_workspaces()));
CREATE POLICY "coding_panels_delete" ON coding_panels FOR DELETE
  USING (workspace_id IN (SELECT current_user_owned_workspaces()) OR created_by = auth.uid());

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['coding_events', 'coding_subtag_groups', 'coding_subtags'] LOOP
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT USING (workspace_id IN (SELECT current_user_workspaces()))', t || '_select', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR INSERT WITH CHECK (workspace_id IN (SELECT current_user_workspaces()))', t || '_insert', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE USING (workspace_id IN (SELECT current_user_workspaces())) WITH CHECK (workspace_id IN (SELECT current_user_workspaces()))', t || '_update', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR DELETE USING (workspace_id IN (SELECT current_user_workspaces()))', t || '_delete', t);
  END LOOP;
END $$;

-- Azioni: leggono i membri; crea un membro a nome proprio; modifica ed elimina il
-- proprietario o l'autore. Giocatori dello stesso spazio.
CREATE POLICY "match_actions_select" ON match_actions FOR SELECT
  USING (workspace_id IN (SELECT current_user_workspaces()));
CREATE POLICY "match_actions_insert" ON match_actions FOR INSERT
  WITH CHECK (
    workspace_id IN (SELECT current_user_workspaces()) AND created_by = auth.uid()
    AND (player_id IS NULL OR player_id IN (SELECT id FROM players WHERE workspace_id = match_actions.workspace_id))
    AND (to_player_id IS NULL OR to_player_id IN (SELECT id FROM players WHERE workspace_id = match_actions.workspace_id))
  );
CREATE POLICY "match_actions_update" ON match_actions FOR UPDATE
  USING (workspace_id IN (SELECT current_user_owned_workspaces()) OR created_by = auth.uid())
  WITH CHECK (
    (workspace_id IN (SELECT current_user_owned_workspaces()) OR created_by = auth.uid())
    AND (player_id IS NULL OR player_id IN (SELECT id FROM players WHERE workspace_id = match_actions.workspace_id))
    AND (to_player_id IS NULL OR to_player_id IN (SELECT id FROM players WHERE workspace_id = match_actions.workspace_id))
  );
CREATE POLICY "match_actions_delete" ON match_actions FOR DELETE
  USING (workspace_id IN (SELECT current_user_owned_workspaces()) OR created_by = auth.uid());

-- Sottotag di un'azione: li gestisce chi può modificare l'azione.
CREATE POLICY "match_action_subtags_select" ON match_action_subtags FOR SELECT
  USING (workspace_id IN (SELECT current_user_workspaces()));
CREATE POLICY "match_action_subtags_insert" ON match_action_subtags FOR INSERT
  WITH CHECK (action_id IN (
    SELECT id FROM match_actions
    WHERE workspace_id IN (SELECT current_user_owned_workspaces()) OR created_by = auth.uid()));
CREATE POLICY "match_action_subtags_delete" ON match_action_subtags FOR DELETE
  USING (action_id IN (
    SELECT id FROM match_actions
    WHERE workspace_id IN (SELECT current_user_owned_workspaces()) OR created_by = auth.uid()));

-- 10) La partita già salvata da AG Tag passa nella tabella condivisa (stesso id) ----------------
-- Copia, non spostamento: tag_matches resta com'è finché AG Tag è in uso.
INSERT INTO matches (id, workspace_id, created_by, created_at, updated_at, deleted_at,
                     season_id, competition_id, home_team_id, away_team_id, data_partita, titolo,
                     preferred_team_id, video_file_name, video_path, video_size_bytes, video_fingerprint,
                     duration_ms, fps, width, height, video_codec, audio_codec, container)
SELECT id, workspace_id, created_by, created_at, updated_at, deleted_at,
       season_id, competition_id, home_team_id, away_team_id, data_partita, titolo,
       preferred_team_id, video_file_name, video_path, video_size_bytes, video_fingerprint,
       duration_ms, fps, width, height, video_codec, audio_codec, container
FROM tag_matches
ON CONFLICT (id) DO NOTHING;

-- 11) "Unisci anagrafiche" sposta anche partite e formazioni di AG Studio -----------------------
-- Stessa funzione della 0018, con matches e match_lineups in più (chiave "ag_studio").
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
  n_studio INT := 0;
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

    -- Prima le partite, poi le formazioni (la squadra della formazione resta in campo).
    UPDATE matches SET
      home_team_id = CASE WHEN home_team_id = p_source
                          THEN CASE WHEN away_team_id = p_target THEN NULL ELSE p_target END
                          ELSE home_team_id END,
      away_team_id = CASE WHEN away_team_id = p_source
                          THEN CASE WHEN home_team_id = p_target THEN NULL ELSE p_target END
                          ELSE away_team_id END,
      preferred_team_id = CASE WHEN preferred_team_id = p_source THEN p_target ELSE preferred_team_id END
      WHERE p_source IN (home_team_id, away_team_id, preferred_team_id);
    GET DIAGNOSTICS n_studio = ROW_COUNT;
    UPDATE match_lineups SET team_id = p_target WHERE team_id = p_source;

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
    UPDATE matches SET competition_id = p_target WHERE competition_id = p_source;
    GET DIAGNOSTICS n_studio = ROW_COUNT;
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
    UPDATE matches SET season_id = p_target WHERE season_id = p_source;
    GET DIAGNOSTICS n_studio = ROW_COUNT;
    UPDATE user_preferences SET current_season_id = p_target WHERE current_season_id = p_source;
    GET DIAGNOSTICS n_prefs = ROW_COUNT;
    DELETE FROM seasons WHERE id = p_source;
  END IF;

  PERFORM set_config('app.keep_updated_at', 'off', true);
  RETURN jsonb_build_object('cloud', n_cloud, 'set_pieces', n_sp, 'osservazioni', n_obs,
                            'giocatori', n_players, 'preferenze', n_prefs, 'ag_tag', n_tag,
                            'ag_studio', n_studio);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION merge_lookup(TEXT, UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION merge_lookup(TEXT, UUID, UUID) TO authenticated;

-- Funzioni dei trigger: non richiamabili dall'esterno.
REVOKE EXECUTE ON FUNCTION check_lineup_team() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION sync_action_mirror() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION check_action_refs() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION lock_preferred_team() FROM PUBLIC, anon, authenticated;

-- 12) Controllo finale: blocco dello spazio di lavoro su tutte le tabelle che lo hanno. --------
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
