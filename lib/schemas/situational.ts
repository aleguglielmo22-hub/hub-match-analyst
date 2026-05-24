/**
 * Zod schema per il form Situazionali.
 *
 * Il `.superRefine()` enforce che la sotto-fase appartenga alla macro-fase
 * scelta, replicando il CHECK constraint del DB.
 */
import { z } from "zod";
import {
  MACRO_FASE_VALUES,
  SOTTO_FASE_VALUES,
  SOTTO_FASI_BY_MACRO,
} from "@/lib/types/situational";

const optionalText = z
  .union([z.string().max(1000), z.null()])
  .transform((v) => {
    if (v == null) return null;
    const t = v.trim();
    return t ? t : null;
  });

const longText = z
  .union([z.string().max(20000), z.null()])
  .transform((v) => {
    if (v == null) return null;
    const t = v.trim();
    return t ? t : null;
  });

const httpUrlOrNull = z
  .union([z.string().url("URL non valido"), z.literal(""), z.null()])
  .transform((v) => (v === "" || v == null ? null : (v as string)));

export const situationalFormSchema = z
  .object({
    titolo: z.string().trim().min(1, "Titolo obbligatorio").max(200),
    autori: z.array(z.string().trim().min(1).max(80)),
    numero_giocatori: z.array(z.string().trim().min(1).max(60)),
    spazio_dimensioni: optionalText,

    macro_fase: z.enum(MACRO_FASE_VALUES, { message: "Scegli una macro-fase" }),
    sotto_fase: z.enum(SOTTO_FASE_VALUES, { message: "Scegli una sotto-fase" }),

    focus_tags: z.array(z.string().trim().min(1).max(60)),

    descrizione_flusso: longText,
    regole_provocazione: longText,
    varianti: longText,

    video_url: httpUrlOrNull,
    lavagna_url: httpUrlOrNull,
    pdf_url: httpUrlOrNull,
  })
  .superRefine((v, ctx) => {
    // La sotto-fase deve appartenere alla macro-fase. Stesso pattern del DB CHECK.
    const compatible = SOTTO_FASI_BY_MACRO[v.macro_fase].includes(v.sotto_fase);
    if (!compatible) {
      ctx.addIssue({
        code: "custom",
        path: ["sotto_fase"],
        message: "La sotto-fase non è compatibile con la macro-fase scelta",
      });
    }
  });

export type SituationalFormValues = z.infer<typeof situationalFormSchema>;

export function emptySituationalForm(): SituationalFormValues {
  return {
    titolo: "",
    autori: [],
    numero_giocatori: [],
    spazio_dimensioni: null,
    macro_fase: "POSSESSO",
    sotto_fase: "COSTRUZIONE_BASSA",
    focus_tags: [],
    descrizione_flusso: null,
    regole_provocazione: null,
    varianti: null,
    video_url: null,
    lavagna_url: null,
    pdf_url: null,
  };
}
