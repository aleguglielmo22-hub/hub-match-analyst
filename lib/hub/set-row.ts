import type { SetKind } from "./workout";

/** Una serie di un allenamento, come la vede la schermata dal vivo. */
export type SetRow = {
  id: string;
  exercise_id: string;
  ordine: number | null;
  ripetizioni: number | null;
  carico_kg: number | null;
  fatta: boolean;
  tipo: SetKind;
  /** Range di ripetizioni previsto dalla scheda. */
  rip_min: number | null;
  rip_max: number | null;
  /** Durata in secondi (esercizi a tempo). */
  durata_s: number | null;
  /** Recupero previsto per l'esercizio; 0 = nessun recupero (superserie). */
  recupero_s: number | null;
  superset: number | null;
  nota_esercizio: string | null;
};

export const SET_COLUMNS =
  "id, exercise_id, ordine, ripetizioni, carico_kg, fatta, tipo, rip_min, rip_max, durata_s, recupero_s, superset, nota_esercizio";

const KINDS = new Set(["normale", "riscaldamento", "drop", "cedimento"]);
const num = (v: unknown): number | null => (v == null ? null : Number(v));

export function toSetRow(r: Record<string, unknown>): SetRow {
  return {
    id: String(r.id),
    exercise_id: String(r.exercise_id),
    ordine: num(r.ordine),
    ripetizioni: num(r.ripetizioni),
    carico_kg: num(r.carico_kg),
    fatta: r.fatta !== false,
    tipo: typeof r.tipo === "string" && KINDS.has(r.tipo) ? (r.tipo as SetKind) : "normale",
    rip_min: num(r.rip_min),
    rip_max: num(r.rip_max),
    durata_s: num(r.durata_s),
    recupero_s: num(r.recupero_s),
    superset: num(r.superset),
    nota_esercizio: typeof r.nota_esercizio === "string" && r.nota_esercizio ? r.nota_esercizio : null,
  };
}
