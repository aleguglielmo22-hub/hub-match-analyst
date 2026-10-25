/**
 * Colori con significato, identici in tutta l'app (badge, card, filtri, dettagli).
 * Le classi sono scritte per intero perché Tailwind le trovi nel sorgente;
 * le tinte sono definite in app/globals.css (--tone-*) per i temi chiaro e scuro.
 */
import type { EsitoFinaleEnum, FaseEnum } from "@/lib/types/set-pieces";
import type { MacroFaseEnum } from "@/lib/types/situational";
import type {
  StatusOsservazioneEnum,
  VotoPotenzialeEnum,
} from "@/lib/types/scouting";

export type Tone =
  | "success"
  | "danger"
  | "neutral"
  | "info"
  | "warning"
  | "possesso"
  | "transizione-difensiva"
  | "non-possesso"
  | "transizione-offensiva"
  | "voto-1"
  | "voto-2"
  | "voto-3"
  | "voto-4"
  | "voto-5"
  | "voto-6"
  | "voto-7"
  | "voto-8"
  | "voto-9"
  | "voto-10";

export type ToneClasses = {
  /** Badge: sfondo tenue + testo della stessa tinta + bordo sottile (con ring-1). */
  badge: string;
  /** Solo testo nella tinta (leggibile su card e sfondo). */
  text: string;
  /** Colore pieno: punti, barre, icone decorative. */
  solid: string;
  /** Solo sfondo tenue. */
  soft: string;
  /** Bordo tenue. */
  border: string;
  /** Anello sottile (da usare con ring-1). */
  ring: string;
};

export const TONE: Record<Tone, ToneClasses> = {
  "success": {
    badge: "bg-tone-success-soft text-tone-success-fg ring-tone-success/40",
    text: "text-tone-success-fg",
    solid: "bg-tone-success",
    soft: "bg-tone-success-soft",
    border: "border-tone-success/40",
    ring: "ring-tone-success/40",
  },
  "danger": {
    badge: "bg-tone-danger-soft text-tone-danger-fg ring-tone-danger/40",
    text: "text-tone-danger-fg",
    solid: "bg-tone-danger",
    soft: "bg-tone-danger-soft",
    border: "border-tone-danger/40",
    ring: "ring-tone-danger/40",
  },
  "neutral": {
    badge: "bg-tone-neutral-soft text-tone-neutral-fg ring-tone-neutral/40",
    text: "text-tone-neutral-fg",
    solid: "bg-tone-neutral",
    soft: "bg-tone-neutral-soft",
    border: "border-tone-neutral/40",
    ring: "ring-tone-neutral/40",
  },
  "info": {
    badge: "bg-tone-info-soft text-tone-info-fg ring-tone-info/40",
    text: "text-tone-info-fg",
    solid: "bg-tone-info",
    soft: "bg-tone-info-soft",
    border: "border-tone-info/40",
    ring: "ring-tone-info/40",
  },
  "warning": {
    badge: "bg-tone-warning-soft text-tone-warning-fg ring-tone-warning/40",
    text: "text-tone-warning-fg",
    solid: "bg-tone-warning",
    soft: "bg-tone-warning-soft",
    border: "border-tone-warning/40",
    ring: "ring-tone-warning/40",
  },
  "possesso": {
    badge: "bg-tone-possesso-soft text-tone-possesso-fg ring-tone-possesso/40",
    text: "text-tone-possesso-fg",
    solid: "bg-tone-possesso",
    soft: "bg-tone-possesso-soft",
    border: "border-tone-possesso/40",
    ring: "ring-tone-possesso/40",
  },
  "transizione-difensiva": {
    badge: "bg-tone-transizione-difensiva-soft text-tone-transizione-difensiva-fg ring-tone-transizione-difensiva/40",
    text: "text-tone-transizione-difensiva-fg",
    solid: "bg-tone-transizione-difensiva",
    soft: "bg-tone-transizione-difensiva-soft",
    border: "border-tone-transizione-difensiva/40",
    ring: "ring-tone-transizione-difensiva/40",
  },
  "non-possesso": {
    badge: "bg-tone-non-possesso-soft text-tone-non-possesso-fg ring-tone-non-possesso/40",
    text: "text-tone-non-possesso-fg",
    solid: "bg-tone-non-possesso",
    soft: "bg-tone-non-possesso-soft",
    border: "border-tone-non-possesso/40",
    ring: "ring-tone-non-possesso/40",
  },
  "transizione-offensiva": {
    badge: "bg-tone-transizione-offensiva-soft text-tone-transizione-offensiva-fg ring-tone-transizione-offensiva/40",
    text: "text-tone-transizione-offensiva-fg",
    solid: "bg-tone-transizione-offensiva",
    soft: "bg-tone-transizione-offensiva-soft",
    border: "border-tone-transizione-offensiva/40",
    ring: "ring-tone-transizione-offensiva/40",
  },
  "voto-1": {
    badge: "bg-tone-voto-1-soft text-tone-voto-1-fg ring-tone-voto-1/40",
    text: "text-tone-voto-1-fg",
    solid: "bg-tone-voto-1",
    soft: "bg-tone-voto-1-soft",
    border: "border-tone-voto-1/40",
    ring: "ring-tone-voto-1/40",
  },
  "voto-2": {
    badge: "bg-tone-voto-2-soft text-tone-voto-2-fg ring-tone-voto-2/40",
    text: "text-tone-voto-2-fg",
    solid: "bg-tone-voto-2",
    soft: "bg-tone-voto-2-soft",
    border: "border-tone-voto-2/40",
    ring: "ring-tone-voto-2/40",
  },
  "voto-3": {
    badge: "bg-tone-voto-3-soft text-tone-voto-3-fg ring-tone-voto-3/40",
    text: "text-tone-voto-3-fg",
    solid: "bg-tone-voto-3",
    soft: "bg-tone-voto-3-soft",
    border: "border-tone-voto-3/40",
    ring: "ring-tone-voto-3/40",
  },
  "voto-4": {
    badge: "bg-tone-voto-4-soft text-tone-voto-4-fg ring-tone-voto-4/40",
    text: "text-tone-voto-4-fg",
    solid: "bg-tone-voto-4",
    soft: "bg-tone-voto-4-soft",
    border: "border-tone-voto-4/40",
    ring: "ring-tone-voto-4/40",
  },
  "voto-5": {
    badge: "bg-tone-voto-5-soft text-tone-voto-5-fg ring-tone-voto-5/40",
    text: "text-tone-voto-5-fg",
    solid: "bg-tone-voto-5",
    soft: "bg-tone-voto-5-soft",
    border: "border-tone-voto-5/40",
    ring: "ring-tone-voto-5/40",
  },
  "voto-6": {
    badge: "bg-tone-voto-6-soft text-tone-voto-6-fg ring-tone-voto-6/40",
    text: "text-tone-voto-6-fg",
    solid: "bg-tone-voto-6",
    soft: "bg-tone-voto-6-soft",
    border: "border-tone-voto-6/40",
    ring: "ring-tone-voto-6/40",
  },
  "voto-7": {
    badge: "bg-tone-voto-7-soft text-tone-voto-7-fg ring-tone-voto-7/40",
    text: "text-tone-voto-7-fg",
    solid: "bg-tone-voto-7",
    soft: "bg-tone-voto-7-soft",
    border: "border-tone-voto-7/40",
    ring: "ring-tone-voto-7/40",
  },
  "voto-8": {
    badge: "bg-tone-voto-8-soft text-tone-voto-8-fg ring-tone-voto-8/40",
    text: "text-tone-voto-8-fg",
    solid: "bg-tone-voto-8",
    soft: "bg-tone-voto-8-soft",
    border: "border-tone-voto-8/40",
    ring: "ring-tone-voto-8/40",
  },
  "voto-9": {
    badge: "bg-tone-voto-9-soft text-tone-voto-9-fg ring-tone-voto-9/40",
    text: "text-tone-voto-9-fg",
    solid: "bg-tone-voto-9",
    soft: "bg-tone-voto-9-soft",
    border: "border-tone-voto-9/40",
    ring: "ring-tone-voto-9/40",
  },
  "voto-10": {
    badge: "bg-tone-voto-10-soft text-tone-voto-10-fg ring-tone-voto-10/40",
    text: "text-tone-voto-10-fg",
    solid: "bg-tone-voto-10",
    soft: "bg-tone-voto-10-soft",
    border: "border-tone-voto-10/40",
    ring: "ring-tone-voto-10/40",
  },
};

/* ============================================================
 * Regole di significato
 * ============================================================ */

/** Fasi di gioco del Training (le etichette restano quelle attuali). */
export const MACRO_FASE_TONE: Record<MacroFaseEnum, Tone> = {
  POSSESSO: "possesso",
  NON_POSSESSO: "non-possesso",
  TRANSIZIONE_POSITIVA: "transizione-offensiva",
  TRANSIZIONE_NEGATIVA: "transizione-difensiva",
};

/** Set Pieces: offensivo = colore del possesso, difensivo = del non possesso. */
export const FASE_SET_PIECE_TONE: Record<FaseEnum, Tone> = {
  OFFENSIVO: "possesso",
  DIFENSIVO: "non-possesso",
};

export type EsitoTone = "success" | "neutral" | "danger";

/**
 * Esito di un piazzato giudicato SEMPRE dal punto di vista della mia squadra:
 * nei piazzati difensivi il giudizio si inverte (es. gol subìto = negativo).
 * Esiti ambigui → neutro.
 */
export const ESITO_TONE: Record<FaseEnum, Record<EsitoFinaleEnum, EsitoTone>> = {
  OFFENSIVO: {
    GOL: "success",
    TIRO_IN_PORTA: "success",
    TIRO_FUORI: "neutral",
    LIBERATO_DIFESA: "neutral",
    FALLO_COMMESSO: "danger",
    FALLO_SUBITO: "success",
    FUORIGIOCO: "danger",
    TRANSIZIONE_SUBITA: "danger",
  },
  DIFENSIVO: {
    GOL: "danger",
    TIRO_IN_PORTA: "danger",
    TIRO_FUORI: "neutral",
    LIBERATO_DIFESA: "success",
    // Falli: stesso significato in entrambe le fasi (commesso da noi / subìto da noi).
    FALLO_COMMESSO: "danger",
    FALLO_SUBITO: "success",
    FUORIGIOCO: "success",
    TRANSIZIONE_SUBITA: "success",
  },
};

/** Stati di osservazione dello Scouting. */
export const STATUS_OSSERVAZIONE_TONE: Record<StatusOsservazioneEnum, Tone> = {
  DA_VISIONARE: "neutral",
  IN_OSSERVAZIONE: "info",
  APPROVATO: "success",
  RIFIUTATO: "danger",
};

/** Voto potenziale riportato sulla scala dei voti 1-10. */
export const VOTO_POTENZIALE_SCALE: Record<VotoPotenzialeEnum, number> = {
  A1: 10,
  A2: 9,
  B1: 7,
  B2: 6,
  C: 4,
  D: 2,
};

const VOTO_TONES: Tone[] = [
  "voto-1", "voto-2", "voto-3", "voto-4", "voto-5",
  "voto-6", "voto-7", "voto-8", "voto-9", "voto-10",
];

/** Tinta della scala voti per un valore 1-10 (arrotondato e limitato). */
export function ratingTone(value: number): Tone {
  const v = Math.min(10, Math.max(1, Math.round(value)));
  return VOTO_TONES[v - 1];
}

export function potentialTone(voto: VotoPotenzialeEnum): Tone {
  return ratingTone(VOTO_POTENZIALE_SCALE[voto]);
}
