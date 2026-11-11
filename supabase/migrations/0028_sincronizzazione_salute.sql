-- 0028 — Sincronizzazione automatica dei parametri vitali (iPhone → app).
--
-- Una tabella nuova con l'IMPRONTA della chiave di sincronizzazione (la chiave
-- vera non viene mai salvata: se il database fosse letto, non si risalirebbe
-- alla chiave) e una funzione che l'iPhone usa per inviare i valori.
-- La funzione accetta solo richieste con la chiave giusta, scrive solo nella tabella
-- dei parametri e solo per i tipi previsti. Non cambia nulla di esistente.
-- I valori inseriti a mano non vengono mai sovrascritti.

CREATE TABLE health_sync (
  workspace_id  UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  token_hash    TEXT NOT NULL CHECK (length(token_hash) = 64),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_sync_at  TIMESTAMPTZ
);

ALTER TABLE health_sync ENABLE ROW LEVEL SECURITY;
CREATE POLICY health_sync_owner_only ON health_sync FOR ALL TO authenticated
  USING (workspace_id IN (SELECT current_user_owned_workspaces()))
  WITH CHECK (workspace_id IN (SELECT current_user_owned_workspaces()));

CREATE OR REPLACE FUNCTION health_ingest(p_token TEXT, p_rows JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ws UUID;
  usr UUID;
  r JSONB;
  t TEXT;
  d DATE;
  v NUMERIC;
  n INTEGER := 0;
BEGIN
  IF p_token IS NULL OR length(p_token) < 32 OR p_rows IS NULL
     OR jsonb_typeof(p_rows) <> 'array' OR jsonb_array_length(p_rows) > 5000 THEN
    RAISE EXCEPTION 'richiesta non valida' USING ERRCODE = '22023';
  END IF;

  SELECT s.workspace_id, w.owner_id INTO ws, usr
    FROM health_sync s JOIN workspaces w ON w.id = s.workspace_id
   WHERE s.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  IF ws IS NULL THEN
    RAISE EXCEPTION 'chiave non valida' USING ERRCODE = '28000';
  END IF;

  FOR r IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    BEGIN
      t := r ->> 'tipo';
      d := (r ->> 'data')::date;
      v := (r ->> 'valore')::numeric;
    EXCEPTION WHEN others THEN
      CONTINUE;
    END;
    IF t IS NULL OR v IS NULL OR d IS NULL OR v < 0 OR v > 1000000
       OR d < DATE '2000-01-01' OR d > CURRENT_DATE + 2
       OR t NOT IN ('peso','battito_riposo','sonno_ore','passi','stress','calorie_attive',
                    'grasso_corporeo','spo2','hrv','pressione_max','pressione_min') THEN
      CONTINUE;
    END IF;
    INSERT INTO health_metrics (workspace_id, created_by, data, tipo, valore, fonte)
    VALUES (ws, usr, d, t, round(v, 2), 'import')
    ON CONFLICT (workspace_id, tipo, data) WHERE deleted_at IS NULL
    DO UPDATE SET valore = EXCLUDED.valore WHERE health_metrics.fonte = 'import';
    n := n + 1;
  END LOOP;

  UPDATE health_sync SET last_sync_at = NOW() WHERE workspace_id = ws;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION health_ingest(TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION health_ingest(TEXT, JSONB) TO anon, authenticated;
