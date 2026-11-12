/**
 * Ricerca globale: raggruppamento dei risultati di search_all (0015) per
 * sezione, link di ogni risultato ed evidenziazione del testo cercato
 * (accenti e maiuscole non contano, come nel database).
 * Modulo puro, testato in global-results.test.mjs.
 */

export type SearchSection = "player" | "observation" | "set_piece" | "situational" | "archive" | "related";
export type SearchKind = Exclude<SearchSection, "related">;

export type SearchRow = {
  sezione: string;
  tipo: string;
  id: string;
  titolo: string;
  sottotitolo: string | null;
  data: string | null;
  punteggio: number;
  collegato_a: string | null;
  apri_id: string | null;
};

export type SearchResult = {
  key: string;
  kind: SearchKind;
  id: string;
  title: string;
  subtitle: string | null;
  date: string | null;
  href: string;
};

export type SearchGroup = { key: string; label: string; results: SearchResult[] };

const SECTION_ORDER: SearchKind[] = ["player", "observation", "set_piece", "situational", "archive"];

export const SECTION_LABEL: Record<SearchKind, string> = {
  player: "Giocatori",
  observation: "Osservazioni",
  set_piece: "Piazzati",
  situational: "Esercitazioni",
  archive: "Cloud",
};

const KINDS = new Set<string>(SECTION_ORDER);

export function resultHref(kind: SearchKind, id: string, openId?: string | null): string {
  switch (kind) {
    case "player":
      return `/scouting/${id}`;
    case "observation":
      // Un'osservazione si apre nella scheda del suo giocatore.
      return `/scouting/${openId ?? id}`;
    case "set_piece":
      return `/set-pieces/${id}`;
    case "situational":
      return `/situational/${id}`;
    case "archive":
      return `/archivio/${id}`;
  }
}

/**
 * Gruppi nell'ordine Giocatori → Osservazioni → Piazzati → Esercitazioni →
 * Cloud → "Collegati a …" (uno per giocatore). Dentro ogni gruppo per
 * pertinenza; un elemento già presente non si ripete tra i collegati.
 */
export function groupSearchResults(rows: SearchRow[]): SearchGroup[] {
  const toResult = (r: SearchRow, kind: SearchKind): SearchResult => ({
    key: `${r.sezione}:${kind}:${r.id}`,
    kind,
    id: r.id,
    title: r.titolo,
    subtitle: r.sottotitolo || null,
    date: r.data,
    href: resultHref(kind, r.id, r.apri_id),
  });

  const groups: SearchGroup[] = [];
  const shown = new Set<string>();
  for (const kind of SECTION_ORDER) {
    const results = rows
      .filter((r) => r.sezione === kind)
      .sort((a, b) => b.punteggio - a.punteggio)
      .map((r) => toResult(r, kind));
    results.forEach((r) => shown.add(`${r.kind}:${r.id}`));
    if (results.length) groups.push({ key: kind, label: SECTION_LABEL[kind], results });
  }

  const related = new Map<string, SearchResult[]>();
  for (const r of rows) {
    if (r.sezione !== "related" || !KINDS.has(r.tipo) || !r.collegato_a) continue;
    const kind = r.tipo as SearchKind;
    if (shown.has(`${kind}:${r.id}`)) continue;
    shown.add(`${kind}:${r.id}`);
    const list = related.get(r.collegato_a) ?? [];
    list.push(toResult(r, kind));
    related.set(r.collegato_a, list);
  }
  for (const [name, results] of related) {
    groups.push({ key: `related:${name}`, label: `Collegati a ${name}`, results });
  }
  return groups;
}

/** Forma "piatta" del testo per il confronto: minuscole, senza accenti. */
function fold(ch: string): string {
  return ch.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Divide il testo in parti, marcando quelle che corrispondono alla ricerca.
 * Accenti e maiuscole non contano; il testo originale resta com'è.
 */
export function highlightParts(text: string, query: string): { text: string; match: boolean }[] {
  const q = fold(query.trim()).replace(/\s+/g, " ");
  if (!text || !q) return text ? [{ text, match: false }] : [];

  // Ogni carattere del testo con la sua forma "piatta" (stessa lunghezza
  // per carattere: le lettere accentate diventano una sola lettera).
  const chars = Array.from(text);
  const flat = chars.map((c) => {
    const f = fold(c);
    return f.length ? f : c;
  });
  const flatText = flat.join("");
  // Posizione nel testo piatto → indice del carattere originale.
  const owner: number[] = [];
  flat.forEach((f, i) => {
    for (let k = 0; k < f.length; k++) owner.push(i);
  });

  const parts: { text: string; match: boolean }[] = [];
  let from = 0;
  let pos = flatText.indexOf(q);
  while (pos !== -1) {
    const start = owner[pos];
    const end = owner[pos + q.length - 1] + 1;
    if (start > from) parts.push({ text: chars.slice(from, start).join(""), match: false });
    parts.push({ text: chars.slice(start, end).join(""), match: true });
    from = end;
    pos = flatText.indexOf(q, pos + q.length);
  }
  if (from < chars.length) parts.push({ text: chars.slice(from).join(""), match: false });
  return parts;
}
