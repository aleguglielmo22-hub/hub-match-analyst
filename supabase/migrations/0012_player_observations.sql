-- 0012 — Osservazioni datate nello Scouting.
-- La scheda del giocatore resta il profilo consolidato; le osservazioni sono
-- lo storico. Nessuna colonna rimossa, nessun dato esistente spostato:
-- note_rapide resta in players e viene solo COPIATA come prima osservazione.

-- 1) Tabella ------------------------------------------------------------------
CREATE TABLE player_observations (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id       UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  player_id          UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_by         UUID NOT NULL REFERENCES profiles(id),

  data_osservazione  DATE NOT NULL DEFAULT CURRENT_DATE,
  team_casa_id       UUID REFERENCES teams(id) ON DELETE SET NULL,
  team_ospite_id     UUID REFERENCES teams(id) ON DELETE SET NULL,
  competition_id     UUID REFERENCES competitions(id) ON DELETE SET NULL,
  ruolo_giocato      ruolo_enum,
  voto               SMALLINT CHECK (voto BETWEEN 1 AND 10),
  nota               TEXT,
  -- true per le osservazioni create copiando le vecchie "note rapide".
  importata          BOOLEAN NOT NULL DEFAULT false,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT obs_voto_o_nota CHECK (voto IS NOT NULL OR nullif(btrim(nota), '') IS NOT NULL),
  CONSTRAINT obs_squadre_diverse CHECK (
    team_casa_id IS NULL OR team_ospite_id IS NULL OR team_casa_id <> team_ospite_id
  )
);

CREATE INDEX idx_obs_player_data ON player_observations (player_id, data_osservazione DESC);
CREATE INDEX idx_obs_workspace_data ON player_observations (workspace_id, data_osservazione DESC);

CREATE TRIGGER trg_obs_updated_at
  BEFORE UPDATE ON player_observations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2) RLS: stesso schema delle altre tabelle -----------------------------------
-- Leggono tutti i membri del workspace; crea chiunque sia membro (il giocatore
-- deve essere dello stesso workspace); modifica ed elimina il creatore o l'owner.
ALTER TABLE player_observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "obs_select_workspace" ON player_observations
  FOR SELECT USING (workspace_id IN (SELECT current_user_workspaces()));

CREATE POLICY "obs_insert_workspace" ON player_observations
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT current_user_workspaces())
    AND created_by = auth.uid()
    AND player_id IN (SELECT id FROM players WHERE workspace_id = player_observations.workspace_id)
  );

CREATE POLICY "obs_update_owner_or_creator" ON player_observations
  FOR UPDATE USING (
    workspace_id IN (SELECT current_user_owned_workspaces())
    OR created_by = auth.uid()
  )
  WITH CHECK (
    (workspace_id IN (SELECT current_user_owned_workspaces()) OR created_by = auth.uid())
    AND player_id IN (SELECT id FROM players WHERE workspace_id = player_observations.workspace_id)
  );

CREATE POLICY "obs_delete_owner_or_creator" ON player_observations
  FOR DELETE USING (
    workspace_id IN (SELECT current_user_owned_workspaces())
    OR created_by = auth.uid()
  );

-- 3) Riepilogo sul giocatore (per card, ordinamento e filtro della lista) ------
-- Colonne NUOVE, calcolate dalle osservazioni: nessun dato esistente cambia.
ALTER TABLE players
  ADD COLUMN ultima_osservazione  DATE,
  ADD COLUMN numero_osservazioni  INTEGER NOT NULL DEFAULT 0;

CREATE INDEX idx_players_ultima_osservazione
  ON players (workspace_id, ultima_osservazione DESC NULLS LAST);

-- La data di modifica del profilo cambia solo per modifiche dirette al
-- giocatore, non per il ricalcolo del riepilogo (UPDATE da un altro trigger).
DROP TRIGGER trg_players_updated_at ON players;
CREATE TRIGGER trg_players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW
  WHEN (pg_trigger_depth() = 0)
  EXECUTE FUNCTION set_updated_at();

-- Ricalcola il riepilogo del giocatore dopo ogni modifica alle osservazioni.
-- SECURITY DEFINER perché chi aggiunge un'osservazione può non avere il
-- permesso di modificare il giocatore; scrive solo i due campi calcolati.
-- È una funzione di trigger: l'app non può chiamarla direttamente.
CREATE OR REPLACE FUNCTION player_observations_summary_trigger() RETURNS TRIGGER AS $$
DECLARE
  pid UUID;
BEGIN
  FOR pid IN
    SELECT DISTINCT x FROM unnest(ARRAY[
      CASE WHEN TG_OP <> 'DELETE' THEN NEW.player_id END,
      CASE WHEN TG_OP <> 'INSERT' THEN OLD.player_id END
    ]) AS x WHERE x IS NOT NULL
  LOOP
    UPDATE public.players p
    SET ultima_osservazione = s.ultima,
        numero_osservazioni = s.numero
    FROM (
      SELECT max(data_osservazione) AS ultima, count(*)::int AS numero
      FROM public.player_observations
      WHERE player_id = pid
    ) s
    WHERE p.id = pid;
  END LOOP;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_obs_summary
  AFTER INSERT OR UPDATE OF player_id, data_osservazione OR DELETE ON player_observations
  FOR EACH ROW EXECUTE FUNCTION player_observations_summary_trigger();

-- Nessuno la esegue direttamente: la usa solo il trigger (il permesso EXECUTE
-- si verifica alla creazione del trigger, non a ogni scatto).
REVOKE EXECUTE ON FUNCTION player_observations_summary_trigger() FROM PUBLIC, anon, authenticated;

-- 4) Importazione delle vecchie "note rapide" ----------------------------------
-- Avviene DOPO la creazione dell'automatismo, che quindi aggiorna i contatori.
-- Una osservazione per ogni giocatore con note non vuote (anche nel cestino):
-- data = data ultimo aggiornamento, nota = testo attuale, senza voto.
INSERT INTO player_observations
  (workspace_id, player_id, created_by, data_osservazione, nota, importata)
SELECT workspace_id, id, created_by, data_ultimo_aggiornamento, btrim(note_rapide), true
FROM players
WHERE nullif(btrim(note_rapide), '') IS NOT NULL;

-- 5) search_path fisso per le funzioni di supporto delle RLS (audit S7) ---------
-- Stesso comportamento: leggono solo tabelle di public e auth.uid().
-- Restano eseguibili da anon e authenticated perché le usano le policy RLS
-- (valutate con i permessi di chi interroga, compreso il keep-alive anonimo).
ALTER FUNCTION current_user_workspaces() SET search_path = public;
ALTER FUNCTION current_user_owned_workspaces() SET search_path = public;

-- 6) Controllo finale (sola lettura): i contatori devono coincidere con le
-- osservazioni reali, altrimenti la migrazione viene annullata per intero.
DO $$
DECLARE
  mismatches INTEGER;
BEGIN
  SELECT count(*) INTO mismatches
  FROM players p
  LEFT JOIN (
    SELECT player_id, count(*)::int AS n, max(data_osservazione) AS ultima
    FROM player_observations
    GROUP BY player_id
  ) o ON o.player_id = p.id
  WHERE p.numero_osservazioni <> coalesce(o.n, 0)
     OR p.ultima_osservazione IS DISTINCT FROM o.ultima;
  IF mismatches > 0 THEN
    RAISE EXCEPTION 'Contatori osservazioni non allineati su % giocatori', mismatches;
  END IF;
END
$$;
