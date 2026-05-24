/**
 * Tipi di dominio per la sezione Archivio.
 * I tipi puramente derivati dal DB stanno in database.ts; qui mettiamo i tipi
 * "applicativi" (es. unioni di enum, modelli composti).
 */

export type AmbitoEnum =
  | "PRIMA_SQUADRA"
  | "SETTORE_GIOVANILE"
  | "CALCIO_FEMMINILE";

export type CategoriaLavoroEnum =
  | "TEAM_STUDIO"
  | "MATCH_STUDIO"
  | "INDIVIDUAL_ANALYSIS"
  | "DATA_ANALYSIS"
  | "ALLENAMENTO";

export type TipoMediaEnum =
  | "VIDEO_CLIP"
  | "INTERA_PARTITA"
  | "PDF_REPORT"
  | "SLIDE_PRESENTAZIONE"
  | "EXCEL_DATI";

export type SorgenteVideoEnum =
  | "TELECAMERA_TATTICA"
  | "BROADCASTER_TV"
  | "WYSCOUT"
  | "DRONE";

export type MembershipRoleEnum = "OWNER" | "COLLABORATOR";
export type MembershipStatusEnum = "PENDING" | "ACTIVE" | "REVOKED";

/** Etichette in italiano per le UI (chip, select, badge). */
export const AMBITO_LABEL: Record<AmbitoEnum, string> = {
  PRIMA_SQUADRA: "Prima squadra",
  SETTORE_GIOVANILE: "Settore giovanile",
  CALCIO_FEMMINILE: "Calcio femminile",
};

export const CATEGORIA_LAVORO_LABEL: Record<CategoriaLavoroEnum, string> = {
  TEAM_STUDIO: "Team studio",
  MATCH_STUDIO: "Match studio",
  INDIVIDUAL_ANALYSIS: "Individual analysis",
  DATA_ANALYSIS: "Data analysis",
  ALLENAMENTO: "Allenamento",
};

export const TIPO_MEDIA_LABEL: Record<TipoMediaEnum, string> = {
  VIDEO_CLIP: "Video clip",
  INTERA_PARTITA: "Intera partita",
  PDF_REPORT: "Report PDF",
  SLIDE_PRESENTAZIONE: "Slide",
  EXCEL_DATI: "Excel dati",
};

export const SORGENTE_VIDEO_LABEL: Record<SorgenteVideoEnum, string> = {
  TELECAMERA_TATTICA: "Telecamera tattica",
  BROADCASTER_TV: "Broadcaster TV",
  WYSCOUT: "Wyscout",
  DRONE: "Drone",
};
