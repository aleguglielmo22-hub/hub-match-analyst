-- 0023 — Area Studi: libri, capitoli, corsi, lezioni, domande d'esame,
-- esami e scadenze, riviste e letture, highlights.
--
-- Solo tabelle nuove: nessuna tabella o colonna esistente viene toccata.
-- Regole di accesso: ogni riga è visibile e modificabile solo dal
-- proprietario dello spazio di lavoro (cioè solo tu).
-- Ripasso a distanza: `completato_il` (da quando contare) + `ripassi` (quanti
-- già fatti, 0–3: dopo 1 giorno, 1 settimana, 1 mese).

CREATE TABLE study_books (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by    UUID NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  titolo        TEXT NOT NULL CHECK (length(titolo) BETWEEN 1 AND 300),
  autore        TEXT CHECK (autore IS NULL OR length(autore) <= 200),
  stato         TEXT NOT NULL DEFAULT 'da_leggere' CHECK (stato IN ('da_leggere','in_lettura','finito','abbandonato')),
  data_inizio   DATE,
  data_fine     DATE,
  voto          SMALLINT CHECK (voto IS NULL OR voto BETWEEN 1 AND 5),
  pagine        INTEGER CHECK (pagine IS NULL OR pagine BETWEEN 1 AND 20000),
  genere        TEXT CHECK (genere IS NULL OR length(genere) <= 100),
  link          TEXT CHECK (link IS NULL OR length(link) <= 2048),
  riassunto     TEXT CHECK (riassunto IS NULL OR length(riassunto) <= 20000),
  note          TEXT CHECK (note IS NULL OR length(note) <= 20000),
  tags          TEXT[] NOT NULL DEFAULT '{}' CHECK (cardinality(tags) <= 20),
  UNIQUE (id, workspace_id)
);

CREATE TABLE study_book_chapters (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  book_id       UUID NOT NULL,
  created_by    UUID NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  numero        SMALLINT CHECK (numero IS NULL OR numero BETWEEN 0 AND 999),
  titolo        TEXT NOT NULL CHECK (length(titolo) BETWEEN 1 AND 300),
  riassunto     TEXT CHECK (riassunto IS NULL OR length(riassunto) <= 2000),
  cosa_usero    TEXT CHECK (cosa_usero IS NULL OR length(cosa_usero) <= 2000),
  note          TEXT CHECK (note IS NULL OR length(note) <= 20000),
  completato_il DATE,
  ripassi       SMALLINT NOT NULL DEFAULT 0 CHECK (ripassi BETWEEN 0 AND 3),
  FOREIGN KEY (book_id, workspace_id) REFERENCES study_books (id, workspace_id) ON DELETE CASCADE
);
CREATE INDEX study_book_chapters_book_idx ON study_book_chapters (book_id);

CREATE TABLE study_courses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by      UUID NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  titolo          TEXT NOT NULL CHECK (length(titolo) BETWEEN 1 AND 300),
  ente            TEXT CHECK (ente IS NULL OR length(ente) <= 200),
  tipo            TEXT NOT NULL DEFAULT 'corso' CHECK (tipo IN ('universita','corso','licenza','altro')),
  stato           TEXT NOT NULL DEFAULT 'in_corso' CHECK (stato IN ('da_iniziare','in_corso','completato','sospeso')),
  data_inizio     DATE,
  data_fine       DATE,
  piattaforma_url TEXT CHECK (piattaforma_url IS NULL OR length(piattaforma_url) <= 2048),
  riassunto       TEXT CHECK (riassunto IS NULL OR length(riassunto) <= 20000),
  note            TEXT CHECK (note IS NULL OR length(note) <= 20000),
  tags            TEXT[] NOT NULL DEFAULT '{}' CHECK (cardinality(tags) <= 20),
  UNIQUE (id, workspace_id)
);

CREATE TABLE study_course_modules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  course_id     UUID NOT NULL,
  created_by    UUID NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ordine        SMALLINT CHECK (ordine IS NULL OR ordine BETWEEN 0 AND 999),
  titolo        TEXT NOT NULL CHECK (length(titolo) BETWEEN 1 AND 300),
  stato         TEXT NOT NULL DEFAULT 'da_fare' CHECK (stato IN ('da_fare','in_corso','fatto')),
  data          DATE,
  link          TEXT CHECK (link IS NULL OR length(link) <= 2048),
  riassunto     TEXT CHECK (riassunto IS NULL OR length(riassunto) <= 20000),
  note          TEXT CHECK (note IS NULL OR length(note) <= 20000),
  completato_il DATE,
  ripassi       SMALLINT NOT NULL DEFAULT 0 CHECK (ripassi BETWEEN 0 AND 3),
  FOREIGN KEY (course_id, workspace_id) REFERENCES study_courses (id, workspace_id) ON DELETE CASCADE
);
CREATE INDEX study_course_modules_course_idx ON study_course_modules (course_id);

CREATE TABLE study_exam_questions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  course_id     UUID NOT NULL,
  created_by    UUID NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  domanda       TEXT NOT NULL CHECK (length(domanda) BETWEEN 1 AND 2000),
  risposta      TEXT CHECK (risposta IS NULL OR length(risposta) <= 20000),
  stato         TEXT NOT NULL DEFAULT 'da_studiare' CHECK (stato IN ('da_studiare','incerta','sicura')),
  FOREIGN KEY (course_id, workspace_id) REFERENCES study_courses (id, workspace_id) ON DELETE CASCADE
);
CREATE INDEX study_exam_questions_course_idx ON study_exam_questions (course_id);

CREATE TABLE study_exams (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by    UUID NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  titolo        TEXT NOT NULL CHECK (length(titolo) BETWEEN 1 AND 300),
  tipo          TEXT NOT NULL DEFAULT 'esame' CHECK (tipo IN ('esame','scadenza','consegna','altro')),
  data          DATE NOT NULL,
  course_id     UUID REFERENCES study_courses(id) ON DELETE SET NULL,
  luogo         TEXT CHECK (luogo IS NULL OR length(luogo) <= 200),
  stato         TEXT NOT NULL DEFAULT 'in_programma' CHECK (stato IN ('in_programma','superato','non_superato','rinviato')),
  voto          TEXT CHECK (voto IS NULL OR length(voto) <= 20),
  note          TEXT CHECK (note IS NULL OR length(note) <= 20000),
  tags          TEXT[] NOT NULL DEFAULT '{}' CHECK (cardinality(tags) <= 20)
);
CREATE INDEX study_exams_data_idx ON study_exams (workspace_id, data);

CREATE TABLE study_readings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by    UUID NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  titolo        TEXT NOT NULL CHECK (length(titolo) BETWEEN 1 AND 300),
  testata       TEXT CHECK (testata IS NULL OR length(testata) <= 200),
  numero        TEXT CHECK (numero IS NULL OR length(numero) <= 40),
  data          DATE,
  tipo          TEXT NOT NULL DEFAULT 'rivista' CHECK (tipo IN ('rivista','articolo','dispensa','altro')),
  stato         TEXT NOT NULL DEFAULT 'da_leggere' CHECK (stato IN ('da_leggere','letto')),
  link          TEXT CHECK (link IS NULL OR length(link) <= 2048),
  riassunto     TEXT CHECK (riassunto IS NULL OR length(riassunto) <= 20000),
  note          TEXT CHECK (note IS NULL OR length(note) <= 20000),
  tags          TEXT[] NOT NULL DEFAULT '{}' CHECK (cardinality(tags) <= 20),
  completato_il DATE,
  ripassi       SMALLINT NOT NULL DEFAULT 0 CHECK (ripassi BETWEEN 0 AND 3),
  UNIQUE (id, workspace_id)
);

-- Highlights: appartengono a un libro, a un corso o a una lettura (uno solo).
CREATE TABLE study_highlights (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by    UUID NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  book_id       UUID,
  course_id     UUID,
  reading_id    UUID,
  testo         TEXT NOT NULL CHECK (length(testo) BETWEEN 1 AND 5000),
  pagina        TEXT CHECK (pagina IS NULL OR length(pagina) <= 20),
  nota          TEXT CHECK (nota IS NULL OR length(nota) <= 2000),
  tags          TEXT[] NOT NULL DEFAULT '{}' CHECK (cardinality(tags) <= 20),
  completato_il DATE DEFAULT CURRENT_DATE,
  ripassi       SMALLINT NOT NULL DEFAULT 0 CHECK (ripassi BETWEEN 0 AND 3),
  CHECK (num_nonnulls(book_id, course_id, reading_id) = 1),
  FOREIGN KEY (book_id, workspace_id) REFERENCES study_books (id, workspace_id) ON DELETE CASCADE,
  FOREIGN KEY (course_id, workspace_id) REFERENCES study_courses (id, workspace_id) ON DELETE CASCADE,
  FOREIGN KEY (reading_id, workspace_id) REFERENCES study_readings (id, workspace_id) ON DELETE CASCADE
);
CREATE INDEX study_highlights_book_idx ON study_highlights (book_id) WHERE book_id IS NOT NULL;
CREATE INDEX study_highlights_course_idx ON study_highlights (course_id) WHERE course_id IS NOT NULL;
CREATE INDEX study_highlights_reading_idx ON study_highlights (reading_id) WHERE reading_id IS NOT NULL;

-- Regole di accesso e blocchi, uguali per tutte le tabelle nuove ------------
-- - accesso: solo il proprietario dello spazio di lavoro (lettura e scrittura);
-- - updated_at aggiornato a ogni modifica;
-- - lo spazio di lavoro di una riga non si può cambiare (come nella 0016).
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'study_books', 'study_book_chapters', 'study_courses', 'study_course_modules',
    'study_exam_questions', 'study_exams', 'study_readings', 'study_highlights'
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
