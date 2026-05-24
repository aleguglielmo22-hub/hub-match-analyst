/**
 * Schemi Zod per la sezione Archivio.
 * Lo schema "client" è quello digitato nel form (con stringhe).
 * Lo schema "server" è quello che le Server Action accettano (con id risolti).
 */
import { z } from "zod";

export const AMBITO_VALUES = [
  "PRIMA_SQUADRA",
  "SETTORE_GIOVANILE",
  "CALCIO_FEMMINILE",
] as const;

export const CATEGORIA_LAVORO_VALUES = [
  "TEAM_STUDIO",
  "MATCH_STUDIO",
  "INDIVIDUAL_ANALYSIS",
  "DATA_ANALYSIS",
  "ALLENAMENTO",
] as const;

export const TIPO_MEDIA_VALUES = [
  "VIDEO_CLIP",
  "INTERA_PARTITA",
  "PDF_REPORT",
  "SLIDE_PRESENTAZIONE",
  "EXCEL_DATI",
] as const;

export const SORGENTE_VIDEO_VALUES = [
  "TELECAMERA_TATTICA",
  "BROADCASTER_TV",
  "WYSCOUT",
  "DRONE",
] as const;

const uuidOrNull = z
  .union([z.string().uuid(), z.literal("")])
  .transform((v) => (v === "" ? null : v))
  .nullable();

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Inserisci una data valida");

/** Una voce di file allegato (i metadati; il File vero vive solo client-side). */
export const archiveFileMetaSchema = z.object({
  file_name: z.string().min(1),
  file_path: z.string().min(1),
  file_size_bytes: z.number().int().nonnegative().optional().nullable(),
  mime_type: z.string().optional().nullable(),
  tipo_media: z.enum(TIPO_MEDIA_VALUES),
  posizione: z.number().int().nonnegative().default(0),
});
export type ArchiveFileMeta = z.infer<typeof archiveFileMetaSchema>;

/**
 * Payload completo del form di creazione, dopo che gli upload sono andati
 * a buon fine e i lookup (teams/comp/season) sono stati creati o selezionati.
 */
export const createArchiveItemSchema = z.object({
  id: z.string().uuid(),
  data_lavoro: isoDate,
  season_id: uuidOrNull.optional(),
  team_principale_id: uuidOrNull.optional(),
  team_avversario_id: uuidOrNull.optional(),
  competition_id: uuidOrNull.optional(),
  ambito: z.enum(AMBITO_VALUES),
  categoria_lavoro: z.enum(CATEGORIA_LAVORO_VALUES),
  tipo_media: z.array(z.enum(TIPO_MEDIA_VALUES)).min(1, "Scegli almeno un tipo di media"),
  sorgente_video: z.enum(SORGENTE_VIDEO_VALUES).nullable().optional(),
  titolo_archivio: z
    .string()
    .min(2, "Il titolo è troppo corto")
    .max(200, "Massimo 200 caratteri"),
  descrizione_estesa: z.string().max(5000).nullable().optional(),
  files: z.array(archiveFileMetaSchema).default([]),
  tag_ids: z.array(z.string().uuid()).default([]),
});
export type CreateArchiveItemInput = z.infer<typeof createArchiveItemSchema>;

/** Schema interno al form, lato client. */
export const archiveFormSchema = z
  .object({
    data_lavoro: isoDate,
    season_id: z.string().uuid().nullable().optional(),
    team_principale_id: z.string().uuid().nullable().optional(),
    team_avversario_id: z.string().uuid().nullable().optional(),
    competition_id: z.string().uuid().nullable().optional(),
    ambito: z.enum(AMBITO_VALUES, { message: "Scegli un ambito" }),
    categoria_lavoro: z.enum(CATEGORIA_LAVORO_VALUES, {
      message: "Scegli una categoria",
    }),
    tipo_media: z
      .array(z.enum(TIPO_MEDIA_VALUES))
      .min(1, "Scegli almeno un tipo di media"),
    sorgente_video: z.enum(SORGENTE_VIDEO_VALUES).nullable().optional(),
    titolo_archivio: z
      .string()
      .trim()
      .min(2, "Il titolo è troppo corto")
      .max(200, "Massimo 200 caratteri"),
    descrizione_estesa: z.string().trim().max(5000).optional(),
    tag_ids: z.array(z.string().uuid()),
  })
  .refine(
    (v) =>
      !v.team_principale_id ||
      !v.team_avversario_id ||
      v.team_principale_id !== v.team_avversario_id,
    {
      message: "Squadra principale e avversaria non possono coincidere",
      path: ["team_avversario_id"],
    },
  );
export type ArchiveFormValues = z.infer<typeof archiveFormSchema>;
