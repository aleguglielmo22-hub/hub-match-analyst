/**
 * Tipi di dominio per la sezione Situazionali (catalogo tattico + esercitazioni).
 * Allineato a 0008_situational.sql.
 *
 * Il cuore di questo modulo è la mappa `SOTTO_FASI_BY_MACRO`: è la single source
 * of truth della nidificazione macro → sotto, usata dal form, dalla sidebar
 * filtri e dal CHECK del DB (replicato in chk_sotto_fase_belongs_macro).
 */
import type { Database } from "./database";

export type SituationalRow =
  Database["public"]["Tables"]["situational_tactics"]["Row"];
export type SituationalInsert =
  Database["public"]["Tables"]["situational_tactics"]["Insert"];
export type SituationalUpdate =
  Database["public"]["Tables"]["situational_tactics"]["Update"];

// ============================================================
// LIVELLO 1 — Macro fase
// ============================================================

export type MacroFaseEnum =
  | "POSSESSO"
  | "NON_POSSESSO"
  | "TRANSIZIONE_POSITIVA"
  | "TRANSIZIONE_NEGATIVA";

export const MACRO_FASE_VALUES: MacroFaseEnum[] = [
  "POSSESSO",
  "NON_POSSESSO",
  "TRANSIZIONE_POSITIVA",
  "TRANSIZIONE_NEGATIVA",
];

export const MACRO_FASE_LABEL: Record<MacroFaseEnum, string> = {
  POSSESSO: "Possesso palla",
  NON_POSSESSO: "Non possesso palla",
  TRANSIZIONE_POSITIVA: "Transizione positiva (+)",
  TRANSIZIONE_NEGATIVA: "Transizione negativa (-)",
};

export const MACRO_FASE_DESC: Record<MacroFaseEnum, string> = {
  POSSESSO: "Fase offensiva",
  NON_POSSESSO: "Fase difensiva",
  TRANSIZIONE_POSITIVA: "Palla recuperata",
  TRANSIZIONE_NEGATIVA: "Palla persa",
};

/**
 * Palette dei badge sulle card (verde / rosso / blu / giallo come da specs).
 * Restituisce classi Tailwind già pronte.
 */
export const MACRO_FASE_BADGE: Record<
  MacroFaseEnum,
  { bg: string; text: string; ring: string; dot: string }
> = {
  POSSESSO: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-200",
    ring: "ring-emerald-400/40",
    dot: "bg-emerald-400",
  },
  NON_POSSESSO: {
    bg: "bg-rose-500/15",
    text: "text-rose-200",
    ring: "ring-rose-400/40",
    dot: "bg-rose-400",
  },
  TRANSIZIONE_POSITIVA: {
    bg: "bg-sky-500/15",
    text: "text-sky-200",
    ring: "ring-sky-400/40",
    dot: "bg-sky-400",
  },
  TRANSIZIONE_NEGATIVA: {
    bg: "bg-amber-500/15",
    text: "text-amber-200",
    ring: "ring-amber-400/40",
    dot: "bg-amber-400",
  },
};

// ============================================================
// LIVELLO 2 — Sotto fase (10 valori)
// ============================================================

export type SottoFaseEnum =
  // POSSESSO
  | "COSTRUZIONE_BASSA"
  | "SVILUPPO_CONSOLIDAMENTO"
  | "RIFINITURA_FINALIZZAZIONE"
  // NON_POSSESSO
  | "PRESSIONE_ALTA"
  | "BLOCCO_MEDIO"
  | "BLOCCO_BASSO"
  // TRANSIZIONE_POSITIVA
  | "CONSOLIDAMENTO_POSSESSO"
  | "CONTROPIEDE_ATTACCO_DIRETTO"
  // TRANSIZIONE_NEGATIVA
  | "RIACQUISTO_IMMEDIATO"
  | "RIORGANIZZAZIONE_SCAPPARE";

export const SOTTO_FASE_VALUES: SottoFaseEnum[] = [
  "COSTRUZIONE_BASSA",
  "SVILUPPO_CONSOLIDAMENTO",
  "RIFINITURA_FINALIZZAZIONE",
  "PRESSIONE_ALTA",
  "BLOCCO_MEDIO",
  "BLOCCO_BASSO",
  "CONSOLIDAMENTO_POSSESSO",
  "CONTROPIEDE_ATTACCO_DIRETTO",
  "RIACQUISTO_IMMEDIATO",
  "RIORGANIZZAZIONE_SCAPPARE",
];

export const SOTTO_FASE_LABEL: Record<SottoFaseEnum, string> = {
  COSTRUZIONE_BASSA: "Costruzione bassa (primo terzo)",
  SVILUPPO_CONSOLIDAMENTO: "Sviluppo e consolidamento (centrocampo)",
  RIFINITURA_FINALIZZAZIONE: "Rifinitura e finalizzazione (terzo offensivo)",
  PRESSIONE_ALTA: "Pressione alta (terzo offensivo avversario)",
  BLOCCO_MEDIO: "Blocco medio (centrocampo)",
  BLOCCO_BASSO: "Blocco basso e difesa dell'area",
  CONSOLIDAMENTO_POSSESSO: "Consolidamento del possesso",
  CONTROPIEDE_ATTACCO_DIRETTO: "Contropiede / Attacco diretto",
  RIACQUISTO_IMMEDIATO: "Riacquisto immediato (Gegenpressing)",
  RIORGANIZZAZIONE_SCAPPARE: "Riorganizzazione / Scappare",
};

/** Descrizioni estese mostrate nei tooltip e nel dettaglio. */
export const SOTTO_FASE_DESC: Record<SottoFaseEnum, string> = {
  COSTRUZIONE_BASSA:
    "Uscita palla dal portiere, superamento della prima linea di pressione avversaria.",
  SVILUPPO_CONSOLIDAMENTO:
    "Manovra, cambi di campo, attrazione del pressing.",
  RIFINITURA_FINALIZZAZIONE:
    "Attacco alla linea difensiva, cross, 1v1 laterale, tiro da fuori.",
  PRESSIONE_ALTA:
    "Orientamenti di pressione sui loro difensori/portiere, inviti alla giocata.",
  BLOCCO_MEDIO:
    "Densità centrale, schermature dei passaggi, intercetto.",
  BLOCCO_BASSO:
    "Protezione della porta, postura nei cross, densità in area.",
  CONSOLIDAMENTO_POSSESSO:
    "Passaggio di sicurezza fuori dalla zona di pressione per mantenere il pallone.",
  CONTROPIEDE_ATTACCO_DIRETTO:
    "Verticalizzazione immediata per sfruttare l'avversario disorganizzato.",
  RIACQUISTO_IMMEDIATO:
    "Aggressione feroce sul portatore di palla nei primi 3-5 secondi.",
  RIORGANIZZAZIONE_SCAPPARE:
    "Ritardare l'azione avversaria e correre all'indietro a protezione dello spazio.",
};

// ============================================================
// LA MAPPA DEL MENU A CASCATA
// ============================================================

/**
 * Quale sotto-fase è valida per quale macro-fase.
 * Usata da:
 *  - PlayerForm cascata (filtro live nel select Livello 2)
 *  - FiltersSidebar (nesting nei filtri di ricerca)
 *  - Server actions (validazione runtime)
 *  - Replicata nel CHECK constraint a DB
 */
export const SOTTO_FASI_BY_MACRO: Record<MacroFaseEnum, SottoFaseEnum[]> = {
  POSSESSO: [
    "COSTRUZIONE_BASSA",
    "SVILUPPO_CONSOLIDAMENTO",
    "RIFINITURA_FINALIZZAZIONE",
  ],
  NON_POSSESSO: ["PRESSIONE_ALTA", "BLOCCO_MEDIO", "BLOCCO_BASSO"],
  TRANSIZIONE_POSITIVA: [
    "CONSOLIDAMENTO_POSSESSO",
    "CONTROPIEDE_ATTACCO_DIRETTO",
  ],
  TRANSIZIONE_NEGATIVA: [
    "RIACQUISTO_IMMEDIATO",
    "RIORGANIZZAZIONE_SCAPPARE",
  ],
};

/** Mappatura inversa: per ogni sotto-fase, qual è la macro. */
export const MACRO_BY_SOTTO_FASE: Record<SottoFaseEnum, MacroFaseEnum> =
  (() => {
    const map = {} as Record<SottoFaseEnum, MacroFaseEnum>;
    for (const macro of MACRO_FASE_VALUES) {
      for (const sotto of SOTTO_FASI_BY_MACRO[macro]) {
        map[sotto] = macro;
      }
    }
    return map;
  })();

/** Verifica se una sotto-fase è compatibile con una macro-fase. */
export function isSottoFaseValid(
  macro: MacroFaseEnum,
  sotto: SottoFaseEnum,
): boolean {
  return SOTTO_FASI_BY_MACRO[macro].includes(sotto);
}

// ============================================================
// Suggerimenti di focus tags (preset, non vincolanti)
// ============================================================

export const FOCUS_TAGS_PRESET = [
  "Terzo uomo",
  "Ampiezza",
  "Sovrapposizione",
  "Rotazione funzionale",
  "Linea di passaggio",
  "Sotto-palla",
  "Marcature preventive",
  "Copertura",
  "Scivolamento laterale",
  "Attacco allo spazio",
  "Densità in zona palla",
] as const;

// ============================================================
// Tipi compositi per UI
// ============================================================

export type SituationalListItem = Pick<
  SituationalRow,
  | "id"
  | "titolo"
  | "macro_fase"
  | "sotto_fase"
  | "autori"
  | "numero_giocatori"
  | "focus_tags"
  | "video_url"
  | "lavagna_url"
  | "pdf_url"
  | "updated_at"
>;
