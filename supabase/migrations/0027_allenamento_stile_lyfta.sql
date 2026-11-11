-- 0027 — Allenamento "come Lyfta": serie con tipo, range di ripetizioni, esercizi a tempo,
-- recupero/note/superserie per esercizio e programmi di schede.
--
-- Solo colonne NUOVE, tutte facoltative o con un valore predefinito: nessuna riga,
-- colonna o tabella esistente viene rimossa, rinominata o riscritta.
-- Le serie già presenti diventano di tipo "normale"; gli esercizi già presenti
-- risultano "peso e ripetizioni".

-- Programma di una scheda (es. "PPL x UL"): raggruppa le schede come in Lyfta.
ALTER TABLE wk_templates ADD COLUMN IF NOT EXISTS programma TEXT CHECK (programma IS NULL OR length(programma) <= 200);

-- Come si misura un esercizio: peso e ripetizioni, oppure a tempo (plank, cyclette, camminata).
ALTER TABLE wk_exercises ADD COLUMN IF NOT EXISTS misura TEXT NOT NULL DEFAULT 'peso_rip' CHECK (misura IN ('peso_rip', 'durata'));

-- Esercizio di una scheda: superserie e dettaglio serie per serie
-- (elenco di serie con tipo, ripetizioni o range, carico, durata).
ALTER TABLE wk_template_items ADD COLUMN IF NOT EXISTS superset SMALLINT CHECK (superset IS NULL OR superset BETWEEN 1 AND 20);
ALTER TABLE wk_template_items ADD COLUMN IF NOT EXISTS dettaglio JSONB CHECK (dettaglio IS NULL OR (jsonb_typeof(dettaglio) = 'array' AND jsonb_array_length(dettaglio) <= 30));

-- Serie svolta: tipo, range di ripetizioni previsto, durata (esercizi a tempo),
-- e copia dei dati dell'esercizio presi dalla scheda (recupero, superserie, note).
ALTER TABLE wk_sets ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'normale' CHECK (tipo IN ('normale', 'riscaldamento', 'drop', 'cedimento'));
ALTER TABLE wk_sets ADD COLUMN IF NOT EXISTS rip_min SMALLINT CHECK (rip_min IS NULL OR rip_min BETWEEN 0 AND 1000);
ALTER TABLE wk_sets ADD COLUMN IF NOT EXISTS rip_max SMALLINT CHECK (rip_max IS NULL OR rip_max BETWEEN 0 AND 1000);
ALTER TABLE wk_sets ADD COLUMN IF NOT EXISTS durata_s INTEGER CHECK (durata_s IS NULL OR durata_s BETWEEN 0 AND 86400);
ALTER TABLE wk_sets ADD COLUMN IF NOT EXISTS recupero_s SMALLINT CHECK (recupero_s IS NULL OR recupero_s BETWEEN 0 AND 1800);
ALTER TABLE wk_sets ADD COLUMN IF NOT EXISTS superset SMALLINT CHECK (superset IS NULL OR superset BETWEEN 1 AND 20);
ALTER TABLE wk_sets ADD COLUMN IF NOT EXISTS nota_esercizio TEXT CHECK (nota_esercizio IS NULL OR length(nota_esercizio) <= 1000);
