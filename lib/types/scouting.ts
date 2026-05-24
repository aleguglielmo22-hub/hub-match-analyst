/**
 * Tipi di dominio della sezione Scouting.
 * Allineato alla scheda valutazione ufficiale (vedi 01_scouting_spec.md).
 */
import type { Database } from "./database";

export type PlayerRow = Database["public"]["Tables"]["players"]["Row"];
export type PlayerInsert = Database["public"]["Tables"]["players"]["Insert"];
export type PlayerUpdate = Database["public"]["Tables"]["players"]["Update"];

// ============================================================
// ENUM + LABEL IT
// ============================================================

export type PassaportoEnum = "COMUNITARIO" | "EXTRACOMUNITARIO";
export const PASSAPORTO_VALUES: PassaportoEnum[] = [
  "COMUNITARIO",
  "EXTRACOMUNITARIO",
];
export const PASSAPORTO_LABEL: Record<PassaportoEnum, string> = {
  COMUNITARIO: "Comunitario",
  EXTRACOMUNITARIO: "Extracomunitario",
};

export type PiedeEnum = "DESTRO" | "SINISTRO" | "AMBIDESTRO";
export const PIEDE_VALUES: PiedeEnum[] = ["DESTRO", "SINISTRO", "AMBIDESTRO"];
export const PIEDE_LABEL: Record<PiedeEnum, string> = {
  DESTRO: "Destro",
  SINISTRO: "Sinistro",
  AMBIDESTRO: "Ambidestro",
};

export type RuoloEnum =
  | "POR" | "DC" | "DLS" | "DLD" | "DES" | "DED"
  | "CDC" | "CC" | "CED" | "CES"
  | "COC" | "COD" | "COS"
  | "AED" | "AES" | "SP" | "AC";

export const RUOLO_VALUES: RuoloEnum[] = [
  "POR","DC","DLS","DLD","DES","DED",
  "CDC","CC","CED","CES",
  "COC","COD","COS",
  "AED","AES","SP","AC",
];

export const RUOLO_LABEL: Record<RuoloEnum, string> = {
  POR: "Portiere",
  DC: "Difensore centrale",
  DLS: "Difensore laterale sinistro",
  DLD: "Difensore laterale destro",
  DES: "Difensore esterno sinistro",
  DED: "Difensore esterno destro",
  CDC: "Centrocampista difensivo / mediano",
  CC: "Centrocampista centrale / mezzala",
  CED: "Centrocampista esterno destro",
  CES: "Centrocampista esterno sinistro",
  COC: "Trequartista centrale",
  COD: "Trequartista destro",
  COS: "Trequartista sinistro",
  AED: "Ala esterna destra",
  AES: "Ala esterna sinistra",
  SP: "Seconda punta",
  AC: "Avanti centrale / punta",
};

export const RUOLO_GRUPPI: { label: string; values: RuoloEnum[] }[] = [
  { label: "Portiere", values: ["POR"] },
  { label: "Difensori", values: ["DC", "DLS", "DLD", "DES", "DED"] },
  { label: "Centrocampisti", values: ["CDC", "CC", "CED", "CES"] },
  { label: "Trequartisti", values: ["COC", "COD", "COS"] },
  { label: "Attaccanti", values: ["AED", "AES", "SP", "AC"] },
];

// --- Caratteristiche fisiche (selettori a scelta singola) ---
export type StrutturaCorporeaEnum =
  | "ATLETICO" | "ROBUSTO" | "LONGILINEO"
  | "MASSICCIO" | "NORMOTIPO" | "BREVILINEO";
export const STRUTTURA_CORPOREA_VALUES: StrutturaCorporeaEnum[] = [
  "ATLETICO","ROBUSTO","LONGILINEO","MASSICCIO","NORMOTIPO","BREVILINEO",
];
export const STRUTTURA_CORPOREA_LABEL: Record<StrutturaCorporeaEnum, string> = {
  ATLETICO: "Atletico",
  ROBUSTO: "Robusto",
  LONGILINEO: "Longilineo",
  MASSICCIO: "Massiccio",
  NORMOTIPO: "Normotipo",
  BREVILINEO: "Brevilineo",
};

export type GestiMotoriEnum =
  | "CLASSE" | "STILE" | "NORMALE" | "SGRAZIATO" | "ELEGANTE";
export const GESTI_MOTORI_VALUES: GestiMotoriEnum[] = [
  "CLASSE","STILE","NORMALE","SGRAZIATO","ELEGANTE",
];
export const GESTI_MOTORI_LABEL: Record<GestiMotoriEnum, string> = {
  CLASSE: "Classe",
  STILE: "Stile",
  NORMALE: "Normale",
  SGRAZIATO: "Sgraziato",
  ELEGANTE: "Elegante",
};

export type MuscolaturaEnum = "SCARNA" | "NORMALE" | "EVIDENZIATA" | "MASSICCIA";
export const MUSCOLATURA_VALUES: MuscolaturaEnum[] = [
  "SCARNA","NORMALE","EVIDENZIATA","MASSICCIA",
];
export const MUSCOLATURA_LABEL: Record<MuscolaturaEnum, string> = {
  SCARNA: "Scarna",
  NORMALE: "Normale",
  EVIDENZIATA: "Evidenziata",
  MASSICCIA: "Massiccia",
};

// --- Domande SI/NO/A_VOLTE ---
export type SiNoAVolteEnum = "SI" | "NO" | "A_VOLTE";
export const SI_NO_AVOLTE_VALUES: SiNoAVolteEnum[] = ["SI","NO","A_VOLTE"];
export const SI_NO_AVOLTE_LABEL: Record<SiNoAVolteEnum, string> = {
  SI: "Sì",
  NO: "No",
  A_VOLTE: "A volte",
};

// --- Status osservazione ---
export type StatusOsservazioneEnum =
  | "DA_VISIONARE" | "IN_OSSERVAZIONE" | "APPROVATO" | "RIFIUTATO";
export const STATUS_OSSERVAZIONE_VALUES: StatusOsservazioneEnum[] = [
  "DA_VISIONARE","IN_OSSERVAZIONE","APPROVATO","RIFIUTATO",
];
export const STATUS_OSSERVAZIONE_LABEL: Record<StatusOsservazioneEnum, string> = {
  DA_VISIONARE: "Da visionare",
  IN_OSSERVAZIONE: "In osservazione",
  APPROVATO: "Approvato / Top target",
  RIFIUTATO: "Rifiutato",
};

// --- Voto Potenziale (6 tier) ---
export type VotoPotenzialeEnum = "A1" | "A2" | "B1" | "B2" | "C" | "D";
export const VOTO_POTENZIALE_VALUES: VotoPotenzialeEnum[] = [
  "A1","A2","B1","B2","C","D",
];
/** Etichette estese (mostrate nel select / dettaglio). */
export const VOTO_POTENZIALE_LABEL: Record<VotoPotenzialeEnum, string> = {
  A1: "Elite / Top Player Internazionale (A1)",
  A2: "Prima Squadra · Livello Alto / Titolare Serie A (A2)",
  B1: "Prima Squadra · Livello Medio / Serie B Top (B1)",
  B2: "Prospetto da Sviluppare / Margine di Prestito (B2)",
  C: "Profilo di Categoria Attuale / Integrazione Rotazione (C)",
  D: "Non Idoneo al Livello Richiesto (D)",
};
/** Etichette brevi (per badge sulle card). */
export const VOTO_POTENZIALE_SHORT: Record<VotoPotenzialeEnum, string> = {
  A1: "A1 · Elite",
  A2: "A2 · Top Serie A",
  B1: "B1 · Serie B top",
  B2: "B2 · Prospetto",
  C: "C · Categoria",
  D: "D · Non idoneo",
};

// --- Fascia di ingaggio ---
export type FasciaIngaggioEnum =
  | "SOTTO_100K" | "TRA_100K_300K" | "TRA_300K_600K" | "TRA_600K_1M" | "SOPRA_1M";
export const FASCIA_INGAGGIO_VALUES: FasciaIngaggioEnum[] = [
  "SOTTO_100K","TRA_100K_300K","TRA_300K_600K","TRA_600K_1M","SOPRA_1M",
];
export const FASCIA_INGAGGIO_LABEL: Record<FasciaIngaggioEnum, string> = {
  SOTTO_100K: "Sotto €100k",
  TRA_100K_300K: "€100k – €300k",
  TRA_300K_600K: "€300k – €600k",
  TRA_600K_1M: "€600k – €1M",
  SOPRA_1M: "Sopra €1M",
};

// ============================================================
// VALUTAZIONI 1-10 (71 chiavi)
// Allineate alla scheda ufficiale, raggruppate per area logica.
// ============================================================

export type RatingArea =
  | "COMPORTAMENTALI"
  | "ATLETICHE"
  | "TECNICA"
  | "COORDINATIVE"
  | "TATT_IND_POSSESSO"
  | "TATT_IND_NON_POSSESSO"
  | "TATT_APPL_POSSESSO"
  | "TATT_APPL_NON_POSSESSO"
  | "TATT_APPL_RUOLO";

export const RATING_AREA_LABEL: Record<RatingArea, string> = {
  COMPORTAMENTALI: "Comportamentali",
  ATLETICHE: "Atletiche",
  TECNICA: "Tecnica",
  COORDINATIVE: "Coordinative",
  TATT_IND_POSSESSO: "Tattica individuale · Possesso",
  TATT_IND_NON_POSSESSO: "Tattica individuale · Non possesso",
  TATT_APPL_POSSESSO: "Tattica applicata · Possesso",
  TATT_APPL_NON_POSSESSO: "Tattica applicata · Non possesso",
  TATT_APPL_RUOLO: "Tattica applicata · Ruolo",
};

/** Macro-gruppi (per Accordion in sidebar e form). */
export type RatingMacroGroup =
  | "COMPORTAMENTALI"
  | "ATLETICHE"
  | "TECNICA_COORD"
  | "TATTICA_IND"
  | "TATTICA_APPL";

export const RATING_MACRO_LABEL: Record<RatingMacroGroup, string> = {
  COMPORTAMENTALI: "Comportamentali",
  ATLETICHE: "Atletiche",
  TECNICA_COORD: "Tecnica & Coordinative",
  TATTICA_IND: "Tattica individuale",
  TATTICA_APPL: "Tattica applicata",
};

export const RATING_AREA_MACRO: Record<RatingArea, RatingMacroGroup> = {
  COMPORTAMENTALI: "COMPORTAMENTALI",
  ATLETICHE: "ATLETICHE",
  TECNICA: "TECNICA_COORD",
  COORDINATIVE: "TECNICA_COORD",
  TATT_IND_POSSESSO: "TATTICA_IND",
  TATT_IND_NON_POSSESSO: "TATTICA_IND",
  TATT_APPL_POSSESSO: "TATTICA_APPL",
  TATT_APPL_NON_POSSESSO: "TATTICA_APPL",
  TATT_APPL_RUOLO: "TATTICA_APPL",
};

export type RatingKey =
  // A. Comportamentali
  | "behav_carisma"
  | "behav_autostima"
  | "behav_personalita"
  | "behav_spirito_sacrificio"
  | "behav_spirito_comprensione"
  | "behav_generosita"
  | "behav_aggressivita"
  | "behav_autocritica"
  | "behav_spirito_collaborativo"
  | "behav_atteggiamento_in_campo"
  | "behav_atteggiamento_fuori_campo"
  | "behav_concentrazione"
  | "behav_temperamento"
  | "behav_tenacia"
  // C. Atletiche
  | "atl_velocita_senza_palla"
  | "atl_accelerazione"
  | "atl_cambi_direzione"
  | "atl_elevazione"
  | "atl_resistenza_fatica"
  | "atl_flessibilita"
  | "atl_rapidita"
  | "atl_agilita"
  | "atl_cambio_passo"
  | "atl_forza"
  | "atl_potenza_contrasti"
  | "atl_abilita_acrobatica"
  // D. Tecnica
  | "tec_lato_dominante"
  | "tec_piede_dx"
  | "tec_piede_sx"
  | "tec_gioco_testa"
  | "tec_ricezione_piede"
  | "tec_ricezione_petto"
  | "tec_trasmissione_piede"
  | "tec_trasmissione_testa"
  // D. Coordinative
  | "coord_equilibrio"
  | "coord_differenziazione"
  | "coord_ritmizzazione"
  | "coord_orientamento"
  | "coord_reazione"
  | "coord_accoppiamento_motorio"
  | "coord_adattamento"
  | "coord_anticipazione"
  // E. Tattica individuale — Possesso
  | "tatti_poss_visione_periferica"
  | "tatti_poss_smarcamento"
  | "tatti_poss_controllo_difesa_palla"
  | "tatti_poss_dribbling"
  | "tatti_poss_occupazione_spazio"
  | "tatti_poss_taglio"
  | "tatti_poss_sovrapposizione"
  | "tatti_poss_triangolazione"
  | "tatti_poss_finta"
  | "tatti_poss_falli_laterali"
  | "tatti_poss_fantasia_estro"
  | "tatti_poss_vedere_porta"
  | "tatti_poss_agisce_stile"
  // E. Tattica individuale — Non possesso
  | "tatti_nposs_marcamento"
  | "tatti_nposs_pressione"
  | "tatti_nposs_anticipo"
  | "tatti_nposs_intercettamento"
  | "tatti_nposs_contrasto_diretto"
  | "tatti_nposs_difesa_zona"
  | "tatti_nposs_ripresa_fine_azione"
  | "tatti_nposs_ripresa_dopo_perdita"
  // F. Tattica applicata — Possesso
  | "tappl_poss_lettura_veloce"
  | "tappl_poss_fantasia_gioco"
  | "tappl_poss_velocita_esecuzione"
  // F. Tattica applicata — Non possesso
  | "tappl_nposs_scalare"
  | "tappl_nposs_pressing"
  | "tappl_nposs_partecipazione_difensiva"
  | "tappl_nposs_anticipazione_gioco"
  // F. Tattica applicata — Ruolo
  | "tappl_ruolo_comportamento";

export type RatingDef = { key: RatingKey; label: string; area: RatingArea };

export const RATINGS: RatingDef[] = [
  // A. Comportamentali
  { key: "behav_carisma",                  label: "Carisma",                       area: "COMPORTAMENTALI" },
  { key: "behav_autostima",                label: "Autostima",                     area: "COMPORTAMENTALI" },
  { key: "behav_personalita",              label: "Personalità",                   area: "COMPORTAMENTALI" },
  { key: "behav_spirito_sacrificio",       label: "Spirito di sacrificio",         area: "COMPORTAMENTALI" },
  { key: "behav_spirito_comprensione",     label: "Spirito di comprensione",       area: "COMPORTAMENTALI" },
  { key: "behav_generosita",               label: "Generosità",                    area: "COMPORTAMENTALI" },
  { key: "behav_aggressivita",             label: "Aggressività",                  area: "COMPORTAMENTALI" },
  { key: "behav_autocritica",              label: "Autocritica",                   area: "COMPORTAMENTALI" },
  { key: "behav_spirito_collaborativo",    label: "Spirito collaborativo",         area: "COMPORTAMENTALI" },
  { key: "behav_atteggiamento_in_campo",   label: "Atteggiamento in campo",        area: "COMPORTAMENTALI" },
  { key: "behav_atteggiamento_fuori_campo",label: "Atteggiamento fuori campo",     area: "COMPORTAMENTALI" },
  { key: "behav_concentrazione",           label: "Concentrazione",                area: "COMPORTAMENTALI" },
  { key: "behav_temperamento",             label: "Temperamento",                  area: "COMPORTAMENTALI" },
  { key: "behav_tenacia",                  label: "Tenacia",                       area: "COMPORTAMENTALI" },
  // C. Atletiche
  { key: "atl_velocita_senza_palla", label: "Velocità senza palla",       area: "ATLETICHE" },
  { key: "atl_accelerazione",        label: "Capacità di accelerazione",  area: "ATLETICHE" },
  { key: "atl_cambi_direzione",      label: "Cambi di direzione",         area: "ATLETICHE" },
  { key: "atl_elevazione",           label: "Elevazione",                 area: "ATLETICHE" },
  { key: "atl_resistenza_fatica",    label: "Resistenza alla fatica",     area: "ATLETICHE" },
  { key: "atl_flessibilita",         label: "Flessibilità",               area: "ATLETICHE" },
  { key: "atl_rapidita",             label: "Rapidità",                   area: "ATLETICHE" },
  { key: "atl_agilita",              label: "Agilità",                    area: "ATLETICHE" },
  { key: "atl_cambio_passo",         label: "Cambio di passo",            area: "ATLETICHE" },
  { key: "atl_forza",                label: "Forza",                      area: "ATLETICHE" },
  { key: "atl_potenza_contrasti",    label: "Potenza nei contrasti",      area: "ATLETICHE" },
  { key: "atl_abilita_acrobatica",   label: "Abilità acrobatica",         area: "ATLETICHE" },
  // D. Tecnica
  { key: "tec_lato_dominante",       label: "Lato dominante",             area: "TECNICA" },
  { key: "tec_piede_dx",             label: "Piede destro",               area: "TECNICA" },
  { key: "tec_piede_sx",             label: "Piede sinistro",             area: "TECNICA" },
  { key: "tec_gioco_testa",          label: "Gioco di testa",             area: "TECNICA" },
  { key: "tec_ricezione_piede",      label: "Ricezione palla (piede)",    area: "TECNICA" },
  { key: "tec_ricezione_petto",      label: "Ricezione palla (petto)",    area: "TECNICA" },
  { key: "tec_trasmissione_piede",   label: "Trasmissione palla (piede)", area: "TECNICA" },
  { key: "tec_trasmissione_testa",   label: "Trasmissione palla (testa)", area: "TECNICA" },
  // D. Coordinative
  { key: "coord_equilibrio",            label: "Equilibrio",                       area: "COORDINATIVE" },
  { key: "coord_differenziazione",      label: "Differenziazione / Cinestesi",     area: "COORDINATIVE" },
  { key: "coord_ritmizzazione",         label: "Ritmizzazione",                    area: "COORDINATIVE" },
  { key: "coord_orientamento",          label: "Orientamento (spazio-tempo)",      area: "COORDINATIVE" },
  { key: "coord_reazione",              label: "Reazione (atteso / inatteso)",     area: "COORDINATIVE" },
  { key: "coord_accoppiamento_motorio", label: "Accoppiamento motorio",            area: "COORDINATIVE" },
  { key: "coord_adattamento",           label: "Adattamento e trasformazione",     area: "COORDINATIVE" },
  { key: "coord_anticipazione",         label: "Anticipazione",                    area: "COORDINATIVE" },
  // E. Tattica individuale — Possesso
  { key: "tatti_poss_visione_periferica",     label: "Visione periferica",          area: "TATT_IND_POSSESSO" },
  { key: "tatti_poss_smarcamento",            label: "Smarcamento",                  area: "TATT_IND_POSSESSO" },
  { key: "tatti_poss_controllo_difesa_palla", label: "Controllo e difesa palla",     area: "TATT_IND_POSSESSO" },
  { key: "tatti_poss_dribbling",              label: "Dribbling",                    area: "TATT_IND_POSSESSO" },
  { key: "tatti_poss_occupazione_spazio",     label: "Occupazione spazio",           area: "TATT_IND_POSSESSO" },
  { key: "tatti_poss_taglio",                 label: "Taglio",                       area: "TATT_IND_POSSESSO" },
  { key: "tatti_poss_sovrapposizione",        label: "Sovrapposizione",              area: "TATT_IND_POSSESSO" },
  { key: "tatti_poss_triangolazione",         label: "Triangolazione 1-2",           area: "TATT_IND_POSSESSO" },
  { key: "tatti_poss_finta",                  label: "Finta",                        area: "TATT_IND_POSSESSO" },
  { key: "tatti_poss_falli_laterali",         label: "Falli laterali",               area: "TATT_IND_POSSESSO" },
  { key: "tatti_poss_fantasia_estro",         label: "Fantasia ed estro",            area: "TATT_IND_POSSESSO" },
  { key: "tatti_poss_vedere_porta",           label: "Capacità di vedere la porta",  area: "TATT_IND_POSSESSO" },
  { key: "tatti_poss_agisce_stile",           label: "Agisce con stile",             area: "TATT_IND_POSSESSO" },
  // E. Tattica individuale — Non possesso
  { key: "tatti_nposs_marcamento",            label: "Marcamento",                   area: "TATT_IND_NON_POSSESSO" },
  { key: "tatti_nposs_pressione",             label: "Pressione",                    area: "TATT_IND_NON_POSSESSO" },
  { key: "tatti_nposs_anticipo",              label: "Anticipo",                     area: "TATT_IND_NON_POSSESSO" },
  { key: "tatti_nposs_intercettamento",       label: "Intercettamento",              area: "TATT_IND_NON_POSSESSO" },
  { key: "tatti_nposs_contrasto_diretto",     label: "Contrasto diretto",            area: "TATT_IND_NON_POSSESSO" },
  { key: "tatti_nposs_difesa_zona",           label: "Difesa a zona",                area: "TATT_IND_NON_POSSESSO" },
  { key: "tatti_nposs_ripresa_fine_azione",   label: "Ripresa posizione a fine azione",  area: "TATT_IND_NON_POSSESSO" },
  { key: "tatti_nposs_ripresa_dopo_perdita",  label: "Ripresa posizione dopo perdita",   area: "TATT_IND_NON_POSSESSO" },
  // F. Tattica applicata — Possesso
  { key: "tappl_poss_lettura_veloce",      label: "Lettura veloce situazione",    area: "TATT_APPL_POSSESSO" },
  { key: "tappl_poss_fantasia_gioco",      label: "Fantasia di gioco",            area: "TATT_APPL_POSSESSO" },
  { key: "tappl_poss_velocita_esecuzione", label: "Velocità di esecuzione",       area: "TATT_APPL_POSSESSO" },
  // F. Tattica applicata — Non possesso
  { key: "tappl_nposs_scalare",                  label: "Scalare",                          area: "TATT_APPL_NON_POSSESSO" },
  { key: "tappl_nposs_pressing",                 label: "Pressing",                         area: "TATT_APPL_NON_POSSESSO" },
  { key: "tappl_nposs_partecipazione_difensiva", label: "Partecipazione fase difensiva",    area: "TATT_APPL_NON_POSSESSO" },
  { key: "tappl_nposs_anticipazione_gioco",      label: "Anticipazione gioco avversario",   area: "TATT_APPL_NON_POSSESSO" },
  // F. Tattica applicata — Ruolo
  { key: "tappl_ruolo_comportamento", label: "Comportamento tecnico-tattico nel ruolo", area: "TATT_APPL_RUOLO" },
];

/** Tutte le chiavi rating, utile per loop type-safe. */
export const RATING_KEYS = RATINGS.map((r) => r.key) as RatingKey[];

// ============================================================
// Influenze negative — boolean
// ============================================================

export type InfluenzaNegKey =
  | "influenza_neg_propri_errori"
  | "influenza_neg_errore_compagno"
  | "influenza_neg_arbitro"
  | "influenza_neg_risultato"
  | "influenza_neg_allenatore";

export const INFLUENZE_NEG: { key: InfluenzaNegKey; label: string }[] = [
  { key: "influenza_neg_propri_errori",   label: "I suoi errori" },
  { key: "influenza_neg_errore_compagno", label: "Errore del compagno" },
  { key: "influenza_neg_arbitro",         label: "Arbitro" },
  { key: "influenza_neg_risultato",       label: "Risultato del momento" },
  { key: "influenza_neg_allenatore",      label: "Decisioni allenatore" },
];

// ============================================================
// Helpers
// ============================================================

export function calcolaEta(dataNascitaISO: string | null): number | null {
  if (!dataNascitaISO) return null;
  const nascita = new Date(dataNascitaISO);
  if (Number.isNaN(nascita.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - nascita.getFullYear();
  const m = now.getMonth() - nascita.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < nascita.getDate())) age--;
  return age;
}

export type FasciaEta = "U21" | "TRA_22_26" | "OVER_27";
export const FASCIA_ETA_LABEL: Record<FasciaEta, string> = {
  U21: "Under 21",
  TRA_22_26: "22 – 26",
  OVER_27: "Over 27",
};

export type ScadenzaQuick = "ENTRO_6_MESI" | "ENTRO_12_MESI";
export const SCADENZA_QUICK_LABEL: Record<ScadenzaQuick, string> = {
  ENTRO_6_MESI: "Scadono entro 6 mesi",
  ENTRO_12_MESI: "Scadono entro 12 mesi",
};

/**
 * Media di un insieme di rating su una RatingArea o RatingMacroGroup.
 * Ignora i NULL. Restituisce null se nessun rating è valorizzato.
 */
export function ratingsAverage(
  row: Partial<Record<RatingKey, number | null | undefined>>,
  keys: RatingKey[],
): number | null {
  let sum = 0;
  let count = 0;
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "number" && Number.isFinite(v)) {
      sum += v;
      count += 1;
    }
  }
  return count === 0 ? null : sum / count;
}

/** Voce mostrata in card lista. */
export type PlayerListItem = Pick<
  PlayerRow,
  | "id"
  | "nome"
  | "cognome"
  | "foto_url"
  | "data_nascita"
  | "nazionalita"
  | "piede"
  | "ruolo_principale"
  | "ruoli_secondari"
  | "squadra_attuale"
  | "campionato"
  | "scadenza_contratto"
  | "valore_mercato_eur"
  | "status_osservazione"
  | "voto_potenziale"
>;
