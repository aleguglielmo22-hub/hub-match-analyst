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

/**
 * Aree valutazione in stile Football Manager.
 * Le valutazioni 1-10 dei calciatori osservati seguono questo set.
 */
export type RatingArea = "TECNICA" | "PSICOLOGIA" | "FISICO" | "PORTIERE";

export const RATING_AREA_LABEL: Record<RatingArea, string> = {
  TECNICA: "Tecnica",
  PSICOLOGIA: "Psicologia",
  FISICO: "Fisico",
  PORTIERE: "Portiere",
};

/** In stile FM i macro-gruppi coincidono con le aree. */
export type RatingMacroGroup = RatingArea;

export const RATING_MACRO_LABEL: Record<RatingMacroGroup, string> = {
  TECNICA: "Tecnica",
  PSICOLOGIA: "Psicologia",
  FISICO: "Fisico",
  PORTIERE: "Portiere",
};

export const RATING_AREA_MACRO: Record<RatingArea, RatingMacroGroup> = {
  TECNICA: "TECNICA",
  PSICOLOGIA: "PSICOLOGIA",
  FISICO: "FISICO",
  PORTIERE: "PORTIERE",
};

export type RatingKey =
  // Tecnica (14)
  | "tec_colpi_testa"
  | "tec_contrasti"
  | "tec_controllo_palla"
  | "tec_cross"
  | "tec_dribbling"
  | "tec_finalizzazione"
  | "tec_marcatura"
  | "tec_passaggi"
  | "tec_tecnica"
  | "tec_tiri_lontano"
  | "tec_calci_angolo"
  | "tec_punizioni"
  | "tec_rigori"
  | "tec_rimesse_lunghe"
  // Psicologia (14)
  | "men_aggressivita"
  | "men_carisma"
  | "men_concentrazione"
  | "men_coraggio"
  | "men_decisioni"
  | "men_determinazione"
  | "men_fantasia"
  | "men_freddezza"
  | "men_gioco_squadra"
  | "men_impegno"
  | "men_intuito"
  | "men_posizione"
  | "men_senza_palla"
  | "men_visione"
  // Fisico (8)
  | "fis_accelerazione"
  | "fis_agilita"
  | "fis_equilibrio"
  | "fis_forza"
  | "fis_integrita"
  | "fis_elevazione"
  | "fis_resistenza"
  | "fis_velocita"
  // Portiere (11)
  | "gk_gioco_aereo"
  | "gk_comando_area"
  | "gk_comunicazione"
  | "gk_eccentricita"
  | "gk_presa"
  | "gk_rinvio"
  | "gk_uno_vs_uno"
  | "gk_riflessi"
  | "gk_tendenza_uscire"
  | "gk_tendenza_pugni"
  | "gk_lancio";

export type RatingDef = { key: RatingKey; label: string; area: RatingArea };

export const RATINGS: RatingDef[] = [
  // Tecnica (14)
  { key: "tec_colpi_testa",     label: "Colpi di testa",     area: "TECNICA" },
  { key: "tec_contrasti",       label: "Contrasti",          area: "TECNICA" },
  { key: "tec_controllo_palla", label: "Controllo di palla", area: "TECNICA" },
  { key: "tec_cross",           label: "Cross",              area: "TECNICA" },
  { key: "tec_dribbling",       label: "Dribbling",          area: "TECNICA" },
  { key: "tec_finalizzazione",  label: "Finalizzazione",     area: "TECNICA" },
  { key: "tec_marcatura",       label: "Marcatura",          area: "TECNICA" },
  { key: "tec_passaggi",        label: "Passaggi",           area: "TECNICA" },
  { key: "tec_tecnica",         label: "Tecnica",            area: "TECNICA" },
  { key: "tec_tiri_lontano",    label: "Tiri da lontano",    area: "TECNICA" },
  { key: "tec_calci_angolo",    label: "Calci d'angolo",     area: "TECNICA" },
  { key: "tec_punizioni",       label: "Calci piazzati",     area: "TECNICA" },
  { key: "tec_rigori",          label: "Rigori",             area: "TECNICA" },
  { key: "tec_rimesse_lunghe",  label: "Rimesse lunghe",     area: "TECNICA" },
  // Psicologia (14)
  { key: "men_aggressivita",    label: "Aggressività",       area: "PSICOLOGIA" },
  { key: "men_carisma",         label: "Carisma",            area: "PSICOLOGIA" },
  { key: "men_concentrazione",  label: "Concentrazione",     area: "PSICOLOGIA" },
  { key: "men_coraggio",        label: "Coraggio",           area: "PSICOLOGIA" },
  { key: "men_decisioni",       label: "Decisioni",          area: "PSICOLOGIA" },
  { key: "men_determinazione",  label: "Determinazione",     area: "PSICOLOGIA" },
  { key: "men_fantasia",        label: "Fantasia",           area: "PSICOLOGIA" },
  { key: "men_freddezza",       label: "Freddezza",          area: "PSICOLOGIA" },
  { key: "men_gioco_squadra",   label: "Gioco di squadra",   area: "PSICOLOGIA" },
  { key: "men_impegno",         label: "Impegno",            area: "PSICOLOGIA" },
  { key: "men_intuito",         label: "Intuito",            area: "PSICOLOGIA" },
  { key: "men_posizione",       label: "Posizione",          area: "PSICOLOGIA" },
  { key: "men_senza_palla",     label: "Senza palla",        area: "PSICOLOGIA" },
  { key: "men_visione",         label: "Visione di gioco",   area: "PSICOLOGIA" },
  // Fisico (8)
  { key: "fis_accelerazione",   label: "Accelerazione",      area: "FISICO" },
  { key: "fis_agilita",         label: "Agilità",            area: "FISICO" },
  { key: "fis_equilibrio",      label: "Equilibrio",         area: "FISICO" },
  { key: "fis_forza",           label: "Forza",              area: "FISICO" },
  { key: "fis_integrita",       label: "Integrità fisica",   area: "FISICO" },
  { key: "fis_elevazione",      label: "Massima elevazione", area: "FISICO" },
  { key: "fis_resistenza",      label: "Resistenza",         area: "FISICO" },
  { key: "fis_velocita",        label: "Velocità",           area: "FISICO" },
  // Portiere (11)
  { key: "gk_gioco_aereo",      label: "Gioco aereo",        area: "PORTIERE" },
  { key: "gk_comando_area",     label: "Comando dell'area",  area: "PORTIERE" },
  { key: "gk_comunicazione",    label: "Comunicazione",      area: "PORTIERE" },
  { key: "gk_eccentricita",     label: "Eccentricità",       area: "PORTIERE" },
  { key: "gk_presa",            label: "Presa",              area: "PORTIERE" },
  { key: "gk_rinvio",           label: "Rinvio",             area: "PORTIERE" },
  { key: "gk_uno_vs_uno",       label: "Uno contro uno",     area: "PORTIERE" },
  { key: "gk_riflessi",         label: "Riflessi",           area: "PORTIERE" },
  { key: "gk_tendenza_uscire",  label: "Tendenza a uscire",  area: "PORTIERE" },
  { key: "gk_tendenza_pugni",   label: "Tendenza ai pugni",  area: "PORTIERE" },
  { key: "gk_lancio",           label: "Lancio",             area: "PORTIERE" },
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
  | "created_by"
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
