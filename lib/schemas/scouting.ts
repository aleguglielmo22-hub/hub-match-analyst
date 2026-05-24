import { z } from "zod";
import {
  FASCIA_INGAGGIO_VALUES,
  GESTI_MOTORI_VALUES,
  INFLUENZE_NEG,
  MUSCOLATURA_VALUES,
  PASSAPORTO_VALUES,
  PIEDE_VALUES,
  RATINGS,
  RUOLO_VALUES,
  SI_NO_AVOLTE_VALUES,
  STATUS_OSSERVAZIONE_VALUES,
  STRUTTURA_CORPOREA_VALUES,
  VOTO_POTENZIALE_VALUES,
  type RatingKey,
} from "@/lib/types/scouting";

/* ============================================================
 * Helper Zod
 * Tutti i campi opzionali usano `.nullable()` senza `.optional()`.
 * I default del form passano sempre `null`, mai `undefined`.
 * ============================================================ */

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Inserisci una data valida");

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

const ratingValue = z
  .union([
    z.number().int().min(1, "Min 1").max(10, "Max 10"),
    z.nan(),
    z.null(),
  ])
  .transform((v) =>
    typeof v === "number" && !Number.isNaN(v) ? v : null,
  );

const intOrNull = (min: number, max: number) =>
  z
    .union([z.number().int().min(min).max(max), z.nan(), z.null()])
    .transform((v) =>
      typeof v === "number" && !Number.isNaN(v) ? v : null,
    );

const moneyOrNull = z
  .union([z.number().int().nonnegative(), z.nan(), z.null()])
  .transform((v) =>
    typeof v === "number" && !Number.isNaN(v) ? v : null,
  );

/* ============================================================
 * Schema del form Player (allineato a 0006_scouting_refactor.sql)
 * ============================================================ */

const ratingShape = Object.fromEntries(
  RATINGS.map((r) => [r.key, ratingValue]),
) as Record<RatingKey, typeof ratingValue>;

const influenzaShape = Object.fromEntries(
  INFLUENZE_NEG.map((i) => [i.key, z.boolean()]),
) as Record<(typeof INFLUENZE_NEG)[number]["key"], z.ZodBoolean>;

export const playerFormSchema = z.object({
  // Anagrafica
  nome: z.string().trim().min(1, "Nome obbligatorio").max(100),
  cognome: z.string().trim().min(1, "Cognome obbligatorio").max(100),
  foto_url: httpUrlOrNull,
  data_nascita: isoDateOrNull,
  nazionalita: optionalText,
  passaporto: z.enum(PASSAPORTO_VALUES).nullable(),
  piede: z.enum(PIEDE_VALUES).nullable(),

  // Posizionamento
  ruolo_principale: z.enum(RUOLO_VALUES).nullable(),
  ruoli_secondari: z.array(z.enum(RUOLO_VALUES)),
  stili_gioco: z.array(z.string().trim().min(1).max(60)),

  // Contratto
  transfermarkt_url: httpUrlOrNull,
  squadra_attuale: optionalText,
  campionato: optionalText,
  scadenza_contratto: isoDateOrNull,
  agenzia: optionalText,
  valore_mercato_eur: moneyOrNull,
  fascia_ingaggio: z.enum(FASCIA_INGAGGIO_VALUES).nullable(),

  // Fisico
  altezza_cm: intOrNull(100, 250),
  peso_kg: intOrNull(30, 200),
  struttura_corporea: z.enum(STRUTTURA_CORPOREA_VALUES).nullable(),
  gesti_motori: z.enum(GESTI_MOTORI_VALUES).nullable(),
  muscolatura: z.enum(MUSCOLATURA_VALUES).nullable(),
  capacita_condizionali: optionalText,

  // A. Domande comportamentali (SI/NO/A_VOLTE)
  behav_delega_altri: z.enum(SI_NO_AVOLTE_VALUES).nullable(),
  behav_assume_responsabilita: z.enum(SI_NO_AVOLTE_VALUES).nullable(),

  // A. Influenze negative (boolean)
  ...influenzaShape,

  // Valutazioni 1-10 (71)
  ...ratingShape,

  // Workflow
  status_osservazione: z.enum(STATUS_OSSERVAZIONE_VALUES),
  voto_potenziale: z.enum(VOTO_POTENZIALE_VALUES).nullable(),
  data_ultimo_aggiornamento: isoDate,
  scout_assegnato: optionalText,

  // Media
  scouting_report_url: httpUrlOrNull,
  note_rapide: longText,
  clip_video_urls: z.array(z.string().url("URL non valido")),
});

export type PlayerFormValues = z.infer<typeof playerFormSchema>;

export function emptyPlayerForm(): PlayerFormValues {
  const base: Record<string, unknown> = {
    nome: "",
    cognome: "",
    foto_url: null,
    data_nascita: null,
    nazionalita: null,
    passaporto: null,
    piede: null,

    ruolo_principale: null,
    ruoli_secondari: [],
    stili_gioco: [],

    transfermarkt_url: null,
    squadra_attuale: null,
    campionato: null,
    scadenza_contratto: null,
    agenzia: null,
    valore_mercato_eur: null,
    fascia_ingaggio: null,

    altezza_cm: null,
    peso_kg: null,
    struttura_corporea: null,
    gesti_motori: null,
    muscolatura: null,
    capacita_condizionali: null,

    behav_delega_altri: null,
    behav_assume_responsabilita: null,

    status_osservazione: "DA_VISIONARE",
    voto_potenziale: null,
    data_ultimo_aggiornamento: new Date().toISOString().slice(0, 10),
    scout_assegnato: null,

    scouting_report_url: null,
    note_rapide: null,
    clip_video_urls: [],
  };
  for (const i of INFLUENZE_NEG) base[i.key] = false;
  for (const r of RATINGS) base[r.key] = null;
  return base as PlayerFormValues;
}
