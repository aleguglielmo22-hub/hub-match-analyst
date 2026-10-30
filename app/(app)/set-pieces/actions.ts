"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/supabase/queries";
import {
  failedListPage,
  isUuid,
  logLoadError,
  type ListPage,
  type LoadResult,
} from "@/lib/load-result";
import { ilikeAnyFilter } from "@/lib/search/ilike-filter";
import { insertOnce } from "@/lib/forms/insert-once";
import {
  setPieceFormSchema,
  type SetPieceFormValues,
} from "@/lib/schemas/set-pieces";
import type { SetPiecesFilters } from "@/lib/schemas/set-pieces-filters";
import type { SetPieceListItem, SetPieceRow } from "@/lib/types/set-pieces";
import { parseBoardData } from "@/lib/board/schema";
import {
  boardColumnsForUpdate,
  boardNeedsPreview,
  removeStaleBoardPreview,
  signBoardPreviews,
} from "@/lib/board/persist";

const PAGE_SIZE = 24;

export type SetPiecesSort = "recent" | "alpha" | "data_evento";

const sortSchema = z.enum(["recent", "alpha", "data_evento"]);
const pageSchema = z.number().int().min(0).max(1000);

export type LoadSetPiecesOpts = {
  sort: SetPiecesSort;
  page: number;
  filters?: SetPiecesFilters;
};

export async function loadSetPiecesPage(
  opts: LoadSetPiecesOpts,
): Promise<ListPage<SetPieceListItem>> {
  try {
    return await querySetPiecesPage(opts);
  } catch (err) {
    logLoadError("Set Pieces", err);
    return failedListPage();
  }
}

async function querySetPiecesPage(
  opts: LoadSetPiecesOpts,
): Promise<{ items: SetPieceListItem[]; hasMore: boolean }> {
  const sort = sortSchema.parse(opts.sort);
  const page = pageSchema.parse(opts.page);
  const filters = opts.filters;

  const workspace = await getCurrentWorkspace();
  if (!workspace) return { items: [], hasMore: false };

  const supabase = await createClient();
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE;

  let q = supabase
    .from("set_pieces")
    .select(
      `
        id, titolo, fase, tipo_piazzato, specificazione_punizione, lato_battuta,
        esito_finale, squadra_esecutrice, squadra_avversaria, competizione,
        stagione, minuto, punteggio, data_evento, video_url, lavagna_image_url,
        lavagna_anteprima, updated_at, team_esecutrice_id, team_avversaria_id,
        team_esecutrice:teams!set_pieces_team_esecutrice_id_fkey(nome),
        team_avversaria:teams!set_pieces_team_avversaria_id_fkey(nome)
      `,
    )
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null);

  if (filters?.q) {
    // Anche per nome attuale delle squadre collegate (es. dopo una rinomina).
    const { data: teamHits, error: teamErr } = await supabase
      .from("teams")
      .select("id")
      .eq("workspace_id", workspace.id)
      .or(ilikeAnyFilter(["nome"], filters.q))
      .limit(50);
    if (teamErr) throw teamErr;
    const ids = (teamHits ?? []).map((t) => t.id);
    const teamConds = ids.length
      ? `,team_esecutrice_id.in.(${ids.join(",")}),team_avversaria_id.in.(${ids.join(",")})`
      : "";
    q = q.or(
      ilikeAnyFilter(["titolo", "squadra_esecutrice", "squadra_avversaria", "competizione"], filters.q) +
        teamConds,
    );
  }
  if (filters?.team_ids.length) {
    const ids = filters.team_ids.join(",");
    q = q.or(`team_esecutrice_id.in.(${ids}),team_avversaria_id.in.(${ids})`);
  }
  if (filters?.competition_ids.length) q = q.in("competition_id", filters.competition_ids);
  if (filters?.season_ids.length) q = q.in("season_id", filters.season_ids);
  if (filters?.player_ids.length) {
    // Giocatore coinvolto (0014): piazzati collegati a quei giocatori.
    const { data: rows, error: plError } = await supabase
      .from("set_piece_players")
      .select("set_piece_id")
      .in("player_id", filters.player_ids);
    if (plError) throw plError;
    const ids = Array.from(new Set((rows ?? []).map((r) => r.set_piece_id)));
    if (ids.length === 0) return { items: [], hasMore: false };
    q = q.in("id", ids);
  }

  if (filters?.fase.length) q = q.in("fase", filters.fase);
  if (filters?.tipo_piazzato.length)
    q = q.in("tipo_piazzato", filters.tipo_piazzato);
  if (filters?.specificazione_punizione.length)
    q = q.in("specificazione_punizione", filters.specificazione_punizione);
  if (filters?.lato_battuta.length)
    q = q.in("lato_battuta", filters.lato_battuta);
  if (filters?.esito_finale.length)
    q = q.in("esito_finale", filters.esito_finale);

  if (sort === "recent") {
    q = q.order("updated_at", { ascending: false }).order("id", { ascending: false });
  } else if (sort === "alpha") {
    q = q.order("titolo", { ascending: true }).order("id", { ascending: true });
  } else {
    q = q
      .order("data_evento", { ascending: false, nullsFirst: false })
      .order("id", { ascending: false });
  }

  q = q.range(from, to);

  const { data, error } = await q;
  if (error || !data) throw error ?? new Error("Risposta vuota");

  const rows = data.slice(0, PAGE_SIZE) as unknown as (SetPieceListItem & { lavagna_anteprima: string | null })[];
  const previews = await signBoardPreviews(supabase, rows.map((r) => r.lavagna_anteprima));
  const items = rows.map(({ lavagna_anteprima: _path, ...r }, i) => {
    void _path;
    return { ...r, lavagna_preview_url: previews[i] };
  });
  return { items, hasMore: data.length > PAGE_SIZE };
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Colonne del piazzato a partire dai valori validati del form. I vecchi campi
 * di testo (squadre, competizione, stagione) restano allineati ai nomi delle
 * anagrafiche scelte, così card, ricerca e backup restano coerenti.
 */
async function setPieceColumns(supabase: Supabase, workspaceId: string, v: SetPieceFormValues) {
  const teamIds = [v.team_esecutrice_id, v.team_avversaria_id].filter((x): x is string => !!x);
  const [teams, comp, season] = await Promise.all([
    teamIds.length
      ? supabase.from("teams").select("id, nome").eq("workspace_id", workspaceId).in("id", teamIds)
      : Promise.resolve({ data: [] as { id: string; nome: string }[], error: null }),
    v.competition_id
      ? supabase.from("competitions").select("nome").eq("workspace_id", workspaceId).eq("id", v.competition_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    v.season_id
      ? supabase.from("seasons").select("label").eq("workspace_id", workspaceId).eq("id", v.season_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  const err = teams.error ?? comp.error ?? season.error;
  if (err) throw new Error(err.message);
  const teamName = (id: string | null) => (id ? (teams.data ?? []).find((t) => t.id === id)?.nome ?? null : null);

  return {
    titolo: v.titolo,
    team_esecutrice_id: v.team_esecutrice_id,
    team_avversaria_id: v.team_avversaria_id,
    competition_id: v.competition_id,
    season_id: v.season_id,
    squadra_esecutrice: teamName(v.team_esecutrice_id),
    squadra_avversaria: teamName(v.team_avversaria_id),
    competizione: comp.data?.nome ?? null,
    stagione: season.data?.label ?? null,
    minuto: v.minuto,
    punteggio: v.punteggio,
    data_evento: v.data_evento,

    fase: v.fase,
    tipo_piazzato: v.tipo_piazzato,
    specificazione_punizione: v.specificazione_punizione,
    lato_battuta: v.lato_battuta,

    // Offensivo
    piede_battitore: v.piede_battitore,
    traiettoria: v.traiettoria,
    sviluppo_schema: v.sviluppo_schema,
    landing_zones: v.landing_zones,
    behavior_tags: v.behavior_tags,
    giocatori_in_area: v.giocatori_in_area,

    // Difensivo
    sistema_marcatura: v.sistema_marcatura,
    uomini_in_barriera: v.uomini_in_barriera,
    uomini_sui_pali: v.uomini_sui_pali,
    altezza_linea_difensiva: v.altezza_linea_difensiva,
    giocatori_in_transizione: v.giocatori_in_transizione,

    esito_finale: v.esito_finale,
    note_esito: v.note_esito,

    video_url: v.video_url,
    lavagna_image_url: v.lavagna_image_url,
    pdf_url: v.pdf_url,
  };
}

/**
 * Crea un piazzato con l'id generato all'apertura del form: un secondo invio
 * con lo stesso id (risposta persa) non crea un doppione.
 */
export async function createSetPiece(
  id: string,
  raw: SetPieceFormValues,
): Promise<{ id: string; needsPreview: boolean }> {
  z.string().uuid().parse(id);
  const v = setPieceFormSchema.parse(raw);

  const workspace = await getCurrentWorkspace();
  if (!workspace) throw new Error("Workspace non trovato");

  const supabase = await createClient();

  const columns = await setPieceColumns(supabase, workspace.id, v);
  await insertOnce({
    insert: () =>
      supabase.from("set_pieces").insert({
        id,
        workspace_id: workspace.id,
        created_by: workspace.userId,
        ...columns,
        lavagna_dati: v.lavagna_dati,
      }),
      exists: async () => {
        const { data } = await supabase
          .from("set_pieces")
          .select("id")
          .eq("id", id)
          .eq("workspace_id", workspace.id)
          .maybeSingle();
        return !!data;
      },
  });

  revalidatePath("/set-pieces");
  revalidatePath("/dashboard");
  return { id, needsPreview: await boardNeedsPreview(supabase, "set_piece", workspace.id, id) };
}

type SetPieceForEdit = {
  id: string;
  values: SetPieceFormValues;
  /** Lavagna salvata ma senza anteprima (caricamento non riuscito): si può rigenerare. */
  boardPreviewMissing: boolean;
  updated_at: string;
  can_edit: boolean;
};

/**
 * Carica un piazzato per la pagina di modifica (valori pronti per il form).
 * `can_edit`: creatore o owner del workspace, coerente con la RLS.
 */
export async function getSetPieceForEdit(
  id: string,
): Promise<LoadResult<SetPieceForEdit>> {
  if (!isUuid(id)) return { ok: false, reason: "not_found" };
  try {
    const workspace = await getCurrentWorkspace();
    if (!workspace) return { ok: false, reason: "not_found" };
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("set_pieces")
      .select("*")
      .eq("id", id)
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    if (!data) return { ok: false, reason: "not_found" };
    const r = data as SetPieceRow;
    return {
      ok: true,
      data: {
        id: r.id,
        values: {
          titolo: r.titolo,
          team_esecutrice_id: r.team_esecutrice_id,
          team_avversaria_id: r.team_avversaria_id,
          competition_id: r.competition_id,
          season_id: r.season_id,
          minuto: r.minuto,
          punteggio: r.punteggio,
          data_evento: r.data_evento,
          fase: r.fase,
          tipo_piazzato: r.tipo_piazzato,
          specificazione_punizione: r.specificazione_punizione,
          lato_battuta: r.lato_battuta,
          piede_battitore: r.piede_battitore,
          traiettoria: r.traiettoria,
          sviluppo_schema: r.sviluppo_schema,
          landing_zones: r.landing_zones ?? [],
          behavior_tags: r.behavior_tags ?? [],
          giocatori_in_area: r.giocatori_in_area,
          sistema_marcatura: r.sistema_marcatura,
          uomini_in_barriera: r.uomini_in_barriera,
          uomini_sui_pali: r.uomini_sui_pali,
          altezza_linea_difensiva: r.altezza_linea_difensiva,
          giocatori_in_transizione: r.giocatori_in_transizione,
          esito_finale: r.esito_finale,
          note_esito: r.note_esito,
          video_url: r.video_url,
          lavagna_image_url: r.lavagna_image_url,
          pdf_url: r.pdf_url,
          lavagna_dati: parseBoardData(r.lavagna_dati),
        },
        boardPreviewMissing: !!r.lavagna_dati && !r.lavagna_anteprima,
        updated_at: r.updated_at,
        can_edit: workspace.isOwner || r.created_by === workspace.userId,
      },
    };
  } catch (err) {
    logLoadError("Set Pieces · modifica", err);
    return { ok: false, reason: "error" };
  }
}

/** Aggiorna un piazzato (RLS: solo creatore o owner). */
export async function updateSetPiece(
  id: string,
  raw: SetPieceFormValues,
): Promise<{ id: string; needsPreview: boolean }> {
  z.string().uuid().parse(id);
  const v = setPieceFormSchema.parse(raw);

  const workspace = await getCurrentWorkspace();
  if (!workspace) throw new Error("Workspace non trovato");

  const supabase = await createClient();
  const board = await boardColumnsForUpdate(supabase, "set_piece", workspace.id, id, v.lavagna_dati);
  const { data, error } = await supabase
    .from("set_pieces")
    .update({ ...(await setPieceColumns(supabase, workspace.id, v)), ...board.columns })
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Schema non trovato o non hai i permessi per modificarlo");
  // Anteprima della lavagna precedente: tolta solo dopo l'aggiornamento riuscito.
  await removeStaleBoardPreview(supabase, board.staleFile);

  revalidatePath("/set-pieces");
  revalidatePath(`/set-pieces/${id}`);
  revalidatePath("/dashboard");
  return { id: data.id, needsPreview: await boardNeedsPreview(supabase, "set_piece", workspace.id, id) };
}
