/**
 * Schema Zod dell'osservazione rapida (data + partita + ruolo + voto + nota).
 * Replica i vincoli del DB (0012): almeno uno tra voto e nota; casa ≠ ospite.
 */
import { z } from "zod";
import { RUOLO_VALUES, type RuoloEnum } from "@/lib/types/scouting";

const uuidOrNull = z.string().uuid().nullable();

export const observationFormSchema = z
  .object({
    data_osservazione: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Inserisci una data valida"),
    team_casa_id: uuidOrNull,
    team_ospite_id: uuidOrNull,
    competition_id: uuidOrNull,
    ruolo_giocato: z.enum(RUOLO_VALUES as [RuoloEnum, ...RuoloEnum[]]).nullable(),
    voto: z.number().int().min(1).max(10).nullable(),
    nota: z
      .string()
      .max(5000, "Massimo 5000 caratteri")
      .nullable()
      .transform((v) => v?.trim() || null),
  })
  .refine((v) => v.voto != null || !!v.nota, {
    message: "Inserisci almeno un voto o una nota",
    path: ["voto"],
  })
  .refine(
    (v) => !v.team_casa_id || !v.team_ospite_id || v.team_casa_id !== v.team_ospite_id,
    { message: "Casa e ospite non possono coincidere", path: ["team_ospite_id"] },
  );

export type ObservationFormInput = z.input<typeof observationFormSchema>;
export type ObservationFormValues = z.output<typeof observationFormSchema>;

export function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
