-- 0016 — Lo spazio di lavoro di una riga non si può cambiare (AUDIT §2.3 S5).
-- Le regole di modifica (RLS) controllano chi può modificare una riga, ma non
-- impedivano di cambiarne lo `workspace_id` e "spostarla" in un altro spazio.
-- Un blocco prima di ogni modifica lo rifiuta; tutto il resto funziona come
-- prima. Nessun dato modificato, nessuna regola esistente rimossa.

CREATE OR REPLACE FUNCTION prevent_workspace_change() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.workspace_id IS DISTINCT FROM OLD.workspace_id THEN
    RAISE EXCEPTION 'Lo spazio di lavoro di un elemento non si può cambiare'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

-- Tutte le tabelle con `workspace_id`. Le tabelle "figlie" (file, link,
-- collegamenti) seguono la riga a cui appartengono.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'players', 'player_observations', 'set_pieces', 'situational_tactics',
    'archive_items', 'attachments', 'teams', 'competitions', 'seasons', 'tags',
    'workspace_members', 'user_preferences'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS lock_workspace_id ON %I', t);
    EXECUTE format(
      'CREATE TRIGGER lock_workspace_id BEFORE UPDATE OF workspace_id ON %I
         FOR EACH ROW EXECUTE FUNCTION prevent_workspace_change()', t);
  END LOOP;
END $$;

-- Controllo finale: un blocco per ogni tabella con `workspace_id`.
DO $$
DECLARE missing TEXT;
BEGIN
  SELECT string_agg(c.table_name, ', ') INTO missing
  FROM information_schema.columns c
  JOIN information_schema.tables t USING (table_schema, table_name)
  WHERE c.table_schema = 'public' AND c.column_name = 'workspace_id'
    AND t.table_type = 'BASE TABLE'
    AND NOT EXISTS (
      SELECT 1 FROM pg_trigger tg
      WHERE tg.tgrelid = format('public.%I', c.table_name)::regclass
        AND tg.tgname = 'lock_workspace_id' AND NOT tg.tgisinternal
    );
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'Blocco workspace_id mancante su: %', missing;
  END IF;
END $$;
