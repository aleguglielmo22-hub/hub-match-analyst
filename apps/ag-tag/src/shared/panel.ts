/**
 * Pannello di codifica: eventi, gruppi di sottotag per lato (nostro/loro),
 * coppia originale + specchio, stelle, anticipo e coda, registrazione.
 * Modulo puro, testato in panel.test.mjs.
 */

export type Selection = "single" | "multi";
export type Family = "possesso" | "non_possesso" | "transizione" | "palle_inattive" | "individuali";
/** Lato del campo, come salvato nel database. */
export type Side = "home" | "away";
/** Punto di vista: la squadra preferita della partita ("nostra") o l'altra. */
export type Perspective = "own" | "opp";
/** 0 = nessuna stella. */
export type Stars = 0 | 1 | 2 | 3;

export type PanelLabel = { code: string; name: string };
export type PanelGroup = { code: string; name: string; selection: Selection; labels: PanelLabel[] };
export type PanelEvent = {
  code: string;
  name: string;
  mirrorCode: string | null;
  family: Family;
  /** Colore "#rrggbb" dal file importato. */
  color: string;
  /** Anticipo e coda applicati alla registrazione, in millisecondi. */
  leadMs: number;
  lagMs: number;
  /** Set di sottotag per la nostra squadra e per l'avversaria (all'importazione identici). */
  groups: Record<Perspective, PanelGroup[]>;
};
export type Panel = { events: PanelEvent[] };

export const FAMILIES: { id: Family; label: string }[] = [
  { id: "possesso", label: "In possesso" },
  { id: "non_possesso", label: "Non possesso" },
  { id: "transizione", label: "Transizioni" },
  { id: "palle_inattive", label: "Palle inattive" },
  { id: "individuali", label: "Individuali" },
];

/** Anticipo e coda ammessi: da 0 a 60 secondi. */
export const MAX_LEAD_LAG_MS = 60_000;

const fold = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** Gruppi a scelta multipla (decisione D4); tutti gli altri a scelta singola. */
const MULTI_GROUPS = new Set(["meccanismo", "giocata", "comportamento", "pericolo", "aspetto"]);

export function defaultSelection(groupName: string): Selection {
  return MULTI_GROUPS.has(fold(groupName)) ? "multi" : "single";
}

export function findEvent(panel: Panel, code: string): PanelEvent | undefined {
  return panel.events.find((e) => e.code === code);
}

/** Individuali si sovrappone agli altri eventi; gli altri si chiudono a vicenda. */
export function isConcurrent(ev: Pick<PanelEvent, "family">): boolean {
  return ev.family === "individuali";
}

export function otherSide(side: Side): Side {
  return side === "home" ? "away" : "home";
}

/** Lato della squadra preferita, se è una delle due squadre in campo. */
export function preferredSide(preferredTeamId: string | null, homeId: string | null, awayId: string | null): Side | null {
  if (!preferredTeamId) return null;
  if (preferredTeamId === homeId) return "home";
  if (preferredTeamId === awayId) return "away";
  return null;
}

export function perspectiveOf(side: Side, preferred: Side): Perspective {
  return side === preferred ? "own" : "opp";
}

/** Gruppi di sottotag da usare per un evento registrato da una squadra. */
export function groupsFor(ev: PanelEvent, side: Side, preferred: Side): PanelGroup[] {
  return ev.groups[perspectiveOf(side, preferred)];
}

// ---------------------------------------------------------------------------
// Sottotag

/** Selezione dopo un clic su una voce: nei gruppi singoli sostituisce, nei multipli si aggiunge o si toglie. */
export function toggleLabel(groups: PanelGroup[], selected: string[], labelCode: string): string[] {
  const group = groups.find((g) => g.labels.some((l) => l.code === labelCode));
  if (!group) return selected;
  if (selected.includes(labelCode)) return selected.filter((c) => c !== labelCode);
  if (group.selection === "multi") return [...selected, labelCode];
  const others = new Set(group.labels.map((l) => l.code));
  return [...selected.filter((c) => !others.has(c)), labelCode];
}

/** Errore leggibile se la selezione non rispetta i gruppi dell'evento, altrimenti null. */
export function validateLabels(groups: PanelGroup[], selected: string[]): string | null {
  if (new Set(selected).size !== selected.length) return "Una voce è selezionata due volte.";
  for (const code of selected) {
    if (!groups.some((g) => g.labels.some((l) => l.code === code))) return `La voce «${code}» non appartiene a questo evento.`;
  }
  for (const g of groups) {
    if (g.selection === "single" && g.labels.filter((l) => selected.includes(l.code)).length > 1) {
      return `Nel gruppo «${g.name}» si sceglie una sola voce.`;
    }
  }
  return null;
}

/** Nomi delle voci scelte, nell'ordine dei gruppi. */
export function labelNames(groups: PanelGroup[], selected: string[]): string[] {
  return groups.flatMap((g) => g.labels.filter((l) => selected.includes(l.code)).map((l) => l.name));
}

export function isStars(v: unknown): v is Stars {
  return v === 0 || v === 1 || v === 2 || v === 3;
}

// ---------------------------------------------------------------------------
// Registrazione

export type OpenRecording = { code: string; startMs: number };
export type FinishedRecording = { code: string; startMs: number; endMs: number };

/**
 * Pressione di un evento (tasto o pulsante) all'istante `tMs`: lo stesso evento
 * si chiude; un evento nuovo chiude quelli in corso, salvo Individuali che si
 * sovrappone. Restituisce gli eventi rimasti aperti e quelli appena chiusi.
 */
export function press(
  panel: Panel,
  open: OpenRecording[],
  code: string,
  tMs: number,
): { open: OpenRecording[]; finished: FinishedRecording[] } {
  const ev = findEvent(panel, code);
  if (!ev) return { open, finished: [] };
  const same = open.find((o) => o.code === code);
  if (same) {
    return { open: open.filter((o) => o !== same), finished: [{ ...same, endMs: tMs }] };
  }
  if (isConcurrent(ev)) return { open: [...open, { code, startMs: tMs }], finished: [] };
  const closing = open.filter((o) => !isConcurrent(findEvent(panel, o.code) ?? ev));
  return {
    open: [...open.filter((o) => !closing.includes(o)), { code, startMs: tMs }],
    finished: closing.map((o) => ({ ...o, endMs: tMs })),
  };
}

/** Intervallo finale: anticipo e coda dell'evento, entro la durata del video. */
export function applyLeadLag(
  ev: Pick<PanelEvent, "leadMs" | "lagMs">,
  startMs: number,
  endMs: number,
  durationMs: number | null,
): { startMs: number; endMs: number } {
  const [a, b] = startMs <= endMs ? [startMs, endMs] : [endMs, startMs];
  const max = durationMs && durationMs > 0 ? durationMs : Number.POSITIVE_INFINITY;
  return { startMs: Math.max(0, Math.round(a - ev.leadMs)), endMs: Math.round(Math.min(max, b + ev.lagMs)) };
}

// ---------------------------------------------------------------------------
// Azioni: originale + specchio

export type Tag = {
  id: string;
  eventCode: string;
  side: Side;
  startMs: number;
  endMs: number;
  labels: string[];
  note: string;
  stars: Stars;
  /** Per lo specchio: id dell'originale. */
  originId: string | null;
};
export type ActionPair = { original: Tag; mirror: Tag | null };

/**
 * Coppia creata da una registrazione: l'originale per la squadra che compie
 * l'azione e, se l'evento ha uno specchio, l'evento specchio per l'altra
 * squadra, stesso intervallo, sottotag vuoti (da completare).
 */
export function buildPair(
  panel: Panel,
  rec: FinishedRecording,
  side: Side,
  durationMs: number | null,
  newId: () => string,
): ActionPair {
  const ev = findEvent(panel, rec.code);
  if (!ev) throw new Error(`Evento «${rec.code}» non presente nel pannello.`);
  const span = applyLeadLag(ev, rec.startMs, rec.endMs, durationMs);
  const original: Tag = { id: newId(), eventCode: ev.code, side, ...span, labels: [], note: "", stars: 0, originId: null };
  const mirrorEv = ev.mirrorCode ? findEvent(panel, ev.mirrorCode) : undefined;
  const mirror: Tag | null = mirrorEv
    ? { id: newId(), eventCode: mirrorEv.code, side: otherSide(side), ...span, labels: [], note: "", stars: 0, originId: original.id }
    : null;
  return { original, mirror };
}

/** Lo specchio va completato se il suo evento ha sottotag e nessuno è scelto. */
export function needsCompletion(panel: Panel, tag: Tag, preferred: Side): boolean {
  const ev = findEvent(panel, tag.eventCode);
  return !!ev && tag.labels.length === 0 && groupsFor(ev, tag.side, preferred).some((g) => g.labels.length > 0);
}

/** Nuovo intervallo dell'originale: lo specchio lo segue sempre. */
export function setSpan(pair: ActionPair, startMs: number, endMs: number): ActionPair {
  const span = { startMs: Math.max(0, Math.min(startMs, endMs)), endMs: Math.max(startMs, endMs) };
  return { original: { ...pair.original, ...span }, mirror: pair.mirror ? { ...pair.mirror, ...span } : null };
}

// ---------------------------------------------------------------------------
// Ricerca: originali e specchi sono tag distinti

export type TagFilter = { eventCode: string | null; perspective: Perspective | null; minStars: Stars };
export type TagRow = { tag: Tag; isMirror: boolean; pairId: string };

export function filterTags(pairs: ActionPair[], f: TagFilter, preferred: Side): TagRow[] {
  const rows: TagRow[] = pairs.flatMap((p) => [
    { tag: p.original, isMirror: false, pairId: p.original.id },
    ...(p.mirror ? [{ tag: p.mirror, isMirror: true, pairId: p.original.id }] : []),
  ]);
  return rows
    .filter((r) => !f.eventCode || r.tag.eventCode === f.eventCode)
    .filter((r) => !f.perspective || perspectiveOf(r.tag.side, preferred) === f.perspective)
    .filter((r) => r.tag.stars >= f.minStars)
    .sort((a, b) => a.tag.startMs - b.tag.startMs || Number(a.isMirror) - Number(b.isMirror));
}

/** Messaggio se la squadra preferita non si può cambiare (la partita ha già azioni), altrimenti null. */
export function preferredLockMessage(actionCount: number): string | null {
  if (actionCount <= 0) return null;
  const n = actionCount === 1 ? "un'azione registrata" : `${actionCount} azioni registrate`;
  return `La squadra non si può cambiare: questa partita ha già ${n}, codificate dal punto di vista di questa squadra. Se le elimini tutte, potrai cambiarla.`;
}
