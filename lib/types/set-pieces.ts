/**
 * Tipi di dominio per la sezione Set Pieces (calci piazzati).
 * Allineato a 0007_set_pieces.sql.
 */
import type { Database } from "./database";

export type SetPieceRow = Database["public"]["Tables"]["set_pieces"]["Row"];
export type SetPieceInsert = Database["public"]["Tables"]["set_pieces"]["Insert"];
export type SetPieceUpdate = Database["public"]["Tables"]["set_pieces"]["Update"];

// ============================================================
// ENUM + LABEL IT
// ============================================================

export type FaseEnum = "OFFENSIVO" | "DIFENSIVO";
export const FASE_VALUES: FaseEnum[] = ["OFFENSIVO", "DIFENSIVO"];
export const FASE_LABEL: Record<FaseEnum, string> = {
  OFFENSIVO: "Offensivo",
  DIFENSIVO: "Difensivo",
};

export type TipoPiazzatoEnum =
  | "ANGOLO"
  | "PUNIZIONE"
  | "RIMESSA_LATERALE"
  | "RIGORE";
export const TIPO_PIAZZATO_VALUES: TipoPiazzatoEnum[] = [
  "ANGOLO",
  "PUNIZIONE",
  "RIMESSA_LATERALE",
  "RIGORE",
];
export const TIPO_PIAZZATO_LABEL: Record<TipoPiazzatoEnum, string> = {
  ANGOLO: "Calcio d'angolo",
  PUNIZIONE: "Punizione",
  RIMESSA_LATERALE: "Rimessa laterale",
  RIGORE: "Calcio di rigore",
};

export type SpecificazionePunizioneEnum = "CENTRALE" | "LATERALE";
export const SPECIFICAZIONE_PUNIZIONE_VALUES: SpecificazionePunizioneEnum[] = [
  "CENTRALE",
  "LATERALE",
];
export const SPECIFICAZIONE_PUNIZIONE_LABEL: Record<
  SpecificazionePunizioneEnum,
  string
> = {
  CENTRALE: "Centrale (zona tiro / chirurgica)",
  LATERALE: "Laterale (zona cross / trequarti)",
};

export type LatoBattutaEnum = "DESTRO" | "SINISTRO" | "CENTRALE";
export const LATO_BATTUTA_VALUES: LatoBattutaEnum[] = [
  "DESTRO",
  "SINISTRO",
  "CENTRALE",
];
export const LATO_BATTUTA_LABEL: Record<LatoBattutaEnum, string> = {
  DESTRO: "Destro",
  SINISTRO: "Sinistro",
  CENTRALE: "Centrale",
};

// --- Offensivo ---
export type PiedeBattitoreEnum = "DESTRO" | "SINISTRO" | "DUE_SULLA_PALLA";
export const PIEDE_BATTITORE_VALUES: PiedeBattitoreEnum[] = [
  "DESTRO",
  "SINISTRO",
  "DUE_SULLA_PALLA",
];
export const PIEDE_BATTITORE_LABEL: Record<PiedeBattitoreEnum, string> = {
  DESTRO: "Destro",
  SINISTRO: "Sinistro",
  DUE_SULLA_PALLA: "Due sulla palla",
};

export type TraiettoriaEnum =
  | "A_RIENTRARE"
  | "A_USCIRE"
  | "TESA"
  | "MORBIDA"
  | "RASOTERRA";
export const TRAIETTORIA_VALUES: TraiettoriaEnum[] = [
  "A_RIENTRARE",
  "A_USCIRE",
  "TESA",
  "MORBIDA",
  "RASOTERRA",
];
export const TRAIETTORIA_LABEL: Record<TraiettoriaEnum, string> = {
  A_RIENTRARE: "A rientrare",
  A_USCIRE: "A uscire",
  TESA: "Tesa",
  MORBIDA: "Morbida",
  RASOTERRA: "Rasoterra",
};

export type SviluppoSchemaEnum =
  | "DIRETTO"
  | "CORTO_2_3_TOCCHI"
  | "SCARICO_FUORI_AREA";
export const SVILUPPO_SCHEMA_VALUES: SviluppoSchemaEnum[] = [
  "DIRETTO",
  "CORTO_2_3_TOCCHI",
  "SCARICO_FUORI_AREA",
];
export const SVILUPPO_SCHEMA_LABEL: Record<SviluppoSchemaEnum, string> = {
  DIRETTO: "Diretto",
  CORTO_2_3_TOCCHI: "Corto a 2-3 tocchi",
  SCARICO_FUORI_AREA: "Scarico fuori area",
};

/** Zone di caduta della palla (preset, salvati come text[]). */
export const LANDING_ZONES_PRESET = [
  "Primo palo",
  "Secondo palo",
  "Dischetto",
  "Zona corta",
  "Limite dell'area",
] as const;

/** Comportamenti chiave dei giocatori (preset, salvati come text[]). */
export const BEHAVIOR_TAGS_PRESET = [
  "Blocchi",
  "Tagli incrociati",
  "Trenino",
  "Isolamento 1v1",
  "Attacco profondo da dietro",
] as const;

// --- Difensivo ---
export type SistemaMarcaturaEnum = "A_UOMO" | "A_ZONA" | "MISTA";
export const SISTEMA_MARCATURA_VALUES: SistemaMarcaturaEnum[] = [
  "A_UOMO",
  "A_ZONA",
  "MISTA",
];
export const SISTEMA_MARCATURA_LABEL: Record<SistemaMarcaturaEnum, string> = {
  A_UOMO: "A uomo",
  A_ZONA: "A zona (es. zona pura, zona sul primo palo)",
  MISTA: "Mista (es. 3 a uomo + 5 in zona)",
};

export type UominiSuiPaliEnum =
  | "NESSUNO"
  | "PRIMO_PALO"
  | "SECONDO_PALO"
  | "ENTRAMBI";
export const UOMINI_SUI_PALI_VALUES: UominiSuiPaliEnum[] = [
  "NESSUNO",
  "PRIMO_PALO",
  "SECONDO_PALO",
  "ENTRAMBI",
];
export const UOMINI_SUI_PALI_LABEL: Record<UominiSuiPaliEnum, string> = {
  NESSUNO: "Nessuno",
  PRIMO_PALO: "Solo primo palo",
  SECONDO_PALO: "Solo secondo palo",
  ENTRAMBI: "Entrambi",
};

export type AltezzaLineaEnum = "ALTA" | "PROFONDA" | "ELASTICA";
export const ALTEZZA_LINEA_VALUES: AltezzaLineaEnum[] = [
  "ALTA",
  "PROFONDA",
  "ELASTICA",
];
export const ALTEZZA_LINEA_LABEL: Record<AltezzaLineaEnum, string> = {
  ALTA: "Alta",
  PROFONDA: "Profonda sulla linea",
  ELASTICA: "Elastica a scappare",
};

// --- Esito ---
export type EsitoFinaleEnum =
  | "GOL"
  | "TIRO_IN_PORTA"
  | "TIRO_FUORI"
  | "LIBERATO_DIFESA"
  | "FALLO_COMMESSO"
  | "FALLO_SUBITO"
  | "FUORIGIOCO"
  | "TRANSIZIONE_SUBITA";
export const ESITO_FINALE_VALUES: EsitoFinaleEnum[] = [
  "GOL",
  "TIRO_IN_PORTA",
  "TIRO_FUORI",
  "LIBERATO_DIFESA",
  "FALLO_COMMESSO",
  "FALLO_SUBITO",
  "FUORIGIOCO",
  "TRANSIZIONE_SUBITA",
];
export const ESITO_FINALE_LABEL: Record<EsitoFinaleEnum, string> = {
  GOL: "Gol",
  TIRO_IN_PORTA: "Tiro in porta / occasione",
  TIRO_FUORI: "Tiro fuori",
  LIBERATO_DIFESA: "Liberato dalla difesa",
  FALLO_COMMESSO: "Fallo commesso",
  FALLO_SUBITO: "Fallo subìto",
  FUORIGIOCO: "Fuorigioco",
  TRANSIZIONE_SUBITA: "Transizione subìta",
};

/** Quale "tono" usare nei badge in base all'esito (positivo per noi / negativo / neutro). */
export const ESITO_TINT: Record<EsitoFinaleEnum, "positive" | "negative" | "neutral"> = {
  GOL: "positive",
  TIRO_IN_PORTA: "positive",
  TIRO_FUORI: "neutral",
  LIBERATO_DIFESA: "neutral",
  FALLO_COMMESSO: "negative",
  FALLO_SUBITO: "neutral",
  FUORIGIOCO: "neutral",
  TRANSIZIONE_SUBITA: "negative",
};

/** Sotto-insieme della Row usato nelle card della lista. */
export type SetPieceListItem = Pick<
  SetPieceRow,
  | "id"
  | "titolo"
  | "fase"
  | "tipo_piazzato"
  | "specificazione_punizione"
  | "lato_battuta"
  | "esito_finale"
  | "squadra_esecutrice"
  | "squadra_avversaria"
  | "competizione"
  | "stagione"
  | "minuto"
  | "punteggio"
  | "data_evento"
  | "video_url"
  | "lavagna_image_url"
  | "updated_at"
>;
