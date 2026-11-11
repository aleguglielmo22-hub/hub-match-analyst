/**
 * Traduce quello che manda l'iPhone in valori dell'app: un valore per
 * parametro e giorno. Capisce il formato di "Health Auto Export" (JSON) e un
 * formato semplice scritto a mano, utile per un Comando Rapido:
 *   { "rows": [ { "data": "2026-11-10", "tipo": "peso", "valore": 80.5 } ] }
 * Modulo puro, testato in health-sync.test.mjs.
 */

import type { HealthRow } from "./health-xml";

const MAX_ROWS = 20000;
const DAY = /^(\d{4}-\d{2}-\d{2})/;
const TYPES = new Set(["peso", "battito_riposo", "sonno_ore", "passi", "stress", "calorie_attive", "grasso_corporeo", "spo2", "hrv", "pressione_max", "pressione_min"]);

type Item = Record<string, unknown>;
type How = "sum" | "avg" | "last";

const asNum = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v.replace(",", "."))) ? Number(v.replace(",", ".")) : null);
const asStr = (v: unknown): string => (typeof v === "string" ? v : "");
const pct = (v: number) => (v <= 1 ? v * 100 : v);

/** Metriche di Health Auto Export → parametro dell'app. */
const METRICS: Record<string, { tipo: string; how: How; convert: (v: number, units: string) => number; field?: string }> = {
  weight_body_mass: { tipo: "peso", how: "last", convert: (v, u) => (/lb/i.test(u) ? v * 0.45359237 : v) },
  resting_heart_rate: { tipo: "battito_riposo", how: "avg", convert: (v) => v },
  step_count: { tipo: "passi", how: "sum", convert: (v) => v },
  active_energy: { tipo: "calorie_attive", how: "sum", convert: (v, u) => (/kj/i.test(u) ? v / 4.184 : v) },
  body_fat_percentage: { tipo: "grasso_corporeo", how: "last", convert: pct },
  blood_oxygen_saturation: { tipo: "spo2", how: "avg", convert: pct },
  heart_rate_variability: { tipo: "hrv", how: "avg", convert: (v) => v },
};

type Bucket = { bySource: Map<string, number>; values: number[]; last: { at: string; v: number } | null };

export function normalizeSyncPayload(body: unknown): HealthRow[] {
  const out: HealthRow[] = [];
  const buckets = new Map<string, { how: How; b: Bucket }>();

  function add(tipo: string, how: How, day: string, value: number, source: string, at: string) {
    const key = `${tipo}|${day}`;
    let e = buckets.get(key);
    if (!e) {
      e = { how, b: { bySource: new Map(), values: [], last: null } };
      buckets.set(key, e);
    }
    e.b.bySource.set(source, (e.b.bySource.get(source) ?? 0) + value);
    e.b.values.push(value);
    if (!e.b.last || at >= e.b.last.at) e.b.last = { at, v: value };
  }

  const obj = (body ?? {}) as Item;

  // Formato semplice: { rows: [{ data, tipo, valore }] }
  if (Array.isArray(obj.rows)) {
    for (const r of obj.rows.slice(0, MAX_ROWS) as Item[]) {
      const tipo = asStr(r?.tipo);
      const data = asStr(r?.data).match(DAY)?.[1];
      const valore = asNum(r?.valore);
      if (TYPES.has(tipo) && data && valore !== null && valore >= 0) out.push({ tipo, data, valore });
    }
  }

  // Health Auto Export: { data: { metrics: [{ name, units, data: [...] }] } }
  const metrics = ((obj.data as Item | undefined)?.metrics ?? obj.metrics) as unknown;
  if (Array.isArray(metrics)) {
    for (const m of metrics as Item[]) {
      const name = asStr(m?.name);
      const units = asStr(m?.units);
      const items = Array.isArray(m?.data) ? (m.data as Item[]).slice(0, MAX_ROWS) : [];
      const simple = METRICS[name];
      for (const it of items) {
        const when = asStr(it.date) || asStr(it.end) || asStr(it.start);
        const day = when.match(DAY)?.[1];
        if (!day) continue;
        const source = asStr(it.source) || "?";
        if (simple) {
          const q = asNum(it.qty);
          if (q !== null) add(simple.tipo, simple.how, day, simple.convert(q, units), source, when);
        } else if (name === "blood_pressure") {
          const s = asNum(it.systolic);
          const d = asNum(it.diastolic);
          if (s !== null) add("pressione_max", "avg", day, s, source, when);
          if (d !== null) add("pressione_min", "avg", day, d, source, when);
        } else if (name === "sleep_analysis") {
          const total = asNum(it.totalSleep);
          if (total !== null) {
            add("sonno_ore", "last", day, total, source, when);
          } else {
            // Singoli periodi: contano solo quelli in cui dormivi, nel giorno del risveglio.
            const stage = asStr(it.value);
            const qty = asNum(it.qty);
            if (qty !== null && /^(core|deep|rem|asleep|unspecified)$/i.test(stage)) {
              const endDay = (asStr(it.endDate) || asStr(it.end) || when).match(DAY)?.[1] ?? day;
              add("sonno_ore", "sum", endDay, qty, source, asStr(it.endDate) || when);
            }
          }
        }
      }
    }
  }

  for (const [key, { how, b }] of buckets) {
    const [tipo, data] = key.split("|");
    let valore: number;
    if (how === "sum") valore = Math.max(...b.bySource.values());
    else if (how === "avg") valore = b.values.reduce((a, c) => a + c, 0) / b.values.length;
    else valore = b.last?.v ?? 0;
    valore = Math.round(valore * 100) / 100;
    if (valore > 0) out.push({ tipo, data, valore });
  }

  // Un solo valore per parametro e giorno (l'ultimo vince).
  const unique = new Map<string, HealthRow>();
  for (const r of out) unique.set(`${r.tipo}|${r.data}`, r);
  return [...unique.values()].sort((a, b) => a.data.localeCompare(b.data) || a.tipo.localeCompare(b.tipo)).slice(0, MAX_ROWS);
}
