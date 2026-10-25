/**
 * Conversione righe → CSV per Excel italiano.
 * Separatore ";", fine riga CRLF, BOM UTF-8 (Excel riconosce gli accenti).
 * Solo per la copia "leggibile": i JSON del backup restano invariati.
 * Modulo senza dipendenze, eseguibile anche da Node per i test (csv.test.mjs).
 */

export const CSV_BOM = "﻿";
const SEPARATOR = ";";
const LIST_SEPARATOR = " | ";

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/;

const romeFormatter = new Intl.DateTimeFormat("it-IT", {
  timeZone: "Europe/Rome",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "2026-10-25" → "25/10/2026"; timestamp → "gg/mm/aaaa HH:mm" (ora italiana). */
function formatDateString(value: string): string | null {
  const d = DATE_RE.exec(value);
  if (d) return `${d[3]}/${d[2]}/${d[1]}`;
  if (TIMESTAMP_RE.test(value)) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const parts = Object.fromEntries(
      romeFormatter.formatToParts(date).map((p) => [p.type, p.value]),
    );
    return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`;
  }
  return null;
}

/** Valore singolo → testo leggibile (senza escaping CSV). */
export function formatCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "sì" : "no";
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : String(value).replace(".", ",");
  }
  if (typeof value === "string") return formatDateString(value) ?? value;
  if (Array.isArray(value)) {
    return value
      .map((v) => formatCsvValue(v))
      .filter((v) => v !== "")
      .join(LIST_SEPARATOR);
  }
  return JSON.stringify(value);
}

/** Racchiude tra virgolette se serve e raddoppia le virgolette interne. */
export function escapeCsvField(text: string): string {
  if (/[;"\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

/**
 * Righe → CSV completo (BOM incluso). Le colonne sono l'unione delle chiavi
 * di tutte le righe, nell'ordine in cui compaiono.
 */
export function rowsToCsv(rows: Record<string, unknown>[]): string {
  const columns: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        columns.push(key);
      }
    }
  }
  if (columns.length === 0) return CSV_BOM;

  const lines = [columns.map(escapeCsvField).join(SEPARATOR)];
  for (const row of rows) {
    lines.push(
      columns
        .map((c) => escapeCsvField(formatCsvValue(row[c])))
        .join(SEPARATOR),
    );
  }
  return CSV_BOM + lines.join("\r\n") + "\r\n";
}
