-- ============================================================
-- HUB MATCH ANALYST — Sezione Situazionali (catalogo tattico + esercitazioni)
-- Tabella situational_tactics con filtri nidificati macro → sotto fase.
-- ============================================================

-- ============================================================
-- ENUM
-- ============================================================

-- Livello 1 — Macro fase
CREATE TYPE st_macro_fase_enum AS ENUM (
  'POSSESSO',
  'NON_POSSESSO',
  'TRANSIZIONE_POSITIVA',
  'TRANSIZIONE_NEGATIVA'
);

-- Livello 2 — Sotto fase (10 valori complessivi).
-- La compatibilità con la macro è garantita dal CHECK constraint sotto.
CREATE TYPE st_sotto_fase_enum AS ENUM (
  -- POSSESSO
  'COSTRUZIONE_BASSA',
  'SVILUPPO_CONSOLIDAMENTO',
  'RIFINITURA_FINALIZZAZIONE',
  -- NON_POSSESSO
  'PRESSIONE_ALTA',
  'BLOCCO_MEDIO',
  'BLOCCO_BASSO',
  -- TRANSIZIONE_POSITIVA
  'CONSOLIDAMENTO_POSSESSO',
  'CONTROPIEDE_ATTACCO_DIRETTO',
  -- TRANSIZIONE_NEGATIVA
  'RIACQUISTO_IMMEDIATO',
  'RIORGANIZZAZIONE_SCAPPARE'
);

-- ============================================================
-- TABELLA
-- ============================================================
CREATE TABLE situational_tactics (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id           UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by             UUID NOT NULL REFERENCES profiles(id),

  -- § 1 Metadati
  titolo                 TEXT NOT NULL,
  /** Autori/fonte ispirazionale: Guardiola, De Zerbi, Real Madrid, "Creatività personale"… */
  autori                 TEXT[] NOT NULL DEFAULT '{}',
  /** Configurazioni numeriche: "11v11", "8v8+3 Jolly", "4v4+Portieri"… */
  numero_giocatori       TEXT[] NOT NULL DEFAULT '{}',
  spazio_dimensioni      TEXT,

  -- § 2 & § 3 Filtri (nidificati)
  macro_fase             st_macro_fase_enum NOT NULL,
  sotto_fase             st_sotto_fase_enum NOT NULL,

  -- § 4 Focus tattico (tag rapidi)
  focus_tags             TEXT[] NOT NULL DEFAULT '{}',

  -- § 5 Struttura esercitazione
  descrizione_flusso     TEXT,
  regole_provocazione    TEXT,
  varianti               TEXT,

  -- § 6 Media
  video_url              TEXT,
  lavagna_url            TEXT,
  pdf_url                TEXT,

  -- System
  deleted_at             TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- ----------------------------------------------------------
  -- CHECK: la sotto-fase deve appartenere alla macro-fase scelta.
  -- Garantisce a livello DB l'integrità del menu a cascata della UI.
  -- ----------------------------------------------------------
  CONSTRAINT chk_sotto_fase_belongs_macro CHECK (
    (macro_fase = 'POSSESSO' AND sotto_fase IN (
      'COSTRUZIONE_BASSA',
      'SVILUPPO_CONSOLIDAMENTO',
      'RIFINITURA_FINALIZZAZIONE'
    ))
    OR (macro_fase = 'NON_POSSESSO' AND sotto_fase IN (
      'PRESSIONE_ALTA',
      'BLOCCO_MEDIO',
      'BLOCCO_BASSO'
    ))
    OR (macro_fase = 'TRANSIZIONE_POSITIVA' AND sotto_fase IN (
      'CONSOLIDAMENTO_POSSESSO',
      'CONTROPIEDE_ATTACCO_DIRETTO'
    ))
    OR (macro_fase = 'TRANSIZIONE_NEGATIVA' AND sotto_fase IN (
      'RIACQUISTO_IMMEDIATO',
      'RIORGANIZZAZIONE_SCAPPARE'
    ))
  )
);

-- ============================================================
-- INDICI
-- ============================================================
CREATE INDEX idx_st_workspace        ON situational_tactics (workspace_id);
CREATE INDEX idx_st_not_deleted      ON situational_tactics (workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_st_macro            ON situational_tactics (macro_fase);
CREATE INDEX idx_st_sotto            ON situational_tactics (sotto_fase);
CREATE INDEX idx_st_focus_gin        ON situational_tactics USING GIN (focus_tags);
CREATE INDEX idx_st_autori_gin       ON situational_tactics USING GIN (autori);
CREATE INDEX idx_st_giocatori_gin    ON situational_tactics USING GIN (numero_giocatori);
CREATE INDEX idx_st_titolo_trgm      ON situational_tactics USING GIN (titolo gin_trgm_ops);

-- ============================================================
-- TRIGGER updated_at
-- ============================================================
CREATE TRIGGER trg_situational_updated_at
  BEFORE UPDATE ON situational_tactics
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE situational_tactics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "situational_select_workspace" ON situational_tactics
  FOR SELECT USING (workspace_id IN (SELECT current_user_workspaces()));

CREATE POLICY "situational_insert_workspace" ON situational_tactics
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT current_user_workspaces())
    AND created_by = auth.uid()
  );

CREATE POLICY "situational_update_owner_or_creator" ON situational_tactics
  FOR UPDATE USING (
    workspace_id IN (SELECT current_user_owned_workspaces())
    OR created_by = auth.uid()
  )
  WITH CHECK (
    workspace_id IN (SELECT current_user_owned_workspaces())
    OR created_by = auth.uid()
  );

CREATE POLICY "situational_delete_owner" ON situational_tactics
  FOR DELETE USING (
    workspace_id IN (SELECT current_user_owned_workspaces())
  );
