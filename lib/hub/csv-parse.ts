/**
 * Lettura di file CSV (Zepp, Apple Health convertito, estratti conto…).
 * Tutto avviene nel browser: il file non viene mai caricato sul server.
 * Modulo puro, testato in csv-parse.test.mjs.
 */

/** Separatore più probabile tra virgola, punto e virgola e tabulazione. */
export function detectDelimiter(text: string): string {
  const firstLines = text.split(/\r?\n/).slice(0, 5).join("\n");
  const counts = [",", ";", "\t"].map((d) => ({ d, n: firstLines.split(d).length }));
  counts.sort((a, b) => b.n - a.n);
  return counts[0].n > 1 ? counts[0].d : ",";
}

/** CSV → righe di celle (gestisce virgolette, "" e a capo dentro le virgolette). */
export function parseCsv(text: string, delimiter = detectDelimiter(text)): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const s = text.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inQuotes) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === delimiter) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && s[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows.map((r) => r.map((c) => c.trim()));
}

const pad = (n: number) => String(n).padStart(2, "0");

function validYmd(y: number, m: number, d: number): string | null {
  if (y < 1990 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const t = new Date(Date.UTC(y, m - 1, d));
  if (t.getUTCMonth() !== m - 1) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

const MONTH_NAMES: Record<string, number> = {
  jan: 1, gen: 1, feb: 2, mar: 3, apr: 4, may: 5, mag: 5, jun: 6, giu: 6, jul: 7, lug: 7,
  aug: 8, ago: 8, sep: 9, set: 9, oct: 10, ott: 10, nov: 11, dec: 12, dic: 12,
};

function monthFromName(name: string): number | null {
  return MONTH_NAMES[name.toLowerCase().slice(0, 3)] ?? null;
}

/**
 * Data in formato AAAA-MM-GG da: 2026-11-10, 2026-11-10 08:30, 10/11/2026,
 * 10-11-2026, 10.11.2026, 20261110, "27 Jul 2025", "Jul 27, 2025",
 * "27 lug 2025", secondi o millisecondi dal 1970.
 */
export function parseAnyDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return validYmd(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (m) return validYmd(+m[3], +m[2], +m[1]);
  m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) return validYmd(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})\s+([A-Za-zÀ-ÿ]{3,9})\.?,?\s+(\d{4})/);
  if (m && monthFromName(m[2])) return validYmd(+m[3], monthFromName(m[2])!, +m[1]);
  m = s.match(/^([A-Za-zÀ-ÿ]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})/);
  if (m && monthFromName(m[1])) return validYmd(+m[3], monthFromName(m[1])!, +m[2]);
  if (/^\d{9,13}$/.test(s)) {
    const n = Number(s);
    const ms = s.length >= 12 ? n : n * 1000;
    const d = new Date(ms);
    return validYmd(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }
  return null;
}

export type Aggregation = "media" | "somma" | "ultimo" | "minimo" | "massimo";

/** Più valori nello stesso giorno → un valore solo, secondo la regola scelta. */
export function aggregate(values: number[], how: Aggregation): number {
  if (values.length === 0) return 0;
  switch (how) {
    case "somma":
      return values.reduce((a, b) => a + b, 0);
    case "ultimo":
      return values[values.length - 1];
    case "minimo":
      return Math.min(...values);
    case "massimo":
      return Math.max(...values);
    default:
      return values.reduce((a, b) => a + b, 0) / values.length;
  }
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
