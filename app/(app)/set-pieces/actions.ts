"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/supabase/queries";
import {
  setPieceFormSchema,
  type SetPieceFormValues,
} from "@/lib/schemas/set-pieces";
import type { SetPiecesFilters } from "@/lib/schemas/set-pieces-filters";
import type { SetPieceListItem } from "@/lib/types/set-pieces";

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
    const term = `%${filters.q.replace(/[%_]/g, "\\$&")}%`;
    q = q.or(
      `titolo.ilike.${term},squadra_esecutrice.ilike.${term},squadra_avversaria.ilike.${term}`,
    );
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
  if (error || !data) return { items: [], hasMore: false };

  const items = data.slice(0, PAGE_SIZE) as unknown as SetPieceListItem[];
  return { items, hasMore: data.length > PAGE_SIZE };
}

export async function createSetPiece(
  raw: SetPieceFormValues,
): Promise<{ id: string }> {
  const v = setPieceFormSchema.parse(raw);

  const workspace = await getCurrentWorkspace();
  if (!workspace) throw new Error("Workspace non trovato");

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("set_pieces")
    .insert({
      workspace_id: workspace.id,
      created_by: workspace.userId,

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
    })
    .select("id")
    .single();

  if (error || !data)
    throw new Error(error?.message ?? "Errore creazione schema");

  revalidatePath("/set-pieces");
  return { id: data.id };
}
