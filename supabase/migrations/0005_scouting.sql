-- ============================================================
-- HUB MATCH ANALYST — Sezione Scouting (Player Database)
-- Tabella players + enum dedicati + indici + RLS.
-- ============================================================

-- ============================================================
-- ENUM
-- ============================================================
CREATE TYPE passaporto_enum AS ENUM ('COMUNITARIO','EXTRACOMUNITARIO');

CREATE TYPE piede_enum AS ENUM ('DESTRO','SINISTRO','AMBIDESTRO');

-- Sigle ruoli da specs §2 (17 totali, tutti standard italiani).
CREATE TYPE ruolo_enum AS ENUM (
  'POR',
  'DC',
  'DLS','DLD',
  'DES','DED',
  'CDC',
  'CC',
  'CED','CES',
  'COC','COD','COS',
  'AED','AES',
  'SP',
  'AC'
);

CREATE TYPE morfotipo_enum AS ENUM ('BREVILINEO','LONGILINEO','MESOMORFO');

CREATE TYPE status_osservazione_enum AS ENUM (
  'DA_VISIONARE',
  'IN_OSSERVAZIONE',
  'APPROVATO',
  'RIFIUTATO'
);

CREATE TYPE voto_potenziale_enum AS ENUM ('A1','A2','B1','C');

CREATE TYPE fascia_ingaggio_enum AS ENUM (
  'SOTTO_100K',
  'TRA_100K_300K',
  'TRA_300K_600K',
  'TRA_600K_1M',
  'SOPRA_1M'
);

-- ============================================================
-- PLAYERS
-- ============================================================
CREATE TABLE players (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id                UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by                  UUID NOT NULL REFERENCES profiles(id),

  -- §1 Anagrafica
  nome                        TEXT NOT NULL,
  cognome                     TEXT NOT NULL,
  foto_url                    TEXT,
  data_nascita                DATE,
  nazionalita                 TEXT,
  passaporto                  passaporto_enum,
  piede                       piede_enum,

  -- §2 Posizionamento tattico
  ruolo_principale            ruolo_enum,
  ruoli_secondari             ruolo_enum[] NOT NULL DEFAULT '{}',
  stili_gioco                 TEXT[] NOT NULL DEFAULT '{}',

  -- §3 Contratto
  -- transfermarkt_url: URL alla scheda del giocatore su Transfermarkt.
  -- TODO: in futuro, una Server Action / API Route potrà fare scraping/fetch
  -- da questo URL per aggiornare automaticamente squadra_attuale, valore_mercato_eur,
  -- scadenza_contratto (vedi commento in app/(app)/scouting/actions.ts).
  transfermarkt_url           TEXT,
  squadra_attuale             TEXT,
  campionato                  TEXT,
  scadenza_contratto          DATE,
  agenzia                     TEXT,
  valore_mercato_eur          BIGINT,
  fascia_ingaggio             fascia_ingaggio_enum,

  -- §4 Fisico/atletico
  altezza_cm                  INTEGER
    CHECK (altezza_cm IS NULL OR altezza_cm BETWEEN 100 AND 250),
  peso_kg                     INTEGER
    CHECK (peso_kg IS NULL OR peso_kg BETWEEN 30 AND 200),
  morfotipo                   morfotipo_enum,
  caratteristiche_atletiche   TEXT[] NOT NULL DEFAULT '{}',
  capacita_condizionali       TEXT,

  -- §5 Valutazioni (1-10, NULL = non valutato)
  val_ricezione_orientata     SMALLINT
    CHECK (val_ricezione_orientata IS NULL OR val_ricezione_orientata BETWEEN 1 AND 10),
  val_trasmissione_corto      SMALLINT
    CHECK (val_trasmissione_corto IS NULL OR val_trasmissione_corto BETWEEN 1 AND 10),
  val_trasmissione_lungo      SMALLINT
    CHECK (val_trasmissione_lungo IS NULL OR val_trasmissione_lungo BETWEEN 1 AND 10),
  val_dribbling               SMALLINT
    CHECK (val_dribbling IS NULL OR val_dribbling BETWEEN 1 AND 10),
  val_conclusione             SMALLINT
    CHECK (val_conclusione IS NULL OR val_conclusione BETWEEN 1 AND 10),
  val_cross                   SMALLINT
    CHECK (val_cross IS NULL OR val_cross BETWEEN 1 AND 10),
  val_lettura_spazi           SMALLINT
    CHECK (val_lettura_spazi IS NULL OR val_lettura_spazi BETWEEN 1 AND 10),
  val_smarcamento             SMALLINT
    CHECK (val_smarcamento IS NULL OR val_smarcamento BETWEEN 1 AND 10),
  val_posizionamento_difensivo SMALLINT
    CHECK (val_posizionamento_difensivo IS NULL OR val_posizionamento_difensivo BETWEEN 1 AND 10),
  val_transizione_difensiva   SMALLINT
    CHECK (val_transizione_difensiva IS NULL OR val_transizione_difensiva BETWEEN 1 AND 10),
  val_leadership              SMALLINT
    CHECK (val_leadership IS NULL OR val_leadership BETWEEN 1 AND 10),
  val_concentrazione          SMALLINT
    CHECK (val_concentrazione IS NULL OR val_concentrazione BETWEEN 1 AND 10),
  val_aggressivita            SMALLINT
    CHECK (val_aggressivita IS NULL OR val_aggressivita BETWEEN 1 AND 10),
  val_decision_making         SMALLINT
    CHECK (val_decision_making IS NULL OR val_decision_making BETWEEN 1 AND 10),

  -- §6 Workflow scout
  status_osservazione         status_osservazione_enum NOT NULL DEFAULT 'DA_VISIONARE',
  voto_potenziale             voto_potenziale_enum,
  data_ultimo_aggiornamento   DATE NOT NULL DEFAULT CURRENT_DATE,
  scout_assegnato             TEXT,

  -- Media
  scouting_report_url         TEXT,
  note_rapide                 TEXT,
  clip_video_urls             TEXT[] NOT NULL DEFAULT '{}',

  -- System
  deleted_at                  TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDICI
-- ============================================================
CREATE INDEX idx_players_workspace          ON players (workspace_id);
CREATE INDEX idx_players_not_deleted        ON players (workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_players_cognome            ON players (cognome);
CREATE INDEX idx_players_ruolo              ON players (ruolo_principale);
CREATE INDEX idx_players_scadenza           ON players (scadenza_contratto);
CREATE INDEX idx_players_status             ON players (status_osservazione);
CREATE INDEX idx_players_voto_potenziale    ON players (voto_potenziale);
CREATE INDEX idx_players_data_nascita       ON players (data_nascita);
CREATE INDEX idx_players_passaporto         ON players (passaporto);
CREATE INDEX idx_players_piede              ON players (piede);
CREATE INDEX idx_players_ruoli_sec_gin      ON players USING GIN (ruoli_secondari);
CREATE INDEX idx_players_stili_gin          ON players USING GIN (stili_gioco);
CREATE INDEX idx_players_caratt_gin         ON players USING GIN (caratteristiche_atletiche);
CREATE INDEX idx_players_nome_trgm          ON players USING GIN (nome gin_trgm_ops);
CREATE INDEX idx_players_cognome_trgm       ON players USING GIN (cognome gin_trgm_ops);

-- ============================================================
-- TRIGGER updated_at (riusa la funzione esistente)
-- ============================================================
CREATE TRIGGER trg_players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- Stesso pattern delle archive_items: i membri del workspace leggono tutto,
-- il creatore o l'owner del workspace possono modificare; hard delete solo owner.
-- ============================================================
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "players_select_workspace" ON players
  FOR SELECT USING (workspace_id IN (SELECT current_user_workspaces()));

CREATE POLICY "players_insert_workspace" ON players
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT current_user_workspaces())
    AND created_by = auth.uid()
  );

CREATE POLICY "players_update_owner_or_creator" ON players
  FOR UPDATE USING (
    workspace_id IN (SELECT current_user_owned_workspaces())
    OR created_by = auth.uid()
  )
  WITH CHECK (
    workspace_id IN (SELECT current_user_owned_workspaces())
    OR created_by = auth.uid()
  );

CREATE POLICY "players_delete_owner" ON players
  FOR DELETE USING (
    workspace_id IN (SELECT current_user_owned_workspaces())
  );
