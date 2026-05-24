"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/supabase/queries";
import {
  situationalFormSchema,
  type SituationalFormValues,
} from "@/lib/schemas/situational";
import type { SituationalFilters } from "@/lib/schemas/situational-filters";
import type { SituationalListItem } from "@/lib/types/situational";

const PAGE_SIZE = 24;

export type SituationalSort = "recent" | "alpha" | "macro";

const sortSchema = z.enum(["recent", "alpha", "macro"]);
const pageSchema = z.number().int().min(0).max(1000);

export type LoadSituationalOpts = {
  sort: SituationalSort;
  page: number;
  filters?: SituationalFilters;
};

export async function loadSituationalPage(
  opts: LoadSituationalOpts,
): Promise<{ items: SituationalListItem[]; hasMore: boolean }> {
  const sort = sortSchema.parse(opts.sort);
  const page = pageSchema.parse(opts.page);
  const filters = opts.filters;

  const workspace = await getCurrentWorkspace();
  if (!workspace) return { items: [], hasMore: false };

  const supabase = await createClient();
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE;

  let q = supabase
    .from("situational_tactics")
    .select(
      `
        id, titolo, macro_fase, sotto_fase, autori, numero_giocatori,
        focus_tags, video_url, lavagna_url, pdf_url, updated_at
      `,
    )
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null);

  if (filters?.q) {
    const term = `%${filters.q.replace(/[%_]/g, "\\$&")}%`;
    q = q.or(
      `titolo.ilike.${term},descrizione_flusso.ilike.${term},regole_provocazione.ilike.${term}`,
    );
  }

  if (filters?.macro_fase.length) q = q.in("macro_fase", filters.macro_fase);
  if (filters?.sotto_fase.length) q = q.in("sotto_fase", filters.sotto_fase);
  if (filters?.focus_tags.length)
    q = q.overlaps("focus_tags", filters.focus_tags);

  if (sort === "recent") {
    q = q.order("updated_at", { ascending: false }).order("id", { ascending: false });
  } else if (sort === "alpha") {
    q = q.order("titolo", { ascending: true }).order("id", { ascending: true });
  } else {
    // "macro" → raggruppa per macro_fase poi sotto_fase poi titolo
    q = q
      .order("macro_fase", { ascending: true })
      .order("sotto_fase", { ascending: true })
      .order("titolo", { ascending: true });
  }

  q = q.range(from, to);

  const { data, error } = await q;
  if (error || !data) return { items: [], hasMore: false };

  const items = data.slice(0, PAGE_SIZE) as unknown as SituationalListItem[];
  return { items, hasMore: data.length > PAGE_SIZE };
}

export async function createSituational(
  raw: SituationalFormValues,
): Promise<{ id: string }> {
  const v = situationalFormSchema.parse(raw);

  const workspace = await getCurrentWorkspace();
  if (!workspace) throw new Error("Workspace non trovato");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("situational_tactics")
    .insert({
      workspace_id: workspace.id,
      created_by: workspace.userId,

      titolo: v.titolo,
      autori: v.autori,
      numero_giocatori: v.numero_giocatori,
      spazio_dimensioni: v.spazio_dimensioni,

      macro_fase: v.macro_fase,
      sotto_fase: v.sotto_fase,

      focus_tags: v.focus_tags,

      descrizione_flusso: v.descrizione_flusso,
      regole_provocazione: v.regole_provocazione,
      varianti: v.varianti,

      video_url: v.video_url,
      lavagna_url: v.lavagna_url,
      pdf_url: v.pdf_url,
    })
    .select("id")
    .single();

  if (error || !data)
    throw new Error(error?.message ?? "Errore creazione situazionale");

  revalidatePath("/situational");
  return { id: data.id };
}

/** Lista dei tag focus distinti del workspace, per autocomplete nei filtri. */
export async function listFocusTags(): Promise<string[]> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("situational_tactics")
    .select("focus_tags")
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null);

  if (!data) return [];
  const set = new Set<string>();
  for (const row of data) {
    for (const tag of row.focus_tags ?? []) set.add(tag);
  }
  return Array.from(set).sort();
}
