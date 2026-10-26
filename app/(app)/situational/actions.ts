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
import {
  situationalFormSchema,
  type SituationalFormValues,
} from "@/lib/schemas/situational";
import type { SituationalFilters } from "@/lib/schemas/situational-filters";
import type { SituationalListItem, SituationalRow } from "@/lib/types/situational";

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
): Promise<ListPage<SituationalListItem>> {
  try {
    return await querySituationalPage(opts);
  } catch (err) {
    logLoadError("Training", err);
    return failedListPage();
  }
}

async function querySituationalPage(
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
    q = q.or(ilikeAnyFilter(["titolo", "descrizione_flusso", "regole_provocazione"], filters.q));
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
  if (error || !data) throw error ?? new Error("Risposta vuota");

  const items = data.slice(0, PAGE_SIZE) as unknown as SituationalListItem[];
  return { items, hasMore: data.length > PAGE_SIZE };
}

/** Colonne dell'esercitazione a partire dai valori validati del form. */
function situationalColumns(v: SituationalFormValues) {
  return {
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
  };
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
      ...situationalColumns(v),
    })
    .select("id")
    .single();

  if (error || !data)
    throw new Error(error?.message ?? "Errore creazione situazionale");

  revalidatePath("/situational");
  return { id: data.id };
}

type SituationalForEdit = {
  id: string;
  values: SituationalFormValues;
  can_edit: boolean;
};

/**
 * Carica un'esercitazione per la pagina di modifica (valori pronti per il form).
 * `can_edit`: creatore o owner del workspace, coerente con la RLS.
 */
export async function getSituationalForEdit(
  id: string,
): Promise<LoadResult<SituationalForEdit>> {
  if (!isUuid(id)) return { ok: false, reason: "not_found" };
  try {
    const workspace = await getCurrentWorkspace();
    if (!workspace) return { ok: false, reason: "not_found" };
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("situational_tactics")
      .select("*")
      .eq("id", id)
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    if (!data) return { ok: false, reason: "not_found" };
    const r = data as SituationalRow;
    return {
      ok: true,
      data: {
        id: r.id,
        values: {
          titolo: r.titolo,
          autori: r.autori ?? [],
          numero_giocatori: r.numero_giocatori ?? [],
          spazio_dimensioni: r.spazio_dimensioni,
          macro_fase: r.macro_fase,
          sotto_fase: r.sotto_fase,
          focus_tags: r.focus_tags ?? [],
          descrizione_flusso: r.descrizione_flusso,
          regole_provocazione: r.regole_provocazione,
          varianti: r.varianti,
          video_url: r.video_url,
          lavagna_url: r.lavagna_url,
          pdf_url: r.pdf_url,
        },
        can_edit: workspace.isOwner || r.created_by === workspace.userId,
      },
    };
  } catch (err) {
    logLoadError("Training · modifica", err);
    return { ok: false, reason: "error" };
  }
}

/** Aggiorna un'esercitazione (RLS: solo creatore o owner). */
export async function updateSituational(
  id: string,
  raw: SituationalFormValues,
): Promise<{ id: string }> {
  z.string().uuid().parse(id);
  const v = situationalFormSchema.parse(raw);

  const workspace = await getCurrentWorkspace();
  if (!workspace) throw new Error("Workspace non trovato");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("situational_tactics")
    .update(situationalColumns(v))
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Esercitazione non trovata o non hai i permessi per modificarla");

  revalidatePath("/situational");
  revalidatePath(`/situational/${id}`);
  return { id: data.id };
}

/** Lista dei tag focus distinti del workspace, per autocomplete nei filtri. */
export async function listFocusTags(): Promise<string[]> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("situational_tactics")
    .select("focus_tags")
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null);

  if (error) logLoadError("Training · elenco focus tag", error);
  if (!data) return [];
  const set = new Set<string>();
  for (const row of data) {
    for (const tag of row.focus_tags ?? []) set.add(tag);
  }
  return Array.from(set).sort();
}
