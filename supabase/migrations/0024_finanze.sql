-- 0024 — Area Finanze: conti, categorie, movimenti, ricorrenti, obiettivi.
--
-- Solo tabelle nuove: nessuna tabella o colonna esistente viene toccata.
-- Gli importi sono in centesimi interi (12,50 € = 1250): i totali non hanno
-- errori di arrotondamento. Accesso: solo il proprietario (cioè solo tu).

CREATE TABLE fin_accounts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by          UUID NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ,
  nome                TEXT NOT NULL CHECK (length(nome) BETWEEN 1 AND 120),
  tipo                TEXT NOT NULL DEFAULT 'conto' CHECK (tipo IN ('conto','carta','contanti','risparmio','altro')),
  saldo_iniziale_cent BIGINT NOT NULL DEFAULT 0 CHECK (abs(saldo_iniziale_cent) < 100000000000),
  archiviato          BOOLEAN NOT NULL DEFAULT FALSE,
  note                TEXT CHECK (note IS NULL OR length(note) <= 20000)
);

CREATE TABLE fin_categories (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by          UUID NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ,
  nome                TEXT NOT NULL CHECK (length(nome) BETWEEN 1 AND 80),
  tipo                TEXT NOT NULL DEFAULT 'uscita' CHECK (tipo IN ('uscita','entrata')),
  budget_mensile_cent BIGINT CHECK (budget_mensile_cent IS NULL OR budget_mensile_cent BETWEEN 0 AND 100000000000),
  archiviata          BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE fin_recurring (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by    UUID NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  nome          TEXT NOT NULL CHECK (length(nome) BETWEEN 1 AND 200),
  tipo          TEXT NOT NULL DEFAULT 'uscita' CHECK (tipo IN ('uscita','entrata')),
  importo_cent  BIGINT NOT NULL CHECK (importo_cent > 0 AND importo_cent < 100000000000),
  frequenza     TEXT NOT NULL DEFAULT 'mensile'
                CHECK (frequenza IN ('settimanale','mensile','bimestrale','trimestrale','semestrale','annuale')),
  prossima_data DATE NOT NULL,
  categoria_id  UUID REFERENCES fin_categories(id) ON DELETE SET NULL,
  conto_id      UUID REFERENCES fin_accounts(id) ON DELETE SET NULL,
  abbonamento   BOOLEAN NOT NULL DEFAULT TRUE,
  attivo        BOOLEAN NOT NULL DEFAULT TRUE,
  note          TEXT CHECK (note IS NULL OR length(note) <= 20000)
);

CREATE TABLE fin_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by    UUID NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  data          DATE NOT NULL,
  tipo          TEXT NOT NULL DEFAULT 'uscita' CHECK (tipo IN ('uscita','entrata')),
  importo_cent  BIGINT NOT NULL CHECK (importo_cent > 0 AND importo_cent < 100000000000),
  descrizione   TEXT NOT NULL CHECK (length(descrizione) BETWEEN 1 AND 300),
  categoria_id  UUID REFERENCES fin_categories(id) ON DELETE SET NULL,
  conto_id      UUID REFERENCES fin_accounts(id) ON DELETE SET NULL,
  ricorrente_id UUID REFERENCES fin_recurring(id) ON DELETE SET NULL,
  note          TEXT CHECK (note IS NULL OR length(note) <= 20000),
  tags          TEXT[] NOT NULL DEFAULT '{}' CHECK (cardinality(tags) <= 20),
  -- Impronta della riga dell'estratto conto importata: evita i doppioni.
  import_hash   TEXT CHECK (import_hash IS NULL OR import_hash ~ '^[0-9a-f]{64}$'),
  UNIQUE (workspace_id, import_hash)
);
CREATE INDEX fin_transactions_data_idx ON fin_transactions (workspace_id, data DESC);

CREATE TABLE fin_goals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by       UUID NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  nome             TEXT NOT NULL CHECK (length(nome) BETWEEN 1 AND 200),
  obiettivo_cent   BIGINT NOT NULL CHECK (obiettivo_cent > 0 AND obiettivo_cent < 100000000000),
  accantonato_cent BIGINT NOT NULL DEFAULT 0 CHECK (accantonato_cent >= 0 AND accantonato_cent < 100000000000),
  scadenza         DATE,
  stato            TEXT NOT NULL DEFAULT 'attivo' CHECK (stato IN ('attivo','raggiunto','sospeso')),
  note             TEXT CHECK (note IS NULL OR length(note) <= 20000)
);

-- Regole di accesso e blocchi (come nella 0023) ------------------------------
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'fin_accounts', 'fin_categories', 'fin_recurring', 'fin_transactions', 'fin_goals'
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
