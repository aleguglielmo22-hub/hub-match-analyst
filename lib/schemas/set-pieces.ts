/**
 * Zod schema per il form Set Pieces.
 *
 * La logica condizionale (campi offensivi/difensivi a seconda di `fase`,
 * specificazione punizione solo per Punizione) è gestita lato UI con
 * `form.watch()` e qui sotto è enforced via `.superRefine()` per allinearsi
 * ai CHECK constraint del DB.
 */
import { z } from "zod";
import {
  ALTEZZA_LINEA_VALUES,
  ESITO_FINALE_VALUES,
  FASE_VALUES,
  LATO_BATTUTA_VALUES,
  PIEDE_BATTITORE_VALUES,
  SISTEMA_MARCATURA_VALUES,
  SPECIFICAZIONE_PUNIZIONE_VALUES,
  SVILUPPO_SCHEMA_VALUES,
  TIPO_PIAZZATO_VALUES,
  TRAIETTORIA_VALUES,
  UOMINI_SUI_PALI_VALUES,
} from "@/lib/types/set-pieces";

// Helper riusati (stesso pattern del modulo scouting).
const isoDateOrNull = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal(""), z.null()])
  .transform((v) => (v === "" || v == null ? null : (v as string)));

const httpUrlOrNull = z
  .union([z.string().url("URL non valido"), z.literal(""), z.null()])
  .transform((v) => (v === "" || v == null ? null : (v as string)));

const optionalText = z
  .union([z.string().max(1000), z.null()])
  .transform((v) => {
    if (v == null) return null;
    const t = v.trim();
    return t ? t : null;
  });

const longText = z
  .union([z.string().max(10000), z.null()])
  .transform((v) => {
    if (v == null) return null;
    const t = v.trim();
    return t ? t : null;
  });

const intInRange = (min: number, max: number) =>
  z
    .union([z.number().int().min(min).max(max), z.nan(), z.null()])
    .transform((v) =>
      typeof v === "number" && !Number.isNaN(v) ? v : null,
    );

export const setPieceFormSchema = z
  .object({
    // § 1 Metadati
    titolo: z.string().trim().min(1, "Titolo obbligatorio").max(200),
    squadra_esecutrice: optionalText,
    squadra_avversaria: optionalText,
    competizione: optionalText,
    stagione: optionalText,
    minuto: intInRange(0, 130),
    punteggio: optionalText,
    data_evento: isoDateOrNull,

    // § 2 Macro
    fase: z.enum(FASE_VALUES, { message: "Scegli una fase" }),
    tipo_piazzato: z.enum(TIPO_PIAZZATO_VALUES, {
      message: "Scegli il tipo di piazzato",
    }),
    specificazione_punizione: z
      .enum(SPECIFICAZIONE_PUNIZIONE_VALUES)
      .nullable(),
    lato_battuta: z.enum(LATO_BATTUTA_VALUES).nullable(),

    // § 3 Offensivo
    piede_battitore: z.enum(PIEDE_BATTITORE_VALUES).nullable(),
    traiettoria: z.enum(TRAIETTORIA_VALUES).nullable(),
    sviluppo_schema: z.enum(SVILUPPO_SCHEMA_VALUES).nullable(),
    landing_zones: z.array(z.string().trim().min(1).max(60)),
    behavior_tags: z.array(z.string().trim().min(1).max(60)),
    giocatori_in_area: intInRange(0, 11),

    // § 4 Difensivo
    sistema_marcatura: z.enum(SISTEMA_MARCATURA_VALUES).nullable(),
    uomini_in_barriera: intInRange(0, 9),
    uomini_sui_pali: z.enum(UOMINI_SUI_PALI_VALUES).nullable(),
    altezza_linea_difensiva: z.enum(ALTEZZA_LINEA_VALUES).nullable(),
    giocatori_in_transizione: intInRange(0, 11),

    // § 5 Esito
    esito_finale: z.enum(ESITO_FINALE_VALUES).nullable(),
    note_esito: longText,

    // § 6 Media
    video_url: httpUrlOrNull,
    lavagna_image_url: httpUrlOrNull,
    pdf_url: httpUrlOrNull,
  })
  // Validazione condizionale: replica i CHECK del DB e dà messaggi utili.
  .superRefine((v, ctx) => {
    // 1) Specificazione punizione: solo se tipo_piazzato = PUNIZIONE
    if (v.specificazione_punizione && v.tipo_piazzato !== "PUNIZIONE") {
      ctx.addIssue({
        code: "custom",
        path: ["specificazione_punizione"],
        message: "Valida solo per il tipo Punizione",
      });
    }

    // 2) Mutua esclusione fase ↔ campi
    if (v.fase === "OFFENSIVO") {
      // I campi difensivi devono restare vuoti (la UI li nasconde).
      const defenseLeak =
        v.sistema_marcatura ||
        typeof v.uomini_in_barriera === "number" ||
        v.uomini_sui_pali ||
        v.altezza_linea_difensiva ||
        typeof v.giocatori_in_transizione === "number";
      if (defenseLeak) {
        ctx.addIssue({
          code: "custom",
          path: ["fase"],
          message:
            "Sono presenti valori da fase Difensiva. Cambia fase o svuotali.",
        });
      }
    } else if (v.fase === "DIFENSIVO") {
      const offenseLeak =
        v.piede_battitore ||
        v.traiettoria ||
        v.sviluppo_schema ||
        typeof v.giocatori_in_area === "number" ||
        v.landing_zones.length > 0 ||
        v.behavior_tags.length > 0;
      if (offenseLeak) {
        ctx.addIssue({
          code: "custom",
          path: ["fase"],
          message:
            "Sono presenti valori da fase Offensiva. Cambia fase o svuotali.",
        });
      }
    }
  });

export type SetPieceFormValues = z.infer<typeof setPieceFormSchema>;

/** Valori iniziali del form: tutti null/array vuoti tranne le scelte obbligatorie. */
export function emptySetPieceForm(): SetPieceFormValues {
  return {
    titolo: "",
    squadra_esecutrice: null,
    squadra_avversaria: null,
    competizione: null,
    stagione: null,
    minuto: null,
    punteggio: null,
    data_evento: null,

    fase: "OFFENSIVO",
    tipo_piazzato: "ANGOLO",
    specificazione_punizione: null,
    lato_battuta: null,

    piede_battitore: null,
    traiettoria: null,
    sviluppo_schema: null,
    landing_zones: [],
    behavior_tags: [],
    giocatori_in_area: null,

    sistema_marcatura: null,
    uomini_in_barriera: null,
    uomini_sui_pali: null,
    altezza_linea_difensiva: null,
    giocatori_in_transizione: null,

    esito_finale: null,
    note_esito: null,

    video_url: null,
    lavagna_image_url: null,
    pdf_url: null,
  };
}
