-- 0020 — AG Studio: eventi importanti della partita (gol, cartellini, sostituzioni).
-- Servono all'importazione di formazioni e rose da file dei provider (CSV, XML, PDF).
--
-- Solo aggiunte: UNA tabella nuova (match_key_events). Nessuna tabella o colonna
-- esistente viene modificata, nessun DROP. Stesse regole di accesso di match_lineups.
--
-- Una sostituzione è una riga: player_id = chi ENTRA, other_player_id = chi ESCE.
-- Per un gol, other_player_id può essere l'assist. Il minuto è quello di gioco
-- (supplementari del tempo con `recupero`: es. 45+2 = minuto 45, recupero 2).

CREATE TABLE match_key_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL,
  match_id        UUID NOT NULL,
  team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL CHECK (tipo IN ('gol', 'autogol', 'rigore', 'rigore_sbagliato', 'ammonizione', 'espulsione', 'sostituzione')),
  minuto          SMALLINT CHECK (minuto IS NULL OR minuto BETWEEN 0 AND 150),
  recupero        SMALLINT CHECK (recupero IS NULL OR recupero BETWEEN 0 AND 30),
  player_id       UUID REFERENCES players(id) ON DELETE SET NULL,
  other_player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  nota            TEXT CHECK (nota IS NULL OR length(nota) <= 500),
  -- Da dove viene il dato (es. "csv", "xml", "pdf", "manuale").
  fonte           TEXT CHECK (fonte IS NULL OR length(fonte) <= 40),
  created_by      UUID NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (match_id, workspace_id) REFERENCES matches (id, workspace_id) ON DELETE CASCADE,
  CHECK (tipo <> 'sostituzione' OR (player_id IS NOT NULL OR other_player_id IS NOT NULL))
);
CREATE INDEX match_key_events_match_idx ON match_key_events (match_id, minuto);
CREATE INDEX match_key_events_player_idx ON match_key_events (player_id);

-- La squadra dell'evento è una delle due in campo (come per le formazioni).
CREATE FUNCTION check_key_event_team() RETURNS trigger AS $$
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
CREATE TRIGGER trg_match_key_events_team BEFORE INSERT OR UPDATE OF team_id, match_id ON match_key_events
  FOR EACH ROW EXECUTE FUNCTION check_key_event_team();

CREATE TRIGGER lock_workspace_id BEFORE UPDATE OF workspace_id ON match_key_events
  FOR EACH ROW EXECUTE FUNCTION prevent_workspace_change();

ALTER TABLE match_key_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "match_key_events_select" ON match_key_events FOR SELECT
  USING (workspace_id IN (SELECT current_user_workspaces()));
CREATE POLICY "match_key_events_insert" ON match_key_events FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND match_id IN (SELECT id FROM matches
                     WHERE workspace_id IN (SELECT current_user_owned_workspaces()) OR created_by = auth.uid())
    AND team_id IN (SELECT id FROM teams WHERE workspace_id = match_key_events.workspace_id)
    AND (player_id IS NULL OR player_id IN (SELECT id FROM players WHERE workspace_id = match_key_events.workspace_id))
    AND (other_player_id IS NULL OR other_player_id IN (SELECT id FROM players WHERE workspace_id = match_key_events.workspace_id))
  );
CREATE POLICY "match_key_events_update" ON match_key_events FOR UPDATE
  USING (match_id IN (SELECT id FROM matches
                      WHERE workspace_id IN (SELECT current_user_owned_workspaces()) OR created_by = auth.uid()))
  WITH CHECK (
    team_id IN (SELECT id FROM teams WHERE workspace_id = match_key_events.workspace_id)
    AND (player_id IS NULL OR player_id IN (SELECT id FROM players WHERE workspace_id = match_key_events.workspace_id))
    AND (other_player_id IS NULL OR other_player_id IN (SELECT id FROM players WHERE workspace_id = match_key_events.workspace_id))
  );
CREATE POLICY "match_key_events_delete" ON match_key_events FOR DELETE
  USING (match_id IN (SELECT id FROM matches
                      WHERE workspace_id IN (SELECT current_user_owned_workspaces()) OR created_by = auth.uid()));
