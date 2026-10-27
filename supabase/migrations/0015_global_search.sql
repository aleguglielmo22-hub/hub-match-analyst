-- 0015 — Ricerca globale in tutte le sezioni.
-- Una funzione con i permessi di chi cerca (SECURITY INVOKER): le regole di
-- accesso (RLS) valgono come per ogni altra lettura. Nessun dato modificato.

-- 1) Accenti e maiuscole non contano ------------------------------------------
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

-- Normalizzazione per il confronto: minuscole, senza accenti, spazi compattati.
-- (unaccent() non è IMMUTABLE di suo: la si richiama con il dizionario esplicito.)
CREATE OR REPLACE FUNCTION search_norm(t TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path = public, extensions AS $$
  SELECT lower(regexp_replace(btrim(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(t, ''))), '\s+', ' ', 'g'))
$$;

-- 2) Ricerca --------------------------------------------------------------------
-- Ogni sezione: al massimo 8 risultati, ordinati per pertinenza.
-- `sezione`: player | observation | set_piece | situational | archive | related.
-- "related" = piazzati e voci del Cloud collegati ai giocatori trovati
-- (`collegato_a` = nome del giocatore). Elementi nel cestino esclusi.
-- `p_workspace`: workspace corrente (chi è in più workspace vede solo quello).
CREATE OR REPLACE FUNCTION search_all(p_workspace UUID, p_query TEXT)
RETURNS TABLE (
  sezione      TEXT,
  tipo         TEXT,
  id           UUID,
  titolo       TEXT,
  sottotitolo  TEXT,
  data         DATE,
  punteggio    REAL,
  collegato_a  TEXT,
  -- Elemento da aprire se diverso da `id` (osservazione → suo giocatore).
  apri_id      UUID
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, extensions AS $$
WITH q AS (
  SELECT search_norm(p_query) AS n,
         -- % e _ cercati come caratteri, non come jolly.
         '%' || replace(replace(replace(search_norm(p_query), '\', '\\'), '%', '\%'), '_', '\_') || '%' AS pat
),
players_hit AS (
  SELECT p.id, p.nome || ' ' || p.cognome AS titolo,
         concat_ws(' · ', p.ruolo_principale::text, p.squadra_attuale) AS sottotitolo,
         p.ultima_osservazione AS data,
         (word_similarity(q.n, search_norm(p.nome || ' ' || p.cognome))
          + CASE WHEN search_norm(p.cognome) LIKE q.n || '%' OR search_norm(p.nome) LIKE q.n || '%' THEN 0.5 ELSE 0 END)::real AS punteggio
  FROM players p, q
  WHERE p.workspace_id = p_workspace AND p.deleted_at IS NULL
    AND search_norm(p.search_text) LIKE q.pat
  ORDER BY punteggio DESC, p.updated_at DESC
  LIMIT 8
),
obs_hit AS (
  SELECT o.id, pl.nome || ' ' || pl.cognome AS titolo,
         left(o.nota, 120) AS sottotitolo, o.data_osservazione AS data,
         word_similarity(q.n, search_norm(o.nota))::real AS punteggio, o.player_id
  FROM player_observations o JOIN players pl ON pl.id = o.player_id, q
  WHERE o.workspace_id = p_workspace AND pl.deleted_at IS NULL
    AND search_norm(o.nota) LIKE q.pat
  ORDER BY punteggio DESC, o.data_osservazione DESC
  LIMIT 8
),
sp_hit AS (
  SELECT s.id, s.titolo,
         concat_ws(' · ', concat_ws(' vs ', s.squadra_esecutrice, s.squadra_avversaria), s.competizione) AS sottotitolo,
         s.data_evento AS data,
         (word_similarity(q.n, search_norm(s.titolo))
          + CASE WHEN search_norm(s.titolo) LIKE q.pat THEN 0.3 ELSE 0 END)::real AS punteggio
  FROM set_pieces s, q
  WHERE s.workspace_id = p_workspace AND s.deleted_at IS NULL
    AND search_norm(concat_ws(' ', s.titolo, s.squadra_esecutrice, s.squadra_avversaria, s.competizione, s.stagione)) LIKE q.pat
  ORDER BY punteggio DESC, s.updated_at DESC
  LIMIT 8
),
st_hit AS (
  SELECT t.id, t.titolo, t.macro_fase::text AS sottotitolo, t.updated_at::date AS data,
         (word_similarity(q.n, search_norm(t.titolo))
          + CASE WHEN search_norm(t.titolo) LIKE q.pat THEN 0.3 ELSE 0 END)::real AS punteggio
  FROM situational_tactics t, q
  WHERE t.workspace_id = p_workspace AND t.deleted_at IS NULL
    AND search_norm(concat_ws(' ', t.titolo, t.descrizione_flusso, t.regole_provocazione, t.varianti)) LIKE q.pat
  ORDER BY punteggio DESC, t.updated_at DESC
  LIMIT 8
),
ar_hit AS (
  -- Indice esistente (titolo, descrizione, etichette dei link) + confronto senza accenti.
  SELECT a.id, a.titolo_archivio AS titolo, a.categoria_lavoro::text AS sottotitolo, a.data_lavoro AS data,
         (coalesce(ts_rank(a.search_vector, plainto_tsquery('italian', p_query)), 0)
          + word_similarity(q.n, search_norm(a.titolo_archivio))
          + CASE WHEN search_norm(a.titolo_archivio) LIKE q.pat THEN 0.3 ELSE 0 END)::real AS punteggio
  FROM archive_items a, q
  WHERE a.workspace_id = p_workspace AND a.deleted_at IS NULL
    AND (a.search_vector @@ plainto_tsquery('italian', p_query)
         OR search_norm(concat_ws(' ', a.titolo_archivio, a.descrizione_estesa)) LIKE q.pat
         OR EXISTS (SELECT 1 FROM archive_item_links l
                    WHERE l.archive_item_id = a.id AND search_norm(l.etichetta) LIKE q.pat))
  ORDER BY punteggio DESC, a.data_lavoro DESC
  LIMIT 8
),
top_players AS (
  SELECT id, titolo FROM players_hit ORDER BY punteggio DESC LIMIT 3
),
related AS (
  (SELECT 'set_piece'::text AS tipo, s.id, s.titolo,
          concat_ws(' · ', concat_ws(' vs ', s.squadra_esecutrice, s.squadra_avversaria), s.competizione) AS sottotitolo,
          s.data_evento AS data, tp.titolo AS collegato_a
   FROM top_players tp
   JOIN set_piece_players spp ON spp.player_id = tp.id
   JOIN set_pieces s ON s.id = spp.set_piece_id AND s.deleted_at IS NULL
   ORDER BY s.updated_at DESC LIMIT 8)
  UNION
  (SELECT 'archive', a.id, a.titolo_archivio, a.categoria_lavoro::text, a.data_lavoro, tp.titolo
   FROM top_players tp
   JOIN archive_item_players aip ON aip.player_id = tp.id
   JOIN archive_items a ON a.id = aip.archive_item_id AND a.deleted_at IS NULL
   ORDER BY a.data_lavoro DESC LIMIT 8)
)
SELECT 'player', 'player', id, titolo, sottotitolo, data, punteggio, NULL, NULL::uuid FROM players_hit
UNION ALL SELECT 'observation', 'observation', id, titolo, sottotitolo, data, punteggio, NULL, player_id FROM obs_hit
UNION ALL SELECT 'set_piece', 'set_piece', id, titolo, sottotitolo, data, punteggio, NULL, NULL FROM sp_hit
UNION ALL SELECT 'situational', 'situational', id, titolo, sottotitolo, data, punteggio, NULL, NULL FROM st_hit
UNION ALL SELECT 'archive', 'archive', id, titolo, sottotitolo, data, punteggio, NULL, NULL FROM ar_hit
UNION ALL SELECT 'related', tipo, id, titolo, sottotitolo, data, 0::real, collegato_a, NULL FROM related
$$;

-- Solo utenti con login; la funzione legge con i loro permessi (RLS).
REVOKE EXECUTE ON FUNCTION search_all(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION search_all(UUID, TEXT) TO authenticated;
