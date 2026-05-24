-- ============================================================
-- HUB MATCH ANALYST — Sezione Set Pieces (calci piazzati)
-- Tabella set_pieces + enum + CHECK condizionali + RLS.
-- ============================================================

-- ============================================================
-- ENUM
-- ============================================================

CREATE TYPE sp_fase_enum AS ENUM ('OFFENSIVO', 'DIFENSIVO');

CREATE TYPE sp_tipo_piazzato_enum AS ENUM (
  'ANGOLO',
  'PUNIZIONE',
  'RIMESSA_LATERALE',
  'RIGORE'
);

-- Solo per Punizione: distingue zona di tiro chirurgica vs zona di cross.
CREATE TYPE sp_specificazione_punizione_enum AS ENUM (
  'CENTRALE',
  'LATERALE'
);

-- Lato di battuta del piazzato.
CREATE TYPE sp_lato_battuta_enum AS ENUM (
  'DESTRO',
  'SINISTRO',
  'CENTRALE'
);

-- Offensivo
CREATE TYPE sp_piede_battitore_enum AS ENUM (
  'DESTRO',
  'SINISTRO',
  'DUE_SULLA_PALLA'
);

CREATE TYPE sp_traiettoria_enum AS ENUM (
  'A_RIENTRARE',
  'A_USCIRE',
  'TESA',
  'MORBIDA',
  'RASOTERRA'
);

CREATE TYPE sp_sviluppo_schema_enum AS ENUM (
  'DIRETTO',
  'CORTO_2_3_TOCCHI',
  'SCARICO_FUORI_AREA'
);

-- Difensivo
CREATE TYPE sp_sistema_marcatura_enum AS ENUM (
  'A_UOMO',
  'A_ZONA',
  'MISTA'
);

CREATE TYPE sp_uomini_sui_pali_enum AS ENUM (
  'NESSUNO',
  'PRIMO_PALO',
  'SECONDO_PALO',
  'ENTRAMBI'
);

CREATE TYPE sp_altezza_linea_enum AS ENUM (
  'ALTA',
  'PROFONDA',
  'ELASTICA'
);

-- Esito finale (efficacia)
CREATE TYPE sp_esito_finale_enum AS ENUM (
  'GOL',
  'TIRO_IN_PORTA',
  'TIRO_FUORI',
  'LIBERATO_DIFESA',
  'FALLO_COMMESSO',
  'FALLO_SUBITO',
  'FUORIGIOCO',
  'TRANSIZIONE_SUBITA'
);

-- ============================================================
-- TABELLA
-- ============================================================
CREATE TABLE set_pieces (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id                UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by                  UUID NOT NULL REFERENCES profiles(id),

  -- § 1 Metadati dell'evento
  titolo                      TEXT NOT NULL,
  squadra_esecutrice          TEXT,
  squadra_avversaria          TEXT,
  competizione                TEXT,
  stagione                    TEXT,
  minuto                      INTEGER CHECK (minuto IS NULL OR minuto BETWEEN 0 AND 130),
  punteggio                   TEXT,
  data_evento                 DATE,

  -- § 2 Filtri macro
  fase                        sp_fase_enum NOT NULL,
  tipo_piazzato               sp_tipo_piazzato_enum NOT NULL,
  -- "Specificazione Punizione" è valida SOLO se tipo_piazzato = 'PUNIZIONE'.
  specificazione_punizione    sp_specificazione_punizione_enum,
  lato_battuta                sp_lato_battuta_enum,

  -- § 3 Dettagli offensivi (NULL/vuoti quando fase = 'DIFENSIVO')
  piede_battitore             sp_piede_battitore_enum,
  traiettoria                 sp_traiettoria_enum,
  sviluppo_schema             sp_sviluppo_schema_enum,
  /** Zone di caduta della palla (tag multipli). Vedi set-pieces.ts per i preset. */
  landing_zones               TEXT[] NOT NULL DEFAULT '{}',
  /** Comportamenti chiave dei giocatori in attacco (tag multipli). */
  behavior_tags               TEXT[] NOT NULL DEFAULT '{}',
  giocatori_in_area           INTEGER CHECK (giocatori_in_area IS NULL OR giocatori_in_area BETWEEN 0 AND 11),

  -- § 4 Dettagli difensivi (NULL quando fase = 'OFFENSIVO')
  sistema_marcatura           sp_sistema_marcatura_enum,
  uomini_in_barriera          INTEGER CHECK (uomini_in_barriera IS NULL OR uomini_in_barriera BETWEEN 0 AND 9),
  uomini_sui_pali             sp_uomini_sui_pali_enum,
  altezza_linea_difensiva     sp_altezza_linea_enum,
  giocatori_in_transizione    INTEGER CHECK (giocatori_in_transizione IS NULL OR giocatori_in_transizione BETWEEN 0 AND 11),

  -- § 5 Esito
  esito_finale                sp_esito_finale_enum,
  note_esito                  TEXT,

  -- § 6 Media
  video_url                   TEXT,
  lavagna_image_url           TEXT,
  pdf_url                     TEXT,

  -- System
  deleted_at                  TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- ----------------------------------------------------------
  -- CHECK 1: la specificazione punizione è valida solo per le punizioni.
  -- ----------------------------------------------------------
  CONSTRAINT chk_specificazione_solo_punizione CHECK (
    specificazione_punizione IS NULL
    OR tipo_piazzato = 'PUNIZIONE'
  ),

  -- ----------------------------------------------------------
  -- CHECK 2: mutua esclusione dei campi offensivi/difensivi in base alla fase.
  -- Quando fase = OFFENSIVO: tutti i campi della §4 devono essere NULL.
  -- Quando fase = DIFENSIVO: tutti i campi della §3 devono essere NULL/vuoti.
  -- (coalesce + array_length sui text[] per gestire array vuoti come "non valorizzati".)
  -- ----------------------------------------------------------
  CONSTRAINT chk_fase_mutua_esclusione CHECK (
    (fase = 'OFFENSIVO'
      AND sistema_marcatura        IS NULL
      AND uomini_in_barriera       IS NULL
      AND uomini_sui_pali          IS NULL
      AND altezza_linea_difensiva  IS NULL
      AND giocatori_in_transizione IS NULL)
    OR
    (fase = 'DIFENSIVO'
      AND piede_battitore   IS NULL
      AND traiettoria       IS NULL
      AND sviluppo_schema   IS NULL
      AND giocatori_in_area IS NULL
      AND COALESCE(array_length(landing_zones, 1), 0) = 0
      AND COALESCE(array_length(behavior_tags, 1), 0) = 0)
  )
);

-- ============================================================
-- INDICI
-- ============================================================
CREATE INDEX idx_sp_workspace        ON set_pieces (workspace_id);
CREATE INDEX idx_sp_not_deleted      ON set_pieces (workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_sp_fase             ON set_pieces (fase);
CREATE INDEX idx_sp_tipo             ON set_pieces (tipo_piazzato);
CREATE INDEX idx_sp_esito            ON set_pieces (esito_finale);
CREATE INDEX idx_sp_squadra_esec     ON set_pieces (squadra_esecutrice);
CREATE INDEX idx_sp_squadra_avv      ON set_pieces (squadra_avversaria);
CREATE INDEX idx_sp_landing_gin      ON set_pieces USING GIN (landing_zones);
CREATE INDEX idx_sp_behavior_gin     ON set_pieces USING GIN (behavior_tags);
CREATE INDEX idx_sp_titolo_trgm      ON set_pieces USING GIN (titolo gin_trgm_ops);

-- ============================================================
-- TRIGGER updated_at (riusa set_updated_at esistente)
-- ============================================================
CREATE TRIGGER trg_set_pieces_updated_at
  BEFORE UPDATE ON set_pieces
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- Stesso pattern di archive_items / players.
-- ============================================================
ALTER TABLE set_pieces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "set_pieces_select_workspace" ON set_pieces
  FOR SELECT USING (workspace_id IN (SELECT current_user_workspaces()));

CREATE POLICY "set_pieces_insert_workspace" ON set_pieces
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT current_user_workspaces())
    AND created_by = auth.uid()
  );

CREATE POLICY "set_pieces_update_owner_or_creator" ON set_pieces
  FOR UPDATE USING (
    workspace_id IN (SELECT current_user_owned_workspaces())
    OR created_by = auth.uid()
  )
  WITH CHECK (
    workspace_id IN (SELECT current_user_owned_workspaces())
    OR created_by = auth.uid()
  );

CREATE POLICY "set_pieces_delete_owner" ON set_pieces
  FOR DELETE USING (
    workspace_id IN (SELECT current_user_owned_workspaces())
  );
