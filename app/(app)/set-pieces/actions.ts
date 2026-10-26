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
        updated_at
      `,
    )
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null);

  if (filters?.q) {
    q = q.or(ilikeAnyFilter(["titolo", "squadra_esecutrice", "squadra_avversaria"], filters.q));
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

  const items = data.slice(0, PAGE_SIZE) as unknown as SetPieceListItem[];
  return { items, hasMore: data.length > PAGE_SIZE };
}

/** Colonne del piazzato a partire dai valori validati del form. */
function setPieceColumns(v: SetPieceFormValues) {
  return {
    titolo: v.titolo,
    squadra_esecutrice: v.squadra_esecutrice,
    squadra_avversaria: v.squadra_avversaria,
    competizione: v.competizione,
    stagione: v.stagione,
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
): Promise<{ id: string }> {
  z.string().uuid().parse(id);
  const v = setPieceFormSchema.parse(raw);

  const workspace = await getCurrentWorkspace();
  if (!workspace) throw new Error("Workspace non trovato");

  const supabase = await createClient();

  await insertOnce({
    insert: () =>
      supabase.from("set_pieces").insert({
        id,
        workspace_id: workspace.id,
        created_by: workspace.userId,
        ...setPieceColumns(v),
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
  return { id };
}

type SetPieceForEdit = {
  id: string;
  values: SetPieceFormValues;
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
          squadra_esecutrice: r.squadra_esecutrice,
          squadra_avversaria: r.squadra_avversaria,
          competizione: r.competizione,
          stagione: r.stagione,
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
        },
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
): Promise<{ id: string }> {
  z.string().uuid().parse(id);
  const v = setPieceFormSchema.parse(raw);

  const workspace = await getCurrentWorkspace();
  if (!workspace) throw new Error("Workspace non trovato");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("set_pieces")
    .update(setPieceColumns(v))
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Schema non trovato o non hai i permessi per modificarlo");

  revalidatePath("/set-pieces");
  revalidatePath(`/set-pieces/${id}`);
  revalidatePath("/dashboard");
  return { id: data.id };
}
