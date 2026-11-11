/**
 * Campi delle sezioni personali (Studi, Benessere, Finanze): tipi, lettura dei
 * valori scritti nei moduli e formattazione per le liste.
 * Modulo puro (nessun import con alias), testato in fields.test.mjs.
 */

export type FieldType =
  | "text"
  | "longtext"
  | "number"
  | "integer"
  | "money"
  | "date"
  | "select"
  | "url"
  | "rating"
  | "tags"
  | "boolean"
  | "ref";

export type Option = { value: string; label: string };

export type FieldDef = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: readonly Option[];
  /** Per "ref": sezione da cui scegliere (es. categorie dei movimenti). */
  ref?: string;
  /** Lunghezza massima (testi) o valore massimo (numeri). */
  max?: number;
  min?: number;
  step?: number;
  unit?: string;
  /** Valore iniziale nel modulo; "today" = data di oggi. */
  defaultValue?: string | number | boolean;
  placeholder?: string;
  help?: string;
  /** Colonna visibile nella vista tabella. */
  inTable?: boolean;
  /** Campo occupa tutta la riga del modulo. */
  wide?: boolean;
  /** Non modificabile dal modulo (calcolato o gestito da un'azione). */
  readOnly?: boolean;
};

export type FieldErrors = Record<string, string>;
export type ParseResult =
  | { ok: true; values: Record<string, unknown> }
  | { ok: false; errors: FieldErrors };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** "1.234,56" / "1234.56" / "12,5" → numero; null se vuoto o non valido. */
export function parseDecimal(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw !== "string") return null;
  let s = raw.trim().replace(/\s|€/g, "");
  if (!s) return null;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    // Il separatore più a destra è quello dei decimali.
    s = lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (lastComma > -1) {
    s = s.replace(",", ".");
  } else if ((s.match(/\./g) ?? []).length > 1) {
    s = s.replace(/\./g, "");
  }
  if (!/^[-+]?\d*\.?\d+$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Euro scritti dall'utente → centesimi interi (niente arrotondamenti sui totali). */
export function eurosToCents(raw: unknown): number | null {
  // Negli importi "1.000" o "12.500" sono migliaia, non decimali.
  if (typeof raw === "string" && /^[-+]?[1-9]\d{0,2}(\.\d{3})+$/.test(raw.trim().replace(/\s|€/g, ""))) {
    raw = raw.replace(/\./g, "");
  }
  const n = parseDecimal(raw);
  if (n === null) return null;
  return Math.round(n * 100);
}

export function centsToEuros(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
export function formatMoney(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  return euro.format(cents / 100);
}

const MONTHS = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
export function formatDate(iso: string | null | undefined): string {
  if (!iso || !DATE_RE.test(iso.slice(0, 10))) return "";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function todayIso(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Giorni da oggi a una data (negativo = passata). */
export function daysUntil(iso: string, now = new Date()): number {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const target = Date.UTC(y, m - 1, d);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86_400_000);
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
}

/** Tag scritti come "a, b, c" o già come elenco → elenco pulito, senza doppioni. */
export function parseTags(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(",") : [];
  const out: string[] = [];
  for (const t of list) {
    if (typeof t !== "string") continue;
    const v = t.trim().replace(/\s+/g, " ").slice(0, 40);
    if (v && !out.some((o) => o.toLowerCase() === v.toLowerCase())) out.push(v);
  }
  return out.slice(0, 20);
}

function isEmpty(raw: unknown): boolean {
  return raw === null || raw === undefined || (typeof raw === "string" && raw.trim() === "");
}

/**
 * Legge e controlla i valori di un modulo. Restituisce solo i campi dichiarati
 * (i campi in sola lettura vengono ignorati): mai colonne scelte dal browser.
 */
export function parseValues(fields: readonly FieldDef[], raw: Record<string, unknown>): ParseResult {
  const values: Record<string, unknown> = {};
  const errors: FieldErrors = {};

  for (const f of fields) {
    if (f.readOnly) continue;
    const v = raw[f.key];

    if (f.type === "boolean") {
      values[f.key] = v === true || v === "true" || v === "on";
      continue;
    }
    if (f.type === "tags") {
      values[f.key] = parseTags(v);
      continue;
    }
    if (isEmpty(v)) {
      if (f.required) errors[f.key] = `${f.label}: campo obbligatorio`;
      else values[f.key] = null;
      continue;
    }

    switch (f.type) {
      case "text":
      case "longtext": {
        const s = String(v).trim();
        const max = f.max ?? (f.type === "text" ? 300 : 20000);
        if (s.length > max) errors[f.key] = `${f.label}: massimo ${max} caratteri`;
        else values[f.key] = s;
        break;
      }
      case "url": {
        const s = String(v).trim();
        let ok = false;
        try {
          const u = new URL(s);
          ok = (u.protocol === "https:" || u.protocol === "http:") && s.length <= 2048;
        } catch {
          ok = false;
        }
        if (!ok) errors[f.key] = `${f.label}: indirizzo non valido (deve iniziare con https://)`;
        else values[f.key] = s;
        break;
      }
      case "number":
      case "integer":
      case "rating": {
        const n = parseDecimal(v);
        const min = f.type === "rating" ? 1 : f.min;
        const max = f.type === "rating" ? 5 : f.max;
        if (n === null) errors[f.key] = `${f.label}: numero non valido`;
        else if ((f.type !== "number") && !Number.isInteger(n)) errors[f.key] = `${f.label}: serve un numero intero`;
        else if (min !== undefined && n < min) errors[f.key] = `${f.label}: minimo ${min}`;
        else if (max !== undefined && n > max) errors[f.key] = `${f.label}: massimo ${max}`;
        else values[f.key] = n;
        break;
      }
      case "money": {
        const c = eurosToCents(v);
        const minCents = f.min !== undefined ? Math.round(f.min * 100) : undefined;
        if (c === null) errors[f.key] = `${f.label}: importo non valido`;
        else if (Math.abs(c) > 99_999_999_999) errors[f.key] = `${f.label}: importo troppo grande`;
        else if (minCents !== undefined && c < minCents) errors[f.key] = `${f.label}: minimo ${centsToEuros(minCents)} €`;
        else values[f.key] = c;
        break;
      }
      case "date": {
        const s = String(v).trim();
        if (!DATE_RE.test(s) || Number.isNaN(Date.parse(s))) errors[f.key] = `${f.label}: data non valida`;
        else values[f.key] = s;
        break;
      }
      case "select": {
        const s = String(v);
        if (!f.options?.some((o) => o.value === s)) errors[f.key] = `${f.label}: scelta non valida`;
        else values[f.key] = s;
        break;
      }
      case "ref": {
        const s = String(v);
        if (!UUID_RE.test(s)) errors[f.key] = `${f.label}: scelta non valida`;
        else values[f.key] = s;
        break;
      }
    }
  }

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, values };
}

/** Valore da mettere nel campo del modulo (stringa per gli input). */
export function toInputValue(f: FieldDef, v: unknown): string | boolean | string[] {
  if (f.type === "boolean") return v === true;
  if (f.type === "tags") return Array.isArray(v) ? (v as string[]) : [];
  if (v === null || v === undefined) return "";
  if (f.type === "money") return centsToEuros(v as number);
  if (f.type === "number" && typeof v === "number") return String(v).replace(".", ",");
  return String(v);
}

export type FormValues = Record<string, string | boolean | string[]>;

/**
 * Valori iniziali di un modulo: quelli dell'elemento, oppure i predefiniti
 * con eventuali valori di un modello. "today" diventa la data di oggi.
 */
export function initialValues(
  fields: readonly FieldDef[],
  row: Record<string, unknown> | null,
  template?: Record<string, unknown>,
  now = new Date(),
): FormValues {
  const out: FormValues = {};
  for (const f of fields) {
    if (f.readOnly) continue;
    let v: unknown = row ? row[f.key] : (template?.[f.key] ?? f.defaultValue);
    if (v === "today") v = todayIso(now);
    // Importi predefiniti scritti in euro (es. "0"): restano come sono.
    out[f.key] = !row && f.type === "money" && typeof v === "string" ? v : toInputValue(f, v);
  }
  return out;
}

/** Valore leggibile per liste e dettaglio. */
export function formatValue(f: FieldDef, v: unknown, refLabels?: Record<string, string>): string {
  if (v === null || v === undefined || v === "") return "";
  switch (f.type) {
    case "money":
      return formatMoney(v as number);
    case "date":
      return formatDate(String(v));
    case "select":
      return f.options?.find((o) => o.value === v)?.label ?? String(v);
    case "rating":
      return "★".repeat(Number(v)) + "☆".repeat(Math.max(0, 5 - Number(v)));
    case "boolean":
      return v ? "Sì" : "No";
    case "tags":
      return Array.isArray(v) ? (v as string[]).join(", ") : "";
    case "ref":
      return refLabels?.[String(v)] ?? "";
    case "number":
      return `${String(v).replace(".", ",")}${f.unit ? ` ${f.unit}` : ""}`;
    case "integer":
      return `${v}${f.unit ? ` ${f.unit}` : ""}`;
    default:
      return String(v);
  }
}

/** Ripasso a distanza: dopo 1 giorno, 1 settimana, 1 mese dal completamento. */
export const REVIEW_STEPS = [1, 7, 30] as const;

export function nextReviewDate(completedOn: string | null, reviewsDone: number): string | null {
  if (!completedOn || reviewsDone >= REVIEW_STEPS.length) return null;
  return addDays(completedOn, REVIEW_STEPS[reviewsDone]);
}
