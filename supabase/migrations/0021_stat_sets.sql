-- 0021 — AG Studio: statistiche importate (report e file dei fornitori, es. SICS Atlas).
--
-- Solo aggiunte: UNA tabella nuova (stat_sets). Nessuna tabella o colonna esistente
-- viene modificata, nessun DROP. Stesse regole di accesso di match_key_events.
--
-- Una riga = un «insieme di statistiche» di UNA squadra:
--   scope 'match'       → i numeri della squadra in una partita (match_id obbligatorio);
--   scope 'team_season' → i numeri aggregati della squadra in una stagione (report di squadra).
-- `valori` è un oggetto {metrica: numero} con gli identificativi del catalogo di AG Studio
-- (es. xg, xga, ppda, ipo, ird, possesso, xt). `tabelle` tiene eventuali serie (es. partita per partita).
-- Importando di nuovo lo stesso file/fornitore si sostituisce la riga (vedi indici unici).

CREATE TABLE stat_sets (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  scope          TEXT NOT NULL CHECK (scope IN ('match', 'team_season')),
  match_id       UUID,
  team_id        UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  season_id      UUID REFERENCES seasons(id) ON DELETE SET NULL,
  competition_id UUID REFERENCES competitions(id) ON DELETE SET NULL,
  -- Da dove viene il dato (es. "sics-atlas-pdf", "csv", "manuale").
  fonte          TEXT NOT NULL CHECK (length(fonte) BETWEEN 1 AND 40),
  etichetta      TEXT CHECK (etichetta IS NULL OR length(etichetta) <= 200),
  valori         JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(valori) = 'object'),
  tabelle        JSONB CHECK (tabelle IS NULL OR jsonb_typeof(tabelle) = 'object'),
  -- «Dati aggiornati al» scritto nel report importato.
  riferito_a     DATE,
  created_by     UUID NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (match_id, workspace_id) REFERENCES matches (id, workspace_id) ON DELETE CASCADE,
  CHECK ((scope = 'match') = (match_id IS NOT NULL))
);
CREATE UNIQUE INDEX stat_sets_match_uniq ON stat_sets (match_id, team_id, fonte) WHERE scope = 'match';
CREATE UNIQUE INDEX stat_sets_season_uniq ON stat_sets (workspace_id, team_id, COALESCE(season_id, '00000000-0000-0000-0000-000000000000'::uuid), fonte) WHERE scope = 'team_season';
CREATE INDEX stat_sets_team_idx ON stat_sets (team_id, scope);

-- Per le statistiche di partita la squadra è una delle due in campo.
CREATE FUNCTION check_stat_set_team() RETURNS trigger AS $$
BEGIN
  IF NEW.scope = 'match' AND NOT EXISTS (
    SELECT 1 FROM matches m
    WHERE m.id = NEW.match_id AND NEW.team_id IN (m.home_team_id, m.away_team_id)
  ) THEN
    RAISE EXCEPTION 'La squadra non gioca questa partita';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER trg_stat_sets_team BEFORE INSERT OR UPDATE OF team_id, match_id, scope ON stat_sets
  FOR EACH ROW EXECUTE FUNCTION check_stat_set_team();

CREATE TRIGGER trg_stat_sets_updated_at BEFORE UPDATE ON stat_sets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER lock_workspace_id BEFORE UPDATE OF workspace_id ON stat_sets
  FOR EACH ROW EXECUTE FUNCTION prevent_workspace_change();

ALTER TABLE stat_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stat_sets_select" ON stat_sets FOR SELECT
  USING (workspace_id IN (SELECT current_user_workspaces()));
CREATE POLICY "stat_sets_insert" ON stat_sets FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND workspace_id IN (SELECT current_user_workspaces())
    AND team_id IN (SELECT id FROM teams WHERE workspace_id = stat_sets.workspace_id)
    AND (match_id IS NULL OR match_id IN (SELECT id FROM matches
                     WHERE workspace_id IN (SELECT current_user_owned_workspaces()) OR created_by = auth.uid()))
    AND (season_id IS NULL OR season_id IN (SELECT id FROM seasons WHERE workspace_id = stat_sets.workspace_id))
    AND (competition_id IS NULL OR competition_id IN (SELECT id FROM competitions WHERE workspace_id = stat_sets.workspace_id))
  );
CREATE POLICY "stat_sets_update" ON stat_sets FOR UPDATE
  USING (workspace_id IN (SELECT current_user_owned_workspaces()) OR created_by = auth.uid())
  WITH CHECK (
    team_id IN (SELECT id FROM teams WHERE workspace_id = stat_sets.workspace_id)
    AND (season_id IS NULL OR season_id IN (SELECT id FROM seasons WHERE workspace_id = stat_sets.workspace_id))
    AND (competition_id IS NULL OR competition_id IN (SELECT id FROM competitions WHERE workspace_id = stat_sets.workspace_id))
  );
CREATE POLICY "stat_sets_delete" ON stat_sets FOR DELETE
  USING (workspace_id IN (SELECT current_user_owned_workspaces()) OR created_by = auth.uid());
