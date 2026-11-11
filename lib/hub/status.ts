import { TONE, type Tone } from "@/lib/tones";

/** Colore del badge di stato, uguale in tutte le sezioni personali. */
const STATUS_TONE: Record<string, Tone> = {
  finito: "success",
  completato: "success",
  fatto: "success",
  letto: "success",
  superato: "success",
  raggiunto: "success",
  sicura: "success",
  entrata: "success",
  in_lettura: "info",
  in_corso: "info",
  in_programma: "info",
  attivo: "info",
  incerta: "warning",
  sospeso: "warning",
  rinviato: "warning",
  abbandonato: "danger",
  non_superato: "danger",
  uscita: "danger",
};

export function statusBadgeClass(value: unknown): string {
  const tone = typeof value === "string" ? STATUS_TONE[value] : undefined;
  return `${TONE[tone ?? "neutral"].badge} ring-1`;
}
