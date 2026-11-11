-- 0026 — Allenamenti in palestra: distinguere le serie previste da quelle fatte.
--
-- Una sola colonna nuova su wk_sets. Le serie già presenti risultano "fatte"
-- (valore predefinito vero), quindi i dati esistenti restano com'erano.
-- Quando un allenamento parte da una scheda, le serie nascono "non fatte" e
-- diventano "fatte" quando le spunti. Nessuna riga o colonna viene rimossa.

ALTER TABLE wk_sets ADD COLUMN IF NOT EXISTS fatta BOOLEAN NOT NULL DEFAULT TRUE;
