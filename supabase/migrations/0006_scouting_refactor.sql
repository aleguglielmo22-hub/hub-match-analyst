-- ============================================================
-- SCOUTING REFACTOR — riallineamento alla scheda valutazione ufficiale
-- Drop: 14 rating "legacy", morfotipo, caratteristiche_atletiche
-- Add:  5 enum nuovi + 6 valori in voto_potenziale + 71 rating
--       + 3 selettori fisici + 2 enum SI/NO/A_VOLTE + 5 boolean
-- Tutti i rating accettano interi 1-10 via CHECK (col BETWEEN 1 AND 10).
-- ============================================================

-- ------------------------------------------------------------
-- 1) Indici da pulire prima di droppare le colonne
-- ------------------------------------------------------------
DROP INDEX IF EXISTS idx_players_caratt_gin;

-- ------------------------------------------------------------
-- 2) Drop dei rating legacy + morfotipo + caratteristiche_atletiche
-- ------------------------------------------------------------
ALTER TABLE players
  DROP COLUMN IF EXISTS val_ricezione_orientata,
  DROP COLUMN IF EXISTS val_trasmissione_corto,
  DROP COLUMN IF EXISTS val_trasmissione_lungo,
  DROP COLUMN IF EXISTS val_dribbling,
  DROP COLUMN IF EXISTS val_conclusione,
  DROP COLUMN IF EXISTS val_cross,
  DROP COLUMN IF EXISTS val_lettura_spazi,
  DROP COLUMN IF EXISTS val_smarcamento,
  DROP COLUMN IF EXISTS val_posizionamento_difensivo,
  DROP COLUMN IF EXISTS val_transizione_difensiva,
  DROP COLUMN IF EXISTS val_leadership,
  DROP COLUMN IF EXISTS val_concentrazione,
  DROP COLUMN IF EXISTS val_aggressivita,
  DROP COLUMN IF EXISTS val_decision_making,
  DROP COLUMN IF EXISTS morfotipo,
  DROP COLUMN IF EXISTS caratteristiche_atletiche;

-- Drop dell'enum non più referenziato.
DROP TYPE IF EXISTS morfotipo_enum;

-- ------------------------------------------------------------
-- 3) Estensione voto_potenziale_enum con B2 e D
-- (PostgreSQL >= 12 supporta ADD VALUE in transazione.)
-- ------------------------------------------------------------
ALTER TYPE voto_potenziale_enum ADD VALUE IF NOT EXISTS 'B2' AFTER 'B1';
ALTER TYPE voto_potenziale_enum ADD VALUE IF NOT EXISTS 'D' AFTER 'C';

-- ------------------------------------------------------------
-- 4) Nuovi enum
-- ------------------------------------------------------------
CREATE TYPE struttura_corporea_enum AS ENUM (
  'ATLETICO','ROBUSTO','LONGILINEO','MASSICCIO','NORMOTIPO','BREVILINEO'
);

CREATE TYPE gesti_motori_enum AS ENUM (
  'CLASSE','STILE','NORMALE','SGRAZIATO','ELEGANTE'
);

CREATE TYPE muscolatura_enum AS ENUM (
  'SCARNA','NORMALE','EVIDENZIATA','MASSICCIA'
);

CREATE TYPE si_no_avolte_enum AS ENUM ('SI','NO','A_VOLTE');

-- ------------------------------------------------------------
-- 5) Nuove colonne: selettori fisici + SI/NO/A_VOLTE + influenze + 71 rating
-- ------------------------------------------------------------
ALTER TABLE players
  -- B. Caratteristiche fisiche
  ADD COLUMN struttura_corporea struttura_corporea_enum,
  ADD COLUMN gesti_motori gesti_motori_enum,
  ADD COLUMN muscolatura muscolatura_enum,

  -- A. Comportamentali — 14 rating
  ADD COLUMN behav_carisma                  SMALLINT CHECK (behav_carisma                  BETWEEN 1 AND 10),
  ADD COLUMN behav_autostima                SMALLINT CHECK (behav_autostima                BETWEEN 1 AND 10),
  ADD COLUMN behav_personalita              SMALLINT CHECK (behav_personalita              BETWEEN 1 AND 10),
  ADD COLUMN behav_spirito_sacrificio       SMALLINT CHECK (behav_spirito_sacrificio       BETWEEN 1 AND 10),
  ADD COLUMN behav_spirito_comprensione     SMALLINT CHECK (behav_spirito_comprensione     BETWEEN 1 AND 10),
  ADD COLUMN behav_generosita               SMALLINT CHECK (behav_generosita               BETWEEN 1 AND 10),
  ADD COLUMN behav_aggressivita             SMALLINT CHECK (behav_aggressivita             BETWEEN 1 AND 10),
  ADD COLUMN behav_autocritica              SMALLINT CHECK (behav_autocritica              BETWEEN 1 AND 10),
  ADD COLUMN behav_spirito_collaborativo    SMALLINT CHECK (behav_spirito_collaborativo    BETWEEN 1 AND 10),
  ADD COLUMN behav_atteggiamento_in_campo   SMALLINT CHECK (behav_atteggiamento_in_campo   BETWEEN 1 AND 10),
  ADD COLUMN behav_atteggiamento_fuori_campo SMALLINT CHECK (behav_atteggiamento_fuori_campo BETWEEN 1 AND 10),
  ADD COLUMN behav_concentrazione           SMALLINT CHECK (behav_concentrazione           BETWEEN 1 AND 10),
  ADD COLUMN behav_temperamento             SMALLINT CHECK (behav_temperamento             BETWEEN 1 AND 10),
  ADD COLUMN behav_tenacia                  SMALLINT CHECK (behav_tenacia                  BETWEEN 1 AND 10),

  -- A. Domande specifiche
  ADD COLUMN behav_delega_altri             si_no_avolte_enum,
  ADD COLUMN behav_assume_responsabilita    si_no_avolte_enum,

  -- A. Influenze negative
  ADD COLUMN influenza_neg_propri_errori    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN influenza_neg_errore_compagno  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN influenza_neg_arbitro          BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN influenza_neg_risultato        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN influenza_neg_allenatore       BOOLEAN NOT NULL DEFAULT FALSE,

  -- C. Atletiche — 12 rating
  ADD COLUMN atl_velocita_senza_palla       SMALLINT CHECK (atl_velocita_senza_palla       BETWEEN 1 AND 10),
  ADD COLUMN atl_accelerazione              SMALLINT CHECK (atl_accelerazione              BETWEEN 1 AND 10),
  ADD COLUMN atl_cambi_direzione            SMALLINT CHECK (atl_cambi_direzione            BETWEEN 1 AND 10),
  ADD COLUMN atl_elevazione                 SMALLINT CHECK (atl_elevazione                 BETWEEN 1 AND 10),
  ADD COLUMN atl_resistenza_fatica          SMALLINT CHECK (atl_resistenza_fatica          BETWEEN 1 AND 10),
  ADD COLUMN atl_flessibilita               SMALLINT CHECK (atl_flessibilita               BETWEEN 1 AND 10),
  ADD COLUMN atl_rapidita                   SMALLINT CHECK (atl_rapidita                   BETWEEN 1 AND 10),
  ADD COLUMN atl_agilita                    SMALLINT CHECK (atl_agilita                    BETWEEN 1 AND 10),
  ADD COLUMN atl_cambio_passo               SMALLINT CHECK (atl_cambio_passo               BETWEEN 1 AND 10),
  ADD COLUMN atl_forza                      SMALLINT CHECK (atl_forza                      BETWEEN 1 AND 10),
  ADD COLUMN atl_potenza_contrasti          SMALLINT CHECK (atl_potenza_contrasti          BETWEEN 1 AND 10),
  ADD COLUMN atl_abilita_acrobatica         SMALLINT CHECK (atl_abilita_acrobatica         BETWEEN 1 AND 10),

  -- D. Tecnica — 8 rating
  ADD COLUMN tec_lato_dominante             SMALLINT CHECK (tec_lato_dominante             BETWEEN 1 AND 10),
  ADD COLUMN tec_piede_dx                   SMALLINT CHECK (tec_piede_dx                   BETWEEN 1 AND 10),
  ADD COLUMN tec_piede_sx                   SMALLINT CHECK (tec_piede_sx                   BETWEEN 1 AND 10),
  ADD COLUMN tec_gioco_testa                SMALLINT CHECK (tec_gioco_testa                BETWEEN 1 AND 10),
  ADD COLUMN tec_ricezione_piede            SMALLINT CHECK (tec_ricezione_piede            BETWEEN 1 AND 10),
  ADD COLUMN tec_ricezione_petto            SMALLINT CHECK (tec_ricezione_petto            BETWEEN 1 AND 10),
  ADD COLUMN tec_trasmissione_piede         SMALLINT CHECK (tec_trasmissione_piede         BETWEEN 1 AND 10),
  ADD COLUMN tec_trasmissione_testa         SMALLINT CHECK (tec_trasmissione_testa         BETWEEN 1 AND 10),

  -- D. Coordinative — 8 rating
  ADD COLUMN coord_equilibrio               SMALLINT CHECK (coord_equilibrio               BETWEEN 1 AND 10),
  ADD COLUMN coord_differenziazione         SMALLINT CHECK (coord_differenziazione         BETWEEN 1 AND 10),
  ADD COLUMN coord_ritmizzazione            SMALLINT CHECK (coord_ritmizzazione            BETWEEN 1 AND 10),
  ADD COLUMN coord_orientamento             SMALLINT CHECK (coord_orientamento             BETWEEN 1 AND 10),
  ADD COLUMN coord_reazione                 SMALLINT CHECK (coord_reazione                 BETWEEN 1 AND 10),
  ADD COLUMN coord_accoppiamento_motorio    SMALLINT CHECK (coord_accoppiamento_motorio    BETWEEN 1 AND 10),
  ADD COLUMN coord_adattamento              SMALLINT CHECK (coord_adattamento              BETWEEN 1 AND 10),
  ADD COLUMN coord_anticipazione            SMALLINT CHECK (coord_anticipazione            BETWEEN 1 AND 10),

  -- E. Tattica individuale — Fase di possesso — 13 rating
  ADD COLUMN tatti_poss_visione_periferica  SMALLINT CHECK (tatti_poss_visione_periferica  BETWEEN 1 AND 10),
  ADD COLUMN tatti_poss_smarcamento         SMALLINT CHECK (tatti_poss_smarcamento         BETWEEN 1 AND 10),
  ADD COLUMN tatti_poss_controllo_difesa_palla SMALLINT CHECK (tatti_poss_controllo_difesa_palla BETWEEN 1 AND 10),
  ADD COLUMN tatti_poss_dribbling           SMALLINT CHECK (tatti_poss_dribbling           BETWEEN 1 AND 10),
  ADD COLUMN tatti_poss_occupazione_spazio  SMALLINT CHECK (tatti_poss_occupazione_spazio  BETWEEN 1 AND 10),
  ADD COLUMN tatti_poss_taglio              SMALLINT CHECK (tatti_poss_taglio              BETWEEN 1 AND 10),
  ADD COLUMN tatti_poss_sovrapposizione     SMALLINT CHECK (tatti_poss_sovrapposizione     BETWEEN 1 AND 10),
  ADD COLUMN tatti_poss_triangolazione      SMALLINT CHECK (tatti_poss_triangolazione      BETWEEN 1 AND 10),
  ADD COLUMN tatti_poss_finta               SMALLINT CHECK (tatti_poss_finta               BETWEEN 1 AND 10),
  ADD COLUMN tatti_poss_falli_laterali      SMALLINT CHECK (tatti_poss_falli_laterali      BETWEEN 1 AND 10),
  ADD COLUMN tatti_poss_fantasia_estro      SMALLINT CHECK (tatti_poss_fantasia_estro      BETWEEN 1 AND 10),
  ADD COLUMN tatti_poss_vedere_porta        SMALLINT CHECK (tatti_poss_vedere_porta        BETWEEN 1 AND 10),
  ADD COLUMN tatti_poss_agisce_stile        SMALLINT CHECK (tatti_poss_agisce_stile        BETWEEN 1 AND 10),

  -- E. Tattica individuale — Fase di non possesso — 8 rating
  ADD COLUMN tatti_nposs_marcamento         SMALLINT CHECK (tatti_nposs_marcamento         BETWEEN 1 AND 10),
  ADD COLUMN tatti_nposs_pressione          SMALLINT CHECK (tatti_nposs_pressione          BETWEEN 1 AND 10),
  ADD COLUMN tatti_nposs_anticipo           SMALLINT CHECK (tatti_nposs_anticipo           BETWEEN 1 AND 10),
  ADD COLUMN tatti_nposs_intercettamento    SMALLINT CHECK (tatti_nposs_intercettamento    BETWEEN 1 AND 10),
  ADD COLUMN tatti_nposs_contrasto_diretto  SMALLINT CHECK (tatti_nposs_contrasto_diretto  BETWEEN 1 AND 10),
  ADD COLUMN tatti_nposs_difesa_zona        SMALLINT CHECK (tatti_nposs_difesa_zona        BETWEEN 1 AND 10),
  ADD COLUMN tatti_nposs_ripresa_fine_azione SMALLINT CHECK (tatti_nposs_ripresa_fine_azione BETWEEN 1 AND 10),
  ADD COLUMN tatti_nposs_ripresa_dopo_perdita SMALLINT CHECK (tatti_nposs_ripresa_dopo_perdita BETWEEN 1 AND 10),

  -- F. Tattica applicata — Fase di possesso — 3 rating
  ADD COLUMN tappl_poss_lettura_veloce      SMALLINT CHECK (tappl_poss_lettura_veloce      BETWEEN 1 AND 10),
  ADD COLUMN tappl_poss_fantasia_gioco      SMALLINT CHECK (tappl_poss_fantasia_gioco      BETWEEN 1 AND 10),
  ADD COLUMN tappl_poss_velocita_esecuzione SMALLINT CHECK (tappl_poss_velocita_esecuzione BETWEEN 1 AND 10),

  -- F. Tattica applicata — Fase di non possesso — 4 rating
  ADD COLUMN tappl_nposs_scalare            SMALLINT CHECK (tappl_nposs_scalare            BETWEEN 1 AND 10),
  ADD COLUMN tappl_nposs_pressing           SMALLINT CHECK (tappl_nposs_pressing           BETWEEN 1 AND 10),
  ADD COLUMN tappl_nposs_partecipazione_difensiva SMALLINT CHECK (tappl_nposs_partecipazione_difensiva BETWEEN 1 AND 10),
  ADD COLUMN tappl_nposs_anticipazione_gioco SMALLINT CHECK (tappl_nposs_anticipazione_gioco BETWEEN 1 AND 10),

  -- F. Tattica applicata — Ruolo — 1 rating
  ADD COLUMN tappl_ruolo_comportamento      SMALLINT CHECK (tappl_ruolo_comportamento      BETWEEN 1 AND 10);

-- ------------------------------------------------------------
-- 6) Indici sui nuovi selettori usati nei filtri
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_players_struttura    ON players (struttura_corporea);
CREATE INDEX IF NOT EXISTS idx_players_gesti        ON players (gesti_motori);
CREATE INDEX IF NOT EXISTS idx_players_muscolatura  ON players (muscolatura);
