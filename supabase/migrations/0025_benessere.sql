-- 0025 — Area Benessere: parametri vitali, esercizi, schede, allenamenti,
-- alimenti, diario dei pasti, obiettivi nutrizionali, piani alimentari.
--
-- Solo tabelle nuove: nessuna tabella o colonna esistente viene toccata.
-- Accesso: solo il proprietario (cioè solo tu). Nessun collegamento esterno:
-- i dati arrivano a mano o da file caricati da te.

-- Parametri vitali: un valore per parametro e giorno (le importazioni aggiornano).
CREATE TABLE health_metrics (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by    UUID NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  data          DATE NOT NULL,
  tipo          TEXT NOT NULL CHECK (tipo ~ '^[a-z0-9_]{1,40}$'),
  valore        NUMERIC(12,2) NOT NULL CHECK (valore >= 0 AND valore <= 1000000),
  fonte         TEXT NOT NULL DEFAULT 'manuale' CHECK (fonte IN ('manuale','import')),
  note          TEXT CHECK (note IS NULL OR length(note) <= 1000)
);
CREATE UNIQUE INDEX health_metrics_one_per_day
  ON health_metrics (workspace_id, tipo, data) WHERE deleted_at IS NULL;

CREATE TABLE wk_exercises (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by    UUID NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  nome          TEXT NOT NULL CHECK (length(nome) BETWEEN 1 AND 120),
  gruppo        TEXT CHECK (gruppo IS NULL OR gruppo IN ('gambe','glutei','petto','schiena','spalle','braccia','core','total_body','cardio','mobilita')),
  attrezzo      TEXT CHECK (attrezzo IS NULL OR length(attrezzo) <= 80),
  link          TEXT CHECK (link IS NULL OR length(link) <= 2048),
  note          TEXT CHECK (note IS NULL OR length(note) <= 20000)
);

CREATE TABLE wk_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by    UUID NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  nome          TEXT NOT NULL CHECK (length(nome) BETWEEN 1 AND 200),
  obiettivo     TEXT CHECK (obiettivo IS NULL OR length(obiettivo) <= 200),
  giorni        TEXT CHECK (giorni IS NULL OR length(giorni) <= 100),
  note          TEXT CHECK (note IS NULL OR length(note) <= 20000),
  tags          TEXT[] NOT NULL DEFAULT '{}' CHECK (cardinality(tags) <= 20),
  UNIQUE (id, workspace_id)
);

CREATE TABLE wk_template_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  template_id   UUID NOT NULL,
  exercise_id   UUID NOT NULL REFERENCES wk_exercises(id) ON DELETE CASCADE,
  created_by    UUID NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ordine        SMALLINT CHECK (ordine IS NULL OR ordine BETWEEN 0 AND 99),
  serie         SMALLINT CHECK (serie IS NULL OR serie BETWEEN 1 AND 20),
  ripetizioni   TEXT CHECK (ripetizioni IS NULL OR length(ripetizioni) <= 20),
  carico_kg     NUMERIC(6,2) CHECK (carico_kg IS NULL OR carico_kg BETWEEN 0 AND 1000),
  recupero_s    SMALLINT CHECK (recupero_s IS NULL OR recupero_s BETWEEN 0 AND 1800),
  note          TEXT CHECK (note IS NULL OR length(note) <= 500),
  FOREIGN KEY (template_id, workspace_id) REFERENCES wk_templates (id, workspace_id) ON DELETE CASCADE
);
CREATE INDEX wk_template_items_template_idx ON wk_template_items (template_id);

CREATE TABLE wk_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by    UUID NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  data          DATE NOT NULL,
  titolo        TEXT NOT NULL CHECK (length(titolo) BETWEEN 1 AND 200),
  template_id   UUID REFERENCES wk_templates(id) ON DELETE SET NULL,
  durata_min    SMALLINT CHECK (durata_min IS NULL OR durata_min BETWEEN 1 AND 600),
  sensazione    SMALLINT CHECK (sensazione IS NULL OR sensazione BETWEEN 1 AND 5),
  note          TEXT CHECK (note IS NULL OR length(note) <= 20000),
  UNIQUE (id, workspace_id)
);

CREATE TABLE wk_sets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  session_id    UUID NOT NULL,
  exercise_id   UUID NOT NULL REFERENCES wk_exercises(id) ON DELETE CASCADE,
  created_by    UUID NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ordine        SMALLINT CHECK (ordine IS NULL OR ordine BETWEEN 0 AND 999),
  ripetizioni   SMALLINT CHECK (ripetizioni IS NULL OR ripetizioni BETWEEN 0 AND 1000),
  carico_kg     NUMERIC(6,2) CHECK (carico_kg IS NULL OR carico_kg BETWEEN 0 AND 1000),
  note          TEXT CHECK (note IS NULL OR length(note) <= 500),
  FOREIGN KEY (session_id, workspace_id) REFERENCES wk_sessions (id, workspace_id) ON DELETE CASCADE
);
CREATE INDEX wk_sets_session_idx ON wk_sets (session_id);
CREATE INDEX wk_sets_exercise_idx ON wk_sets (exercise_id);

-- Alimenti: valori per 100 g.
CREATE TABLE nut_foods (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by    UUID NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  nome          TEXT NOT NULL CHECK (length(nome) BETWEEN 1 AND 200),
  marca         TEXT CHECK (marca IS NULL OR length(marca) <= 200),
  kcal          NUMERIC(7,2) NOT NULL CHECK (kcal BETWEEN 0 AND 900),
  proteine      NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (proteine BETWEEN 0 AND 100),
  carboidrati   NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (carboidrati BETWEEN 0 AND 100),
  grassi        NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (grassi BETWEEN 0 AND 100),
  porzione_g    NUMERIC(7,1) CHECK (porzione_g IS NULL OR porzione_g BETWEEN 1 AND 5000),
  barcode       TEXT CHECK (barcode IS NULL OR barcode ~ '^[0-9A-Za-z]{1,32}$'),
  fonte         TEXT NOT NULL DEFAULT 'manuale' CHECK (fonte IN ('manuale','openfoodfacts')),
  note          TEXT CHECK (note IS NULL OR length(note) <= 20000)
);

-- Diario dei pasti: i valori sono copiati al momento dell'inserimento, così
-- modificare un alimento non cambia i giorni passati.
CREATE TABLE nut_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by    UUID NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data          DATE NOT NULL,
  pasto         TEXT NOT NULL CHECK (pasto IN ('colazione','pranzo','cena','spuntino')),
  food_id       UUID REFERENCES nut_foods(id) ON DELETE SET NULL,
  nome          TEXT NOT NULL CHECK (length(nome) BETWEEN 1 AND 200),
  grammi        NUMERIC(7,1) NOT NULL CHECK (grammi > 0 AND grammi <= 5000),
  kcal          NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (kcal >= 0),
  proteine      NUMERIC(7,2) NOT NULL DEFAULT 0 CHECK (proteine >= 0),
  carboidrati   NUMERIC(7,2) NOT NULL DEFAULT 0 CHECK (carboidrati >= 0),
  grassi        NUMERIC(7,2) NOT NULL DEFAULT 0 CHECK (grassi >= 0)
);
CREATE INDEX nut_log_data_idx ON nut_log (workspace_id, data);

-- Obiettivo giornaliero: una riga per spazio di lavoro.
CREATE TABLE nut_goals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by    UUID NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  kcal          INTEGER CHECK (kcal IS NULL OR kcal BETWEEN 500 AND 10000),
  proteine      INTEGER CHECK (proteine IS NULL OR proteine BETWEEN 0 AND 1000),
  carboidrati   INTEGER CHECK (carboidrati IS NULL OR carboidrati BETWEEN 0 AND 2000),
  grassi        INTEGER CHECK (grassi IS NULL OR grassi BETWEEN 0 AND 1000)
);

CREATE TABLE nut_plans (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by     UUID NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ,
  nome           TEXT NOT NULL CHECK (length(nome) BETWEEN 1 AND 200),
  kcal_obiettivo INTEGER CHECK (kcal_obiettivo IS NULL OR kcal_obiettivo BETWEEN 500 AND 10000),
  attivo         BOOLEAN NOT NULL DEFAULT FALSE,
  contenuto      TEXT CHECK (contenuto IS NULL OR length(contenuto) <= 20000),
  tags           TEXT[] NOT NULL DEFAULT '{}' CHECK (cardinality(tags) <= 20)
);

-- Regole di accesso e blocchi (come nella 0023) ------------------------------
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'health_metrics', 'wk_exercises', 'wk_templates', 'wk_template_items',
    'wk_sessions', 'wk_sets', 'nut_foods', 'nut_log', 'nut_goals', 'nut_plans'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL
         USING (workspace_id IN (SELECT current_user_owned_workspaces()))
         WITH CHECK (workspace_id IN (SELECT current_user_owned_workspaces()))',
      t || '_owner_only', t);
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I
         FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t);
    EXECUTE format(
      'CREATE TRIGGER lock_workspace_id BEFORE UPDATE OF workspace_id ON %I
         FOR EACH ROW EXECUTE FUNCTION prevent_workspace_change()', t);
  END LOOP;
END $$;
