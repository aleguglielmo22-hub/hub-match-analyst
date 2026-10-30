-- 0017 — Lavagna tattica disegnabile per Set Pieces e Training.
-- Due colonne nuove (vuote) per tabella: i dati della lavagna in JSON
-- (versione, tipo di campo, fotogrammi con i loro elementi) e il percorso
-- dell'anteprima PNG nel bucket "media". Nessun dato esistente modificato;
-- il vecchio campo "URL lavagna" resta com'è.

ALTER TABLE set_pieces
  ADD COLUMN IF NOT EXISTS lavagna_dati JSONB,
  ADD COLUMN IF NOT EXISTS lavagna_anteprima TEXT;

ALTER TABLE situational_tactics
  ADD COLUMN IF NOT EXISTS lavagna_dati JSONB,
  ADD COLUMN IF NOT EXISTS lavagna_anteprima TEXT;

-- Forma minima e dimensione massima (512 KB) dei dati della lavagna.
ALTER TABLE set_pieces
  ADD CONSTRAINT set_pieces_lavagna_dati_check CHECK (
    lavagna_dati IS NULL OR (
      jsonb_typeof(lavagna_dati) = 'object'
      AND lavagna_dati ? 'version'
      AND jsonb_typeof(lavagna_dati -> 'frames') = 'array'
      AND pg_column_size(lavagna_dati) <= 524288
    )
  ),
  -- L'anteprima sta nella cartella della riga stessa: {workspace}/set_piece/{id}/…
  ADD CONSTRAINT set_pieces_lavagna_anteprima_check CHECK (
    lavagna_anteprima IS NULL
    OR lavagna_anteprima LIKE workspace_id::text || '/set_piece/' || id::text || '/%'
  );

ALTER TABLE situational_tactics
  ADD CONSTRAINT situational_lavagna_dati_check CHECK (
    lavagna_dati IS NULL OR (
      jsonb_typeof(lavagna_dati) = 'object'
      AND lavagna_dati ? 'version'
      AND jsonb_typeof(lavagna_dati -> 'frames') = 'array'
      AND pg_column_size(lavagna_dati) <= 524288
    )
  ),
  ADD CONSTRAINT situational_lavagna_anteprima_check CHECK (
    lavagna_anteprima IS NULL
    OR lavagna_anteprima LIKE workspace_id::text || '/situational/' || id::text || '/%'
  );

-- Registrazione dell'anteprima senza cambiare la data di modifica: caricare
-- o rigenerare il PNG non cambia il contenuto (come collegamenti e
-- osservazioni). Con i permessi di chi la chiama (SECURITY INVOKER): le regole
-- di modifica (RLS) valgono come sempre. Restituisce il percorso precedente,
-- da togliere dal bucket dopo l'aggiornamento.
CREATE OR REPLACE FUNCTION set_board_preview(p_entity TEXT, p_id UUID, p_path TEXT)
RETURNS TEXT
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_old TEXT;
BEGIN
  IF p_entity NOT IN ('set_piece', 'situational') THEN
    RAISE EXCEPTION 'Tipo non valido: %', p_entity;
  END IF;

  -- Solo per questa transazione: set_updated_at() (0013) lascia la data com'è.
  PERFORM set_config('app.keep_updated_at', 'on', true);

  IF p_entity = 'set_piece' THEN
    SELECT lavagna_anteprima INTO v_old FROM set_pieces
      WHERE id = p_id AND lavagna_dati IS NOT NULL;
    UPDATE set_pieces SET lavagna_anteprima = p_path
      WHERE id = p_id AND lavagna_dati IS NOT NULL;
  ELSE
    SELECT lavagna_anteprima INTO v_old FROM situational_tactics
      WHERE id = p_id AND lavagna_dati IS NOT NULL;
    UPDATE situational_tactics SET lavagna_anteprima = p_path
      WHERE id = p_id AND lavagna_dati IS NOT NULL;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Elemento senza lavagna o non hai i permessi per modificarlo';
  END IF;

  PERFORM set_config('app.keep_updated_at', 'off', true);
  RETURN v_old;
END $$;

REVOKE EXECUTE ON FUNCTION set_board_preview(TEXT, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION set_board_preview(TEXT, UUID, TEXT) TO authenticated;
