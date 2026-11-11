/**
 * Lettura dell'esportazione di Apple Salute (export.xml) a pezzi, senza caricare
 * in memoria un file da centinaia di MB. Per ogni parametro e giorno restituisce
 * un solo valore, già nell'unità dell'app. Modulo puro, testato in health-xml.test.mjs.
 */

export type HealthRow = { data: string; tipo: string; valore: number };

type Rule = {
  tipo: string;
  /** sum = somma per giorno (si tiene la fonte con più dati, per non contare due volte iPhone e Watch); avg = media; last = ultimo valore. */
  how: "sum" | "avg" | "last";
  /** Converte dal valore e dall'unità del file a quella dell'app. */
  convert: (value: number, unit: string) => number;
  /** Per il sonno: conta solo i periodi "addormentato". */
  accept?: (raw: string) => boolean;
  /** Per il sonno: il valore è la durata in ore e il giorno è quello del risveglio. */
  duration?: boolean;
};

const id = (v: number) => v;

const RULES: Record<string, Rule> = {
  HKQuantityTypeIdentifierBodyMass: { tipo: "peso", how: "last", convert: (v, u) => (/lb/i.test(u) ? v * 0.45359237 : v) },
  HKQuantityTypeIdentifierRestingHeartRate: { tipo: "battito_riposo", how: "avg", convert: id },
  HKQuantityTypeIdentifierStepCount: { tipo: "passi", how: "sum", convert: id },
  HKQuantityTypeIdentifierActiveEnergyBurned: { tipo: "calorie_attive", how: "sum", convert: (v, u) => (/kj/i.test(u) ? v / 4.184 : v) },
  HKQuantityTypeIdentifierBodyFatPercentage: { tipo: "grasso_corporeo", how: "last", convert: (v) => (v <= 1 ? v * 100 : v) },
  HKQuantityTypeIdentifierOxygenSaturation: { tipo: "spo2", how: "avg", convert: (v) => (v <= 1 ? v * 100 : v) },
  HKQuantityTypeIdentifierHeartRateVariabilitySDNN: { tipo: "hrv", how: "avg", convert: id },
  HKQuantityTypeIdentifierBloodPressureSystolic: { tipo: "pressione_max", how: "avg", convert: id },
  HKQuantityTypeIdentifierBloodPressureDiastolic: { tipo: "pressione_min", how: "avg", convert: id },
  HKCategoryTypeIdentifierSleepAnalysis: {
    tipo: "sonno_ore",
    how: "sum",
    convert: id,
    accept: (raw) => /Asleep/.test(raw) && !/InBed|Awake/.test(raw),
    duration: true,
  },
};

type Bucket = { bySource: Map<string, number>; values: number[]; last: { at: string; v: number } | null };

const ATTR = /(\w+)="([^"]*)"/g;
const DATE_PART = /^(\d{4}-\d{2}-\d{2})/;

/** Ore tra due date scritte come "2026-11-10 23:10:00 +0100" (stesso fuso: si confrontano i testi locali). */
function hoursBetween(start: string, end: string): number {
  const toMs = (s: string) => {
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2}) ([+-])(\d{2})(\d{2})/);
    if (!m) return NaN;
    const local = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
    const offset = (m[7] === "-" ? -1 : 1) * (+m[8] * 60 + +m[9]) * 60000;
    return local - offset;
  };
  const h = (toMs(end) - toMs(start)) / 3600000;
  return Number.isFinite(h) && h > 0 && h < 24 ? h : 0;
}

export function createHealthParser(sinceDate: string | null = null) {
  const buckets = new Map<string, Bucket>(); // chiave: tipo|giorno
  let buffer = "";
  let records = 0;

  function handle(tag: string) {
    const typeMatch = tag.match(/\btype="([^"]*)"/);
    if (!typeMatch) return;
    const rule = RULES[typeMatch[1]];
    if (!rule) return;
    const attrs: Record<string, string> = {};
    for (const m of tag.matchAll(ATTR)) attrs[m[1]] = m[2];
    const rawValue = attrs.value ?? "";
    if (rule.accept && !rule.accept(rawValue)) return;
    const day = (attrs.endDate ?? attrs.startDate ?? "").match(DATE_PART)?.[1];
    if (!day || (sinceDate && day < sinceDate)) return;

    let value: number;
    if (rule.duration) {
      value = hoursBetween(attrs.startDate ?? "", attrs.endDate ?? "");
      if (value <= 0) return;
    } else {
      const n = Number(rawValue.replace(",", "."));
      if (!Number.isFinite(n)) return;
      value = rule.convert(n, attrs.unit ?? "");
    }
    records++;
    const key = `${rule.tipo}|${day}`;
    let b = buckets.get(key);
    if (!b) {
      b = { bySource: new Map(), values: [], last: null };
      buckets.set(key, b);
    }
    const source = attrs.sourceName ?? "?";
    b.bySource.set(source, (b.bySource.get(source) ?? 0) + value);
    b.values.push(value);
    const at = attrs.endDate ?? "";
    if (!b.last || at >= b.last.at) b.last = { at, v: value };
  }

  function scan(text: string) {
    for (const m of text.matchAll(/<Record\b[^>]*>/g)) handle(m[0]);
  }

  return {
    /** Passa un pezzo di file; i tag spezzati a metà vengono completati dal pezzo dopo. */
    push(chunk: string) {
      buffer += chunk;
      const lastOpen = buffer.lastIndexOf("<");
      const cut = lastOpen >= 0 && buffer.indexOf(">", lastOpen) === -1 ? lastOpen : buffer.length;
      scan(buffer.slice(0, cut));
      buffer = buffer.slice(cut);
    },
    finish(): { rows: HealthRow[]; records: number } {
      scan(buffer);
      buffer = "";
      const rows: HealthRow[] = [];
      for (const [key, b] of buckets) {
        const [tipo, data] = key.split("|");
        const rule = Object.values(RULES).find((r) => r.tipo === tipo)!;
        let valore: number;
        if (rule.how === "sum") valore = Math.max(...b.bySource.values());
        else if (rule.how === "avg") valore = b.values.reduce((a, c) => a + c, 0) / b.values.length;
        else valore = b.last?.v ?? 0;
        valore = Math.round(valore * 100) / 100;
        if (valore > 0) rows.push({ data, tipo, valore });
      }
      rows.sort((a, b) => a.data.localeCompare(b.data) || a.tipo.localeCompare(b.tipo));
      return { rows, records };
    },
  };
}
