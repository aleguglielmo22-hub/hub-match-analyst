-- ============================================================
-- HUB MATCH ANALYST — Sezione Archivio
-- Schema + trigger. RLS in 0002_rls.sql, Storage in 0003_storage.sql.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- ENUM
-- ============================================================
CREATE TYPE ambito_enum AS ENUM (
  'PRIMA_SQUADRA','SETTORE_GIOVANILE','CALCIO_FEMMINILE'
);

CREATE TYPE categoria_lavoro_enum AS ENUM (
  'TEAM_STUDIO','MATCH_STUDIO','INDIVIDUAL_ANALYSIS',
  'DATA_ANALYSIS','ALLENAMENTO'
);

CREATE TYPE tipo_media_enum AS ENUM (
  'VIDEO_CLIP','INTERA_PARTITA','PDF_REPORT',
  'SLIDE_PRESENTAZIONE','EXCEL_DATI'
);

CREATE TYPE sorgente_video_enum AS ENUM (
  'TELECAMERA_TATTICA','BROADCASTER_TV','WYSCOUT','DRONE'
);

CREATE TYPE membership_role_enum AS ENUM ('OWNER','COLLABORATOR');
CREATE TYPE membership_status_enum AS ENUM ('PENDING','ACTIVE','REVOKED');

-- ============================================================
-- PROFILI & WORKSPACE
-- ============================================================
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE workspaces (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nome          TEXT NOT NULL DEFAULT 'Workspace',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(owner_id)
);

CREATE TABLE workspace_members (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,
  email_invitata  TEXT NOT NULL,
  role            membership_role_enum NOT NULL,
  status          membership_status_enum NOT NULL DEFAULT 'PENDING',
  invited_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at     TIMESTAMPTZ,
  UNIQUE(workspace_id, email_invitata)
);

-- ============================================================
-- LOOKUP CONDIVISE
-- ============================================================
CREATE TABLE teams (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  nome          TEXT NOT NULL,
  lega          TEXT,
  paese         TEXT,
  logo_url      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, nome)
);

CREATE TABLE competitions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  nome          TEXT NOT NULL,
  paese         TEXT,
  livello       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, nome)
);

CREATE TABLE seasons (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  label         TEXT NOT NULL,
  start_date    DATE,
  end_date      DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, label)
);

CREATE TABLE tags (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, slug)
);

-- ============================================================
-- ARCHIVIO
-- ============================================================
CREATE TABLE archive_items (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id         UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by           UUID NOT NULL REFERENCES profiles(id),

  data_lavoro          DATE NOT NULL,
  season_id            UUID REFERENCES seasons(id) ON DELETE SET NULL,

  team_principale_id   UUID REFERENCES teams(id) ON DELETE SET NULL,
  team_avversario_id   UUID REFERENCES teams(id) ON DELETE SET NULL,
  competition_id       UUID REFERENCES competitions(id) ON DELETE SET NULL,
  ambito               ambito_enum NOT NULL,
  categoria_lavoro     categoria_lavoro_enum NOT NULL,

  tipo_media           tipo_media_enum[] NOT NULL DEFAULT '{}',
  sorgente_video       sorgente_video_enum,

  titolo_archivio      TEXT NOT NULL,
  descrizione_estesa   TEXT,

  -- Mantenuto da trigger trg_archive_search (vedi sotto).
  -- Non è GENERATED perché to_tsvector(regconfig, text) è STABLE, non IMMUTABLE.
  search_vector        TSVECTOR,

  deleted_at           TIMESTAMPTZ,  -- soft delete (cestino)
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT no_self_match CHECK (
    team_principale_id IS NULL OR team_avversario_id IS NULL
    OR team_principale_id <> team_avversario_id
  )
);

CREATE TABLE archive_files (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  archive_item_id    UUID NOT NULL REFERENCES archive_items(id) ON DELETE CASCADE,
  file_name          TEXT NOT NULL,
  file_path          TEXT NOT NULL,       -- path nel bucket Supabase Storage
  file_size_bytes    BIGINT,
  mime_type          TEXT,
  tipo_media         tipo_media_enum NOT NULL,
  posizione          INTEGER NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE archive_item_tags (
  archive_item_id    UUID NOT NULL REFERENCES archive_items(id) ON DELETE CASCADE,
  tag_id             UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (archive_item_id, tag_id)
);

-- ============================================================
-- INDICI
-- ============================================================
CREATE INDEX idx_archive_workspace      ON archive_items (workspace_id);
CREATE INDEX idx_archive_not_deleted    ON archive_items (workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_archive_data_lavoro    ON archive_items (data_lavoro DESC);
CREATE INDEX idx_archive_season         ON archive_items (season_id);
CREATE INDEX idx_archive_team_main      ON archive_items (team_principale_id);
CREATE INDEX idx_archive_team_opp       ON archive_items (team_avversario_id);
CREATE INDEX idx_archive_competition    ON archive_items (competition_id);
CREATE INDEX idx_archive_ambito         ON archive_items (ambito);
CREATE INDEX idx_archive_categoria      ON archive_items (categoria_lavoro);
CREATE INDEX idx_archive_tipo_media     ON archive_items USING GIN (tipo_media);
CREATE INDEX idx_archive_search         ON archive_items USING GIN (search_vector);
CREATE INDEX idx_archive_titolo_trgm    ON archive_items USING GIN (titolo_archivio gin_trgm_ops);
CREATE INDEX idx_files_archive_item     ON archive_files (archive_item_id);
CREATE INDEX idx_archive_tags_tag       ON archive_item_tags (tag_id);

-- ============================================================
-- TRIGGER updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_archive_updated_at
  BEFORE UPDATE ON archive_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TRIGGER search_vector (Full-Text Search italiano)
-- Mantiene archive_items.search_vector pesando titolo (A) e descrizione (B).
-- ============================================================
CREATE OR REPLACE FUNCTION archive_items_update_search_vector() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('italian', coalesce(NEW.titolo_archivio, '')), 'A') ||
    setweight(to_tsvector('italian', coalesce(NEW.descrizione_estesa, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_archive_search_vector
  BEFORE INSERT OR UPDATE OF titolo_archivio, descrizione_estesa ON archive_items
  FOR EACH ROW EXECUTE FUNCTION archive_items_update_search_vector();

-- ============================================================
-- TRIGGER: crea automaticamente profile + workspace al signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER AS $$
DECLARE
  new_workspace_id UUID;
BEGIN
  INSERT INTO profiles (id, full_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  -- Se l'utente è stato pre-invitato, attiva la membership esistente
  UPDATE workspace_members
    SET user_id = NEW.id,
        status = 'ACTIVE',
        accepted_at = NOW()
    WHERE email_invitata = NEW.email AND status = 'PENDING';

  -- Altrimenti crea un workspace di sua proprietà
  IF NOT EXISTS (
    SELECT 1 FROM workspace_members WHERE user_id = NEW.id AND status = 'ACTIVE'
  ) THEN
    INSERT INTO workspaces (owner_id) VALUES (NEW.id) RETURNING id INTO new_workspace_id;
    INSERT INTO workspace_members (workspace_id, user_id, email_invitata, role, status, accepted_at)
      VALUES (new_workspace_id, NEW.id, NEW.email, 'OWNER', 'ACTIVE', NOW());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
