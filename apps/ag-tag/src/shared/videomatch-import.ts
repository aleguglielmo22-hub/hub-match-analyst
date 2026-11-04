/**
 * Importazione del pannello da VideoMatch (XML) con, facoltativo, il file
 * LiveTag Pro (JSON) dello stesso pannello. Dall'XML: codici, specchi, lettere,
 * gruppi e voci. Da LiveTag: nomi dei gruppi, anticipo e coda (se c'è, vince
 * su VideoMatch), colori. Il risultato è un'anteprima da confermare.
 * Modulo puro, testato in videomatch-import.test.mjs.
 */
import { defaultSelection, type Family, type Panel, type PanelEvent, type PanelGroup, MAX_LEAD_LAG_MS } from "./panel.ts";

/** Prefisso dei codici del set avversario (stesse voci, codici distinti). */
export const OPP_PREFIX = "AVV-";

export type VmTag = { code: string; name: string; group: number };
export type VmEvent = { code: string; name: string; mirror: string | null; keyCode: number | null; leadMs: number; color: string; tags: VmTag[] };
export type LtGroup = { name: string; items: string[] };
export type LtEvent = { name: string; leadMs: number; lagMs: number; color: string; groups: LtGroup[] };

export type ImportPreview = {
  panel: Panel;
  /** Lettere predefinite per evento (dal file VideoMatch). */
  keys: Record<string, string>;
  warnings: string[];
  sources: { videomatch: string; livetag: string | null };
};

export class ImportError extends Error {}

const MAX_BYTES = 5 * 1024 * 1024;
const CODE = /^[A-Za-z0-9_-]{1,20}$/;

const fold = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** Testo da un attributo XML: entità e "\n" letterale di VideoMatch. */
function text(raw: string): string {
  return raw
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(/([A-Za-z_][\w.-]*)\s*=\s*"([^"]*)"/g)) out[m[1]] = m[2];
  return out;
}

const hex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");

/** "255x0x128x0" (A x R x G x B) → "#008000". */
function argbColor(raw: string | undefined): string {
  const p = (raw ?? "").split("x").map(Number);
  return p.length === 4 && p.every((n) => Number.isFinite(n)) ? `#${hex(p[1])}${hex(p[2])}${hex(p[3])}` : "#808080";
}

/** "0.12 0.58 0.33" (R G B da 0 a 1) → "#1f9455". */
function floatColor(raw: unknown): string | null {
  const p = String(raw ?? "").trim().split(/\s+/).map(Number);
  return p.length === 3 && p.every((n) => Number.isFinite(n)) ? `#${hex(p[0] * 255)}${hex(p[1] * 255)}${hex(p[2] * 255)}` : null;
}

function seconds(raw: unknown): number | null {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.round(Math.min(n * 1000, MAX_LEAD_LAG_MS)) : null;
}

/** Codice tasto di VideoMatch (Java) → combinazione come nelle scorciatoie ("KeyQ", "Digit1"). */
export function keyCodeToCombo(code: number | null): string | null {
  if (code === null) return null;
  if (code >= 65 && code <= 90) return `Key${String.fromCharCode(code)}`;
  if (code >= 48 && code <= 57) return `Digit${code - 48}`;
  return null;
}

export function parseVideoMatchXml(xml: string): VmEvent[] {
  if (xml.length > MAX_BYTES) throw new ImportError("Il file VideoMatch è troppo grande.");
  if (!/<VideoMatch[\s>]/.test(xml)) throw new ImportError("Il file non è un pannello VideoMatch.");
  const events: VmEvent[] = [];
  for (const m of xml.matchAll(/<EVENT\b([^>]*)>([\s\S]*?)<\/EVENT>/g)) {
    const a = attrs(m[1]);
    const code = (a.cod ?? "").trim();
    if (!CODE.test(code)) throw new ImportError(`Codice evento non valido: «${code}».`);
    const name = text(a.desc ?? "");
    if (!name) throw new ImportError(`Evento ${code} senza nome.`);
    const tags: VmTag[] = [];
    for (const t of m[2].matchAll(/<TAG\b([^>]*?)\/?>/g)) {
      const ta = attrs(t[1]);
      const tcode = (ta.cod ?? "").trim();
      const group = Number(ta.group);
      if (!CODE.test(tcode)) throw new ImportError(`Codice sottotag non valido in ${code}: «${tcode}».`);
      if (!Number.isInteger(group) || group < 0) throw new ImportError(`Gruppo non valido per ${tcode}.`);
      tags.push({ code: tcode, name: text(ta.desc ?? "") || tcode, group });
    }
    const sh = Number(a.sh);
    events.push({
      code,
      name,
      mirror: a.associato?.trim() || null,
      keyCode: Number.isInteger(sh) && sh > 0 ? sh : null,
      leadMs: seconds(a.anticipo) ?? 0,
      color: argbColor(a.backgroundColor),
      tags,
    });
  }
  if (events.length === 0) throw new ImportError("Nessun evento nel file VideoMatch.");
  return events;
}

/** Eventi del file LiveTag Pro: i gruppi sono nella descrizione ("Gruppo: a, b | Altro: c"). */
export function parseLiveTagJson(json: string): LtEvent[] {
  if (json.length > MAX_BYTES) throw new ImportError("Il file LiveTag è troppo grande.");
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new ImportError("Il file LiveTag non è un JSON valido.");
  }
  const deps = (data as { dependencies?: unknown })?.dependencies;
  if (!Array.isArray(deps)) throw new ImportError("Il file non è un pannello LiveTag Pro.");
  const out: LtEvent[] = [];
  for (const d of deps) {
    if (d?.type !== "tag" || typeof d.data?.name !== "string") continue;
    const groups: LtGroup[] = String(d.data.description ?? "")
      .split("|")
      .map((part) => {
        const i = part.indexOf(":");
        return i < 0
          ? null
          : { name: part.slice(0, i).trim(), items: part.slice(i + 1).split(",").map((s) => s.trim()).filter(Boolean) };
      })
      .filter((g): g is LtGroup => !!g && !!g.name);
    out.push({
      name: text(d.data.name),
      leadMs: seconds(d.data.time_before) ?? 0,
      lagMs: seconds(d.data.time_after) ?? 0,
      color: floatColor(d.data.color) ?? "",
      groups,
    });
  }
  if (out.length === 0) throw new ImportError("Nessun evento nel file LiveTag.");
  return out;
}

/**
 * Famiglia dell'evento: senza specchio → Individuali; coppia con lo stesso
 * colore → Palle inattive (se il nome lo dice) o Transizioni; altrimenti il
 * primo della coppia nel file è "in possesso", il suo specchio "non possesso".
 */
function familyOf(ev: VmEvent, all: VmEvent[], color: (e: VmEvent) => string): Family {
  if (!ev.mirror) return "individuali";
  const mirror = all.find((e) => e.code === ev.mirror)!;
  if (color(ev) === color(mirror)) return /inattiv/.test(fold(ev.name)) ? "palle_inattive" : "transizione";
  return all.indexOf(ev) < all.indexOf(mirror) ? "possesso" : "non_possesso";
}

const ordinal = (n: number) => `Gruppo ${n}`;

export function buildPreview(
  vm: VmEvent[],
  lt: LtEvent[] | null,
  sources: { videomatch: string; livetag: string | null },
): ImportPreview {
  const warnings: string[] = [];

  // Codici unici e specchi reciproci (A → B e B → A).
  const codes = new Set<string>();
  for (const e of vm) {
    if (codes.has(e.code)) throw new ImportError(`Codice evento ripetuto: ${e.code}.`);
    codes.add(e.code);
  }
  const tagCodes = new Set<string>();
  for (const e of vm) {
    for (const t of e.tags) {
      if (tagCodes.has(t.code)) throw new ImportError(`Codice sottotag ripetuto: ${t.code}.`);
      tagCodes.add(t.code);
    }
    if (!e.mirror) continue;
    if (e.mirror === e.code) throw new ImportError(`${e.name}: un evento non può essere lo specchio di sé stesso.`);
    const m = vm.find((x) => x.code === e.mirror);
    if (!m) throw new ImportError(`${e.name}: l'evento specchio ${e.mirror} non esiste nel file.`);
    if (m.mirror !== e.code) throw new ImportError(`Specchi incoerenti: ${e.code} → ${m.code}, ma ${m.code} → ${m.mirror ?? "nessuno"}.`);
  }

  const ltByName = new Map((lt ?? []).map((l) => [fold(l.name), l]));
  if (lt) {
    for (const l of lt) {
      if (!vm.some((e) => fold(e.name) === fold(l.name))) warnings.push(`LiveTag: «${l.name}» non c'è nel file VideoMatch ed è ignorato.`);
    }
  }
  const colorOf = (e: VmEvent) => ltByName.get(fold(e.name))?.color || e.color;

  const keys: Record<string, string> = {};
  const usedKeys = new Map<string, string>();
  const events: PanelEvent[] = vm.map((e) => {
    const l = ltByName.get(fold(e.name));
    if (lt && !l) warnings.push(`${e.name}: non trovato nel file LiveTag (nomi dei gruppi generici, anticipo da VideoMatch).`);

    // Gruppi nell'ordine dei numeri di VideoMatch; nomi da LiveTag se le voci coincidono.
    const numbers = [...new Set(e.tags.map((t) => t.group))].sort((a, b) => a - b);
    let names = numbers.map((_, i) => ordinal(i + 1));
    if (l) {
      const same =
        l.groups.length === numbers.length &&
        numbers.every((n, i) => {
          const items = e.tags.filter((t) => t.group === n).map((t) => fold(t.name));
          return items.length === l.groups[i].items.length && items.every((x, j) => x === fold(l.groups[i].items[j]));
        });
      if (same) names = l.groups.map((g) => g.name);
      else warnings.push(`${e.name}: i gruppi di LiveTag non coincidono con quelli di VideoMatch (nomi dei gruppi generici).`);
    }
    const own: PanelGroup[] = numbers.map((n, i) => ({
      code: `${e.code}-G${n}`,
      name: names[i],
      selection: defaultSelection(names[i]),
      labels: e.tags.filter((t) => t.group === n).map((t) => ({ code: t.code, name: t.name })),
    }));
    const opp: PanelGroup[] = own.map((g) => ({
      ...g,
      code: OPP_PREFIX + g.code,
      labels: g.labels.map((x) => ({ code: OPP_PREFIX + x.code, name: x.name })),
    }));

    // Anticipo e coda: LiveTag se c'è, altrimenti l'anticipo di VideoMatch.
    const leadMs = l ? l.leadMs : e.leadMs;
    const lagMs = l ? l.lagMs : 0;
    if (l && l.leadMs !== e.leadMs) {
      warnings.push(`${e.name}: anticipo ${l.leadMs / 1000} s da LiveTag (VideoMatch indica ${e.leadMs / 1000} s).`);
    }

    const combo = keyCodeToCombo(e.keyCode);
    if (combo) {
      const prev = usedKeys.get(combo);
      if (prev) warnings.push(`${e.name}: la lettera è già usata da ${prev}, va scelta nelle impostazioni.`);
      else {
        usedKeys.set(combo, e.name);
        keys[e.code] = combo;
      }
    }

    return { code: e.code, name: e.name, mirrorCode: e.mirror, family: familyOf(e, vm, colorOf), color: colorOf(e), leadMs, lagMs, groups: { own, opp } };
  });

  return { panel: { events }, keys, warnings, sources };
}

/** Anteprima dai testi dei due file (LiveTag facoltativo). */
export function previewFromFiles(
  videomatch: { name: string; text: string },
  livetag: { name: string; text: string } | null,
): ImportPreview {
  const vm = parseVideoMatchXml(videomatch.text);
  const lt = livetag ? parseLiveTagJson(livetag.text) : null;
  return buildPreview(vm, lt, { videomatch: videomatch.name, livetag: livetag?.name ?? null });
}
