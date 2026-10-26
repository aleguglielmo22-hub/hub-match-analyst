"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/supabase/queries";
import { ilikeAnyFilter } from "@/lib/search/ilike-filter";
import { logLoadError } from "@/lib/load-result";
import { FASE_LABEL, TIPO_PIAZZATO_LABEL, type EsitoFinaleEnum, type FaseEnum } from "@/lib/types/set-pieces";
import { MACRO_FASE_LABEL } from "@/lib/types/situational";
import { CATEGORIA_LAVORO_LABEL } from "@/lib/types/archivio";
import {
  SET_PIECE_ROLES,
  dedupePlayerLinks,
  type SetPieceRole,
} from "@/lib/set-pieces/player-roles";

/**
 * Collegamenti tra sezioni (0014). Le scritture toccano solo le tabelle di
 * collegamento: le date di modifica degli elementi collegati non cambiano.
 * Gli elementi nel cestino non compaiono (i collegamenti restano salvati).
 */

export type LinkKind = "player" | "set_piece" | "situational" | "archive";

export type LinkTarget = {
  kind: LinkKind;
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
};

const kindSchema = z.enum(["player", "set_piece", "situational", "archive"]);
const idSchema = z.string().uuid();
type Supabase = Awaited<ReturnType<typeof createClient>>;

async function ctx() {
  const workspace = await getCurrentWorkspace();
  if (!workspace) throw new Error("Workspace non trovato");
  return { workspace, supabase: await createClient() };
}

/* ---------- mappatura righe → LinkTarget ---------- */

type PlayerRow = { id: string; nome: string; cognome: string; ruolo_principale: string | null; squadra_attuale: string | null };
type SetPieceRow = { id: string; titolo: string; fase: FaseEnum; tipo_piazzato: keyof typeof TIPO_PIAZZATO_LABEL; esito_finale: EsitoFinaleEnum | null };
type SituationalRow = { id: string; titolo: string; macro_fase: keyof typeof MACRO_FASE_LABEL };
type ArchiveRow = { id: string; titolo_archivio: string; data_lavoro: string; categoria_lavoro: keyof typeof CATEGORIA_LAVORO_LABEL };

const PLAYER_COLS = "id, nome, cognome, ruolo_principale, squadra_attuale";
const SP_COLS = "id, titolo, fase, tipo_piazzato, esito_finale";
const ST_COLS = "id, titolo, macro_fase";
const AR_COLS = "id, titolo_archivio, data_lavoro, categoria_lavoro";

const toPlayer = (p: PlayerRow): LinkTarget => ({
  kind: "player",
  id: p.id,
  title: [p.nome, p.cognome].filter(Boolean).join(" "),
  subtitle: [p.ruolo_principale, p.squadra_attuale].filter(Boolean).join(" · ") || null,
  href: `/scouting/${p.id}`,
});
const toSetPiece = (s: SetPieceRow): LinkTarget => ({
  kind: "set_piece",
  id: s.id,
  title: s.titolo,
  subtitle: `${FASE_LABEL[s.fase]} · ${TIPO_PIAZZATO_LABEL[s.tipo_piazzato]}`,
  href: `/set-pieces/${s.id}`,
});
const toSituational = (s: SituationalRow): LinkTarget => ({
  kind: "situational",
  id: s.id,
  title: s.titolo,
  subtitle: MACRO_FASE_LABEL[s.macro_fase],
  href: `/situational/${s.id}`,
});
const toArchive = (a: ArchiveRow): LinkTarget => ({
  kind: "archive",
  id: a.id,
  title: a.titolo_archivio,
  subtitle: `${CATEGORIA_LAVORO_LABEL[a.categoria_lavoro]} · ${a.data_lavoro.split("-").reverse().join("/")}`,
  href: `/archivio/${a.id}`,
});

/* ---------- ricerca ---------- */

/** Elementi di una sezione da collegare: ricerca mentre scrivi, recenti in cima. */
export async function searchLinkTargets(kind: LinkKind, query: string): Promise<LinkTarget[]> {
  kindSchema.parse(kind);
  const q = z.string().max(100).parse(query).trim();
  const { workspace, supabase } = await ctx();
  const ws = workspace.id;
  const LIMIT = 12;

  if (kind === "player") {
    let r = supabase.from("players").select(PLAYER_COLS).eq("workspace_id", ws).is("deleted_at", null);
    if (q) r = r.or(ilikeAnyFilter(["search_text"], q));
    const { data, error } = await r.order("updated_at", { ascending: false }).limit(LIMIT);
    if (error) throw new Error(error.message);
    return (data as PlayerRow[]).map(toPlayer);
  }
  if (kind === "set_piece") {
    let r = supabase.from("set_pieces").select(SP_COLS).eq("workspace_id", ws).is("deleted_at", null);
    if (q) r = r.or(ilikeAnyFilter(["titolo", "squadra_esecutrice", "squadra_avversaria"], q));
    const { data, error } = await r.order("updated_at", { ascending: false }).limit(LIMIT);
    if (error) throw new Error(error.message);
    return (data as SetPieceRow[]).map(toSetPiece);
  }
  if (kind === "situational") {
    let r = supabase.from("situational_tactics").select(ST_COLS).eq("workspace_id", ws).is("deleted_at", null);
    if (q) r = r.or(ilikeAnyFilter(["titolo"], q));
    const { data, error } = await r.order("updated_at", { ascending: false }).limit(LIMIT);
    if (error) throw new Error(error.message);
    return (data as SituationalRow[]).map(toSituational);
  }
  let r = supabase.from("archive_items").select(AR_COLS).eq("workspace_id", ws).is("deleted_at", null);
  if (q) r = r.or(ilikeAnyFilter(["titolo_archivio"], q));
  const { data, error } = await r.order("updated_at", { ascending: false }).limit(LIMIT);
  if (error) throw new Error(error.message);
  return (data as ArchiveRow[]).map(toArchive);
}

/* ---------- lettura dei collegamenti di un elemento ---------- */

async function targetsByIds(supabase: Supabase, ws: string, kind: LinkKind, ids: string[]): Promise<LinkTarget[]> {
  if (ids.length === 0) return [];
  const order = new Map(ids.map((id, i) => [id, i]));
  const sortByIds = (list: LinkTarget[]) => list.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  if (kind === "player") {
    const { data, error } = await supabase.from("players").select(PLAYER_COLS).eq("workspace_id", ws).is("deleted_at", null).in("id", ids);
    if (error) throw error;
    return sortByIds((data as PlayerRow[]).map(toPlayer));
  }
  if (kind === "set_piece") {
    const { data, error } = await supabase.from("set_pieces").select(SP_COLS).eq("workspace_id", ws).is("deleted_at", null).in("id", ids);
    if (error) throw error;
    return sortByIds((data as SetPieceRow[]).map(toSetPiece));
  }
  if (kind === "situational") {
    const { data, error } = await supabase.from("situational_tactics").select(ST_COLS).eq("workspace_id", ws).is("deleted_at", null).in("id", ids);
    if (error) throw error;
    return sortByIds((data as SituationalRow[]).map(toSituational));
  }
  const { data, error } = await supabase.from("archive_items").select(AR_COLS).eq("workspace_id", ws).is("deleted_at", null).in("id", ids);
  if (error) throw error;
  return sortByIds((data as ArchiveRow[]).map(toArchive));
}

export type SetPiecePlayer = LinkTarget & { ruolo: SetPieceRole };
export type PlayerSetPiece = LinkTarget & { ruolo: SetPieceRole; fase: FaseEnum; esito_finale: EsitoFinaleEnum | null };

/** Collegamenti di un piazzato: giocatori (con ruolo) e Cloud. null = errore. */
export async function getSetPieceLinks(setPieceId: string): Promise<{ players: SetPiecePlayer[]; archive: LinkTarget[] } | null> {
  idSchema.parse(setPieceId);
  try {
    const { workspace, supabase } = await ctx();
    const [pl, ar] = await Promise.all([
      supabase.from("set_piece_players").select("player_id, ruolo, created_at").eq("set_piece_id", setPieceId).order("created_at"),
      supabase.from("archive_item_set_pieces").select("archive_item_id, created_at").eq("set_piece_id", setPieceId).order("created_at"),
    ]);
    if (pl.error || ar.error) throw pl.error ?? ar.error;
    const players = await targetsByIds(supabase, workspace.id, "player", [...new Set(pl.data.map((r) => r.player_id))]);
    const byId = new Map(players.map((p) => [p.id, p]));
    return {
      players: pl.data.flatMap((r) => {
        const p = byId.get(r.player_id);
        return p ? [{ ...p, ruolo: r.ruolo }] : [];
      }),
      archive: await targetsByIds(supabase, workspace.id, "archive", ar.data.map((r) => r.archive_item_id)),
    };
  } catch (err) {
    logLoadError("Collegamenti · piazzato", err);
    return null;
  }
}

/** Collegamenti di un giocatore: piazzati (con ruolo ed esito) e Cloud. null = errore. */
export async function getPlayerLinks(playerId: string): Promise<{ setPieces: PlayerSetPiece[]; archive: LinkTarget[] } | null> {
  idSchema.parse(playerId);
  try {
    const { workspace, supabase } = await ctx();
    const [sp, ar] = await Promise.all([
      supabase.from("set_piece_players").select("set_piece_id, ruolo, created_at").eq("player_id", playerId).order("created_at", { ascending: false }),
      supabase.from("archive_item_players").select("archive_item_id, created_at").eq("player_id", playerId).order("created_at", { ascending: false }),
    ]);
    if (sp.error || ar.error) throw sp.error ?? ar.error;
    const spIds = [...new Set(sp.data.map((r) => r.set_piece_id))];
    const { data: rows, error } = spIds.length
      ? await supabase.from("set_pieces").select(SP_COLS).eq("workspace_id", workspace.id).is("deleted_at", null).in("id", spIds)
      : { data: [] as SetPieceRow[], error: null };
    if (error) throw error;
    const byId = new Map((rows as SetPieceRow[]).map((r) => [r.id, r]));
    return {
      setPieces: sp.data.flatMap((r) => {
        const s = byId.get(r.set_piece_id);
        return s ? [{ ...toSetPiece(s), ruolo: r.ruolo, fase: s.fase, esito_finale: s.esito_finale }] : [];
      }),
      archive: await targetsByIds(supabase, workspace.id, "archive", ar.data.map((r) => r.archive_item_id)),
    };
  } catch (err) {
    logLoadError("Collegamenti · giocatore", err);
    return null;
  }
}

/** Collegamenti di una voce del Cloud. null = errore. */
export async function getArchiveLinks(
  archiveId: string,
): Promise<{ players: LinkTarget[]; setPieces: LinkTarget[]; situational: LinkTarget[] } | null> {
  idSchema.parse(archiveId);
  try {
    const { workspace, supabase } = await ctx();
    const [pl, sp, st] = await Promise.all([
      supabase.from("archive_item_players").select("player_id, created_at").eq("archive_item_id", archiveId).order("created_at"),
      supabase.from("archive_item_set_pieces").select("set_piece_id, created_at").eq("archive_item_id", archiveId).order("created_at"),
      supabase.from("archive_item_situational").select("situational_id, created_at").eq("archive_item_id", archiveId).order("created_at"),
    ]);
    if (pl.error || sp.error || st.error) throw pl.error ?? sp.error ?? st.error;
    const [players, setPieces, situational] = await Promise.all([
      targetsByIds(supabase, workspace.id, "player", pl.data.map((r) => r.player_id)),
      targetsByIds(supabase, workspace.id, "set_piece", sp.data.map((r) => r.set_piece_id)),
      targetsByIds(supabase, workspace.id, "situational", st.data.map((r) => r.situational_id)),
    ]);
    return { players, setPieces, situational };
  } catch (err) {
    logLoadError("Collegamenti · Cloud", err);
    return null;
  }
}

/** Voci del Cloud collegate a un'esercitazione. null = errore. */
export async function getSituationalLinks(situationalId: string): Promise<LinkTarget[] | null> {
  idSchema.parse(situationalId);
  try {
    const { workspace, supabase } = await ctx();
    const { data, error } = await supabase
      .from("archive_item_situational")
      .select("archive_item_id, created_at")
      .eq("situational_id", situationalId)
      .order("created_at");
    if (error) throw error;
    return await targetsByIds(supabase, workspace.id, "archive", data.map((r) => r.archive_item_id));
  } catch (err) {
    logLoadError("Collegamenti · esercitazione", err);
    return null;
  }
}

/* ---------- scrittura: Cloud ↔ altra sezione (salvataggio immediato) ---------- */

const ARCHIVE_LINK = {
  player: { table: "archive_item_players", column: "player_id" },
  set_piece: { table: "archive_item_set_pieces", column: "set_piece_id" },
  situational: { table: "archive_item_situational", column: "situational_id" },
} as const;

const HREF = {
  player: (id: string) => `/scouting/${id}`,
  set_piece: (id: string) => `/set-pieces/${id}`,
  situational: (id: string) => `/situational/${id}`,
} as const;

type OtherKind = keyof typeof ARCHIVE_LINK;
const otherKindSchema = z.enum(["player", "set_piece", "situational"]);

const PERMISSION_MESSAGE =
  "Non hai i permessi per questo collegamento (proprietario del workspace o chi ha creato uno dei due elementi).";

export async function addArchiveLink(archiveId: string, kind: OtherKind, otherId: string): Promise<{ ok: true }> {
  idSchema.parse(archiveId);
  otherKindSchema.parse(kind);
  idSchema.parse(otherId);
  const { supabase } = await ctx();
  const { table, column } = ARCHIVE_LINK[kind];
  const { error } = await supabase.from(table).insert({ archive_item_id: archiveId, [column]: otherId } as never);
  // Già collegati: va bene così.
  if (error && error.code !== "23505") {
    throw new Error(error.code === "42501" ? PERMISSION_MESSAGE : error.message);
  }
  revalidatePath(`/archivio/${archiveId}`);
  revalidatePath(HREF[kind](otherId));
  return { ok: true };
}

export async function removeArchiveLink(archiveId: string, kind: OtherKind, otherId: string): Promise<{ ok: true }> {
  idSchema.parse(archiveId);
  otherKindSchema.parse(kind);
  idSchema.parse(otherId);
  const { supabase } = await ctx();
  const { table, column } = ARCHIVE_LINK[kind];
  const { data, error } = await supabase
    .from(table)
    .delete()
    .eq("archive_item_id", archiveId)
    // La colonna dipende dalla tabella scelta qui sopra (unione di tre tabelle).
    .eq(column as never, otherId)
    .select("archive_item_id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error(PERMISSION_MESSAGE);
  revalidatePath(`/archivio/${archiveId}`);
  revalidatePath(HREF[kind](otherId));
  return { ok: true };
}

/* ---------- scrittura: collegamenti del piazzato (dal form) ---------- */

const syncSchema = z.object({
  players: z.array(z.object({ player_id: idSchema, ruolo: z.enum(SET_PIECE_ROLES as [SetPieceRole, ...SetPieceRole[]]) })).max(40),
  archiveIds: z.array(idSchema).max(40),
});

/**
 * Allinea i collegamenti di un piazzato all'elenco del form: aggiunge i nuovi,
 * toglie quelli rimossi. Chiamata dopo il salvataggio del piazzato.
 * I collegamenti verso elementi nel cestino (non mostrati nel form) restano.
 */
export async function syncSetPieceLinks(
  setPieceId: string,
  raw: z.input<typeof syncSchema>,
): Promise<{ ok: true }> {
  idSchema.parse(setPieceId);
  const v = syncSchema.parse(raw);
  const players = dedupePlayerLinks(v.players);
  const archiveIds = [...new Set(v.archiveIds)];
  const { workspace, supabase } = await ctx();

  const [curPl, curAr] = await Promise.all([
    supabase.from("set_piece_players").select("id, player_id, ruolo").eq("set_piece_id", setPieceId),
    supabase.from("archive_item_set_pieces").select("archive_item_id").eq("set_piece_id", setPieceId),
  ]);
  if (curPl.error || curAr.error) throw new Error((curPl.error ?? curAr.error)!.message);

  // Solo gli elementi visibili nel form (non nel cestino) possono essere tolti.
  const [visiblePlayers, visibleArchive] = await Promise.all([
    targetsByIds(supabase, workspace.id, "player", curPl.data.map((r) => r.player_id)),
    targetsByIds(supabase, workspace.id, "archive", curAr.data.map((r) => r.archive_item_id)),
  ]);
  const visiblePl = new Set(visiblePlayers.map((p) => p.id));
  const visibleAr = new Set(visibleArchive.map((a) => a.id));

  const wanted = new Set(players.map((p) => `${p.player_id}|${p.ruolo}`));
  const have = new Set(curPl.data.map((r) => `${r.player_id}|${r.ruolo}`));
  const removePl = curPl.data.filter((r) => visiblePl.has(r.player_id) && !wanted.has(`${r.player_id}|${r.ruolo}`)).map((r) => r.id);
  const addPl = players.filter((p) => !have.has(`${p.player_id}|${p.ruolo}`));

  const haveAr = new Set(curAr.data.map((r) => r.archive_item_id));
  const wantedAr = new Set(archiveIds);
  const removeAr = curAr.data.map((r) => r.archive_item_id).filter((id) => visibleAr.has(id) && !wantedAr.has(id));
  const addAr = archiveIds.filter((id) => !haveAr.has(id));

  const ops = await Promise.all([
    removePl.length ? supabase.from("set_piece_players").delete().in("id", removePl) : null,
    addPl.length ? supabase.from("set_piece_players").insert(addPl.map((p) => ({ set_piece_id: setPieceId, ...p }))) : null,
    removeAr.length
      ? supabase.from("archive_item_set_pieces").delete().eq("set_piece_id", setPieceId).in("archive_item_id", removeAr)
      : null,
    addAr.length
      ? supabase.from("archive_item_set_pieces").insert(addAr.map((id) => ({ set_piece_id: setPieceId, archive_item_id: id })))
      : null,
  ]);
  const failed = ops.find((r) => r?.error);
  if (failed?.error) throw new Error(failed.error.code === "42501" ? PERMISSION_MESSAGE : failed.error.message);

  revalidatePath(`/set-pieces/${setPieceId}`);
  return { ok: true };
}
