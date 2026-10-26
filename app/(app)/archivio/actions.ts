"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/supabase/queries";
import { insertOnce } from "@/lib/forms/insert-once";
import {
  failedListPage,
  isUuid,
  logLoadError,
  type ListPage,
  type LoadResult,
} from "@/lib/load-result";
import {
  archiveFileMetaSchema,
  archiveLinkSchema,
  createArchiveItemSchema,
  TIPO_MEDIA_VALUES,
  type CreateArchiveItemInput,
} from "@/lib/schemas/archivio";
import type {
  ArchiveDetail,
  ArchiveExistingFile,
  ArchiveListItem,
  ArchiveSort,
  UpdateArchiveItemInput,
} from "./types";
import type { ArchiveFilters } from "@/lib/schemas/filters";

const PAGE_SIZE = 24;

const sortSchema = z.enum(["recent", "oldest", "az"]);
const pageSchema = z.number().int().min(0).max(1000);

export type LoadArchiveOpts = {
  sort: ArchiveSort;
  page: number;
  filters?: ArchiveFilters;
  query?: string;
  /** Se true mostra solo le voci nel cestino (deleted_at IS NOT NULL). */
  inTrash?: boolean;
};

/**
 * Carica una pagina di voci d'archivio (24 per blocco) per il workspace corrente.
 * Applica filtri sidebar e ricerca testuale FTS italiano se forniti.
 */
export async function loadArchivePage(
  opts: LoadArchiveOpts,
): Promise<ListPage<ArchiveListItem>> {
  try {
    return await queryArchivePage(opts);
  } catch (err) {
    logLoadError(opts.inTrash ? "Cestino" : "Cloud", err);
    return failedListPage();
  }
}

async function queryArchivePage(
  opts: LoadArchiveOpts,
): Promise<{ items: ArchiveListItem[]; hasMore: boolean }> {
  const sort = sortSchema.parse(opts.sort);
  const page = pageSchema.parse(opts.page);
  const filters = opts.filters;
  const query = opts.query?.trim() || undefined;
  const inTrash = !!opts.inTrash;

  const workspace = await getCurrentWorkspace();
  if (!workspace) return { items: [], hasMore: false };

  const supabase = await createClient();

  // Pre-query per tag (richiede un join che PostgREST non gestisce bene):
  // raccogliamo gli archive_item_id che hanno almeno un tag fra quelli selezionati.
  let tagFilteredIds: string[] | null = null;
  if (filters?.tag_ids.length) {
    const { data: tagRows, error: tagError } = await supabase
      .from("archive_item_tags")
      .select("archive_item_id")
      .in("tag_id", filters.tag_ids);
    if (tagError) throw tagError;
    tagFilteredIds = Array.from(
      new Set((tagRows ?? []).map((r) => r.archive_item_id)),
    );
    // Nessuna voce ha quei tag: ritorno presto.
    if (tagFilteredIds.length === 0) return { items: [], hasMore: false };
  }

  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE;

  let q = supabase
    .from("archive_items")
    .select(
      `
        id,
        titolo_archivio,
        data_lavoro,
        ambito,
        categoria_lavoro,
        tipo_media,
        team_principale:teams!archive_items_team_principale_id_fkey(nome),
        team_avversario:teams!archive_items_team_avversario_id_fkey(nome),
        competition:competitions(nome)
      `,
    )
    .eq("workspace_id", workspace.id);

  q = inTrash ? q.not("deleted_at", "is", null) : q.is("deleted_at", null);

  if (filters?.dataFrom) q = q.gte("data_lavoro", filters.dataFrom);
  if (filters?.dataTo) q = q.lte("data_lavoro", filters.dataTo);
  if (filters?.season_ids.length) q = q.in("season_id", filters.season_ids);
  if (filters?.team_principale_ids.length)
    q = q.in("team_principale_id", filters.team_principale_ids);
  if (filters?.team_avversario_ids.length)
    q = q.in("team_avversario_id", filters.team_avversario_ids);
  if (filters?.competition_ids.length)
    q = q.in("competition_id", filters.competition_ids);
  if (filters?.ambito.length) q = q.in("ambito", filters.ambito);
  if (filters?.categoria_lavoro.length)
    q = q.in("categoria_lavoro", filters.categoria_lavoro);
  if (filters?.tipo_media.length) q = q.overlaps("tipo_media", filters.tipo_media);
  if (filters?.sorgente_video.length)
    q = q.in("sorgente_video", filters.sorgente_video);
  if (tagFilteredIds) q = q.in("id", tagFilteredIds);

  if (query) {
    q = q.textSearch("search_vector", query, {
      config: "italian",
      type: "plain",
    });
  }

  if (sort === "recent") {
    q = q
      .order("data_lavoro", { ascending: false })
      .order("id", { ascending: false });
  } else if (sort === "oldest") {
    q = q
      .order("data_lavoro", { ascending: true })
      .order("id", { ascending: true });
  } else {
    q = q
      .order("titolo_archivio", { ascending: true })
      .order("id", { ascending: true });
  }

  q = q.range(from, to);

  const { data, error } = await q;
  if (error || !data) throw error ?? new Error("Risposta vuota");

  const items = data.slice(0, PAGE_SIZE) as unknown as ArchiveListItem[];
  return { items, hasMore: data.length > PAGE_SIZE };
}

/* ============================================================
 * LOOKUPS (teams, competitions, seasons, tags)
 * ============================================================ */

export type LookupOption = { id: string; label: string };

export async function getLookupOptions(): Promise<{
  teams: LookupOption[];
  competitions: LookupOption[];
  seasons: LookupOption[];
  tags: LookupOption[];
}> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) {
    return { teams: [], competitions: [], seasons: [], tags: [] };
  }

  const supabase = await createClient();
  const [teamsRes, compsRes, seasonsRes, tagsRes] = await Promise.all([
    supabase
      .from("teams")
      .select("id, nome")
      .eq("workspace_id", workspace.id)
      .order("nome"),
    supabase
      .from("competitions")
      .select("id, nome")
      .eq("workspace_id", workspace.id)
      .order("nome"),
    supabase
      .from("seasons")
      .select("id, label")
      .eq("workspace_id", workspace.id)
      .order("label", { ascending: false }),
    supabase
      .from("tags")
      .select("id, name")
      .eq("workspace_id", workspace.id)
      .order("name"),
  ]);

  const lookupError =
    teamsRes.error ?? compsRes.error ?? seasonsRes.error ?? tagsRes.error;
  if (lookupError) logLoadError("Cloud · elenchi squadre/competizioni/stagioni/tag", lookupError);

  return {
    teams: (teamsRes.data ?? []).map((t) => ({ id: t.id, label: t.nome })),
    competitions: (compsRes.data ?? []).map((c) => ({
      id: c.id,
      label: c.nome,
    })),
    seasons: (seasonsRes.data ?? []).map((s) => ({ id: s.id, label: s.label })),
    tags: (tagsRes.data ?? []).map((t) => ({ id: t.id, label: t.name })),
  };
}

const lookupNameSchema = z.string().trim().min(1).max(100);

export async function createTeam(nome: string): Promise<LookupOption> {
  const parsed = lookupNameSchema.parse(nome);
  const workspace = await getCurrentWorkspace();
  if (!workspace) throw new Error("Workspace non trovato");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .insert({ workspace_id: workspace.id, nome: parsed })
    .select("id, nome")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Errore creazione squadra");
  return { id: data.id, label: data.nome };
}

export async function createCompetition(nome: string): Promise<LookupOption> {
  const parsed = lookupNameSchema.parse(nome);
  const workspace = await getCurrentWorkspace();
  if (!workspace) throw new Error("Workspace non trovato");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("competitions")
    .insert({ workspace_id: workspace.id, nome: parsed })
    .select("id, nome")
    .single();

  if (error || !data)
    throw new Error(error?.message ?? "Errore creazione competizione");
  return { id: data.id, label: data.nome };
}

export async function createSeason(label: string): Promise<LookupOption> {
  const parsed = lookupNameSchema.parse(label);
  const workspace = await getCurrentWorkspace();
  if (!workspace) throw new Error("Workspace non trovato");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("seasons")
    .insert({ workspace_id: workspace.id, label: parsed })
    .select("id, label")
    .single();

  if (error || !data)
    throw new Error(error?.message ?? "Errore creazione stagione");
  return { id: data.id, label: data.label };
}

function slugifyTag(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function createTag(name: string): Promise<LookupOption> {
  const parsed = lookupNameSchema.parse(name);
  const slug = slugifyTag(parsed);
  if (!slug) throw new Error("Tag non valido");

  const workspace = await getCurrentWorkspace();
  if (!workspace) throw new Error("Workspace non trovato");

  const supabase = await createClient();
  // se esiste già con stesso slug, lo restituiamo senza duplicare.
  const { data: existing } = await supabase
    .from("tags")
    .select("id, name")
    .eq("workspace_id", workspace.id)
    .eq("slug", slug)
    .maybeSingle();
  if (existing) return { id: existing.id, label: existing.name };

  const { data, error } = await supabase
    .from("tags")
    .insert({ workspace_id: workspace.id, name: parsed, slug })
    .select("id, name")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Errore creazione tag");
  return { id: data.id, label: data.name };
}

/* ============================================================
 * CREAZIONE VOCE
 * ============================================================ */

/**
 * Crea una voce d'archivio + link + tag. L'id arriva dal form (generato
 * all'apertura): un secondo invio con lo stesso id non crea un doppione.
 * I file si caricano DOPO la creazione e si registrano con addArchiveFiles.
 */
export async function createArchiveItem(
  raw: CreateArchiveItemInput,
): Promise<{ id: string }> {
  const payload = createArchiveItemSchema.parse(raw);

  const workspace = await getCurrentWorkspace();
  if (!workspace) throw new Error("Workspace non trovato");

  const supabase = await createClient();

  const outcome = await insertOnce({
    insert: () =>
      supabase.from("archive_items").insert({
        id: payload.id,
        workspace_id: workspace.id,
        created_by: workspace.userId,
        data_lavoro: payload.data_lavoro,
        season_id: payload.season_id ?? null,
        team_principale_id: payload.team_principale_id ?? null,
        team_avversario_id: payload.team_avversario_id ?? null,
        competition_id: payload.competition_id ?? null,
        ambito: payload.ambito,
        categoria_lavoro: payload.categoria_lavoro,
        tipo_media: payload.tipo_media,
        sorgente_video: payload.sorgente_video ?? null,
        titolo_archivio: payload.titolo_archivio,
        descrizione_estesa: payload.descrizione_estesa ?? null,
      }),
    exists: async () => {
      const { data } = await supabase
        .from("archive_items")
        .select("id")
        .eq("id", payload.id)
        .eq("workspace_id", workspace.id)
        .maybeSingle();
      return !!data;
    },
  });
  // Secondo invio: link e tag sono già stati registrati dal primo.
  if (outcome === "existing") return { id: payload.id };

  if (payload.links.length > 0) {
    const { error: linksError } = await supabase
      .from("archive_item_links")
      .insert(
        payload.links.map((l, i) => ({
          archive_item_id: payload.id,
          url: l.url,
          etichetta: l.etichetta,
          posizione: i,
        })),
      );
    if (linksError) {
      console.error("Errore inserimento archive_item_links:", linksError.message);
    }
  }

  if (payload.tag_ids.length > 0) {
    const { error: tagError } = await supabase
      .from("archive_item_tags")
      .insert(
        payload.tag_ids.map((tag_id) => ({
          archive_item_id: payload.id,
          tag_id,
        })),
      );
    if (tagError) {
      console.error("Errore inserimento archive_item_tags:", tagError.message);
    }
  }

  revalidatePath("/archivio");
  revalidatePath("/dashboard");
  return { id: payload.id };
}

/**
 * Registra i file appena caricati su Storage per una voce esistente
 * (dopo creazione o modifica). Posizioni in coda a quelle già presenti.
 */
export async function addArchiveFiles(
  itemId: string,
  rawFiles: z.input<typeof archiveFileMetaSchema>[],
): Promise<{ ok: true }> {
  z.string().uuid().parse(itemId);
  const files = z.array(archiveFileMetaSchema).parse(rawFiles);
  if (files.length === 0) return { ok: true };

  const workspace = await getCurrentWorkspace();
  if (!workspace) throw new Error("Workspace non trovato");

  const supabase = await createClient();
  const { count, error: countError } = await supabase
    .from("archive_files")
    .select("id", { count: "exact", head: true })
    .eq("archive_item_id", itemId);
  if (countError) throw new Error(countError.message);

  const base = count ?? 0;
  const { error } = await supabase.from("archive_files").insert(
    files.map((f, i) => ({
      archive_item_id: itemId,
      file_name: f.file_name,
      file_path: f.file_path,
      file_size_bytes: f.file_size_bytes ?? null,
      mime_type: f.mime_type ?? null,
      tipo_media: f.tipo_media,
      posizione: base + i,
    })),
  );
  if (error) throw new Error(error.message);

  revalidatePath(`/archivio/${itemId}`);
  return { ok: true };
}

/* ============================================================
 * DETTAGLIO / MODIFICA / CESTINO
 * ============================================================ */

const SIGNED_URL_TTL = 3600; // 1 ora come da specs §4

/**
 * Carica una voce per il dettaglio, con file (incl. signed URL), tag e relazioni.
 * Distingue voce inesistente ("not_found") da errore del server ("error").
 */
export async function getArchiveItem(
  itemId: string,
): Promise<LoadResult<ArchiveDetail>> {
  if (!isUuid(itemId)) return { ok: false, reason: "not_found" };
  try {
    const item = await queryArchiveItem(itemId);
    return item ? { ok: true, data: item } : { ok: false, reason: "not_found" };
  } catch (err) {
    logLoadError("Cloud · dettaglio", err);
    return { ok: false, reason: "error" };
  }
}

async function queryArchiveItem(itemId: string): Promise<ArchiveDetail | null> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return null;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("archive_items")
    .select(
      `
        id,
        workspace_id,
        created_by,
        created_at,
        updated_at,
        deleted_at,
        data_lavoro,
        ambito,
        categoria_lavoro,
        tipo_media,
        sorgente_video,
        titolo_archivio,
        descrizione_estesa,
        season_id,
        team_principale_id,
        team_avversario_id,
        competition_id,
        season:seasons(id, label),
        team_principale:teams!archive_items_team_principale_id_fkey(id, nome),
        team_avversario:teams!archive_items_team_avversario_id_fkey(id, nome),
        competition:competitions(id, nome),
        files:archive_files(id, file_name, file_path, file_size_bytes, mime_type, tipo_media, posizione),
        links:archive_item_links(id, url, etichetta, posizione),
        tag_links:archive_item_tags(tag:tags(id, name))
      `,
    )
    .eq("id", itemId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  // Genera signed URL per ogni file (TTL 1h)
  const filesRaw = (data.files ?? []) as Array<{
    id: string;
    file_name: string;
    file_path: string;
    file_size_bytes: number | null;
    mime_type: string | null;
    tipo_media: (typeof TIPO_MEDIA_VALUES)[number];
    posizione: number;
  }>;
  filesRaw.sort((a, b) => a.posizione - b.posizione);

  const signedUrls = await Promise.all(
    filesRaw.map(async (f) => {
      const { data: signed } = await supabase.storage
        .from("archivio")
        .createSignedUrl(f.file_path, SIGNED_URL_TTL);
      return signed?.signedUrl ?? null;
    }),
  );

  const files: ArchiveExistingFile[] = filesRaw.map((f, i) => ({
    id: f.id,
    file_name: f.file_name,
    file_path: f.file_path,
    file_size_bytes: f.file_size_bytes,
    mime_type: f.mime_type,
    tipo_media: f.tipo_media,
    posizione: f.posizione,
    signed_url: signedUrls[i],
  }));

  const links = [...(data.links ?? [])].sort(
    (a, b) =>
      a.posizione - b.posizione || a.id.localeCompare(b.id),
  );

  const tagLinks = (data.tag_links ?? []) as Array<{
    tag: { id: string; name: string } | { id: string; name: string }[] | null;
  }>;
  const tags: { id: string; name: string }[] = [];
  for (const link of tagLinks) {
    const t = Array.isArray(link.tag) ? link.tag[0] : link.tag;
    if (t) tags.push(t);
  }

  const detail: ArchiveDetail = {
    id: data.id,
    workspace_id: data.workspace_id,
    created_by: data.created_by,
    created_at: data.created_at,
    updated_at: data.updated_at,
    deleted_at: data.deleted_at,
    data_lavoro: data.data_lavoro,
    season_id: data.season_id,
    season: data.season as ArchiveDetail["season"],
    team_principale_id: data.team_principale_id,
    team_principale: data.team_principale as ArchiveDetail["team_principale"],
    team_avversario_id: data.team_avversario_id,
    team_avversario: data.team_avversario as ArchiveDetail["team_avversario"],
    competition_id: data.competition_id,
    competition: data.competition as ArchiveDetail["competition"],
    ambito: data.ambito,
    categoria_lavoro: data.categoria_lavoro,
    tipo_media: data.tipo_media,
    sorgente_video: data.sorgente_video,
    titolo_archivio: data.titolo_archivio,
    descrizione_estesa: data.descrizione_estesa,
    files,
    links,
    tag_ids: tags.map((t) => t.id),
    tags,
    can_edit: workspace.isOwner || data.created_by === workspace.userId,
  };
  return detail;
}

const updateSchema = z.object({
  id: z.string().uuid(),
  data_lavoro: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  season_id: z.string().uuid().nullable(),
  team_principale_id: z.string().uuid().nullable(),
  team_avversario_id: z.string().uuid().nullable(),
  competition_id: z.string().uuid().nullable(),
  ambito: z.enum([
    "PRIMA_SQUADRA",
    "SETTORE_GIOVANILE",
    "CALCIO_FEMMINILE",
  ] as const),
  categoria_lavoro: z.enum([
    "TEAM_STUDIO",
    "MATCH_STUDIO",
    "INDIVIDUAL_ANALYSIS",
    "DATA_ANALYSIS",
    "ALLENAMENTO",
  ] as const),
  tipo_media: z.array(z.enum(TIPO_MEDIA_VALUES)).min(1),
  sorgente_video: z
    .enum(["TELECAMERA_TATTICA", "BROADCASTER_TV", "WYSCOUT", "DRONE"] as const)
    .nullable(),
  titolo_archivio: z.string().min(2).max(200),
  descrizione_estesa: z.string().max(5000).nullable(),
  tag_ids: z.array(z.string().uuid()),
  links: z.array(archiveLinkSchema).max(50),
  remove_file_ids: z.array(z.string().uuid()),
  update_file_tipi: z.array(
    z.object({ id: z.string().uuid(), tipo_media: z.enum(TIPO_MEDIA_VALUES) }),
  ),
});

export async function updateArchiveItem(
  raw: UpdateArchiveItemInput,
): Promise<{ ok: true }> {
  const payload = updateSchema.parse(raw);

  const workspace = await getCurrentWorkspace();
  if (!workspace) throw new Error("Workspace non trovato");

  const supabase = await createClient();

  // 1) Recupera i file da rimuovere per cancellarli anche da Storage.
  if (payload.remove_file_ids.length > 0) {
    const { data: filesToDelete, error: fetchErr } = await supabase
      .from("archive_files")
      .select("id, file_path")
      .in("id", payload.remove_file_ids)
      .eq("archive_item_id", payload.id);
    if (fetchErr) throw new Error(fetchErr.message);

    if (filesToDelete && filesToDelete.length > 0) {
      await supabase.storage
        .from("archivio")
        .remove(filesToDelete.map((f) => f.file_path));
      const { error: delErr } = await supabase
        .from("archive_files")
        .delete()
        .in(
          "id",
          filesToDelete.map((f) => f.id),
        );
      if (delErr) throw new Error(delErr.message);
    }
  }

  // 2) Update tipi media su file esistenti rimasti.
  for (const upd of payload.update_file_tipi) {
    await supabase
      .from("archive_files")
      .update({ tipo_media: upd.tipo_media })
      .eq("id", upd.id)
      .eq("archive_item_id", payload.id);
  }

  // I nuovi file si caricano dopo il salvataggio (addArchiveFiles).

  // 3b) Link: aggiorna quelli rimasti (url, etichetta, ordine), inserisce i
  // nuovi ed elimina quelli tolti dall'elenco.
  const { data: savedLinks, error: linksFetchErr } = await supabase
    .from("archive_item_links")
    .select("id")
    .eq("archive_item_id", payload.id);
  if (linksFetchErr) throw new Error(linksFetchErr.message);
  const savedIds = new Set((savedLinks ?? []).map((l) => l.id));
  const keptIds = new Set(
    payload.links.flatMap((l) => (l.id && savedIds.has(l.id) ? [l.id] : [])),
  );
  const removedLinkIds = [...savedIds].filter((id) => !keptIds.has(id));
  if (removedLinkIds.length > 0) {
    const { error } = await supabase
      .from("archive_item_links")
      .delete()
      .in("id", removedLinkIds);
    if (error) throw new Error(error.message);
  }
  const newLinks: { url: string; etichetta: string | null; posizione: number }[] = [];
  for (const [posizione, l] of payload.links.entries()) {
    if (l.id && keptIds.has(l.id)) {
      const { error } = await supabase
        .from("archive_item_links")
        .update({ url: l.url, etichetta: l.etichetta, posizione })
        .eq("id", l.id)
        .eq("archive_item_id", payload.id);
      if (error) throw new Error(error.message);
    } else {
      newLinks.push({ url: l.url, etichetta: l.etichetta, posizione });
    }
  }
  if (newLinks.length > 0) {
    const { error } = await supabase
      .from("archive_item_links")
      .insert(newLinks.map((l) => ({ ...l, archive_item_id: payload.id })));
    if (error) throw new Error(error.message);
  }

  // 4) Update voce.
  const { error: updateErr } = await supabase
    .from("archive_items")
    .update({
      data_lavoro: payload.data_lavoro,
      season_id: payload.season_id,
      team_principale_id: payload.team_principale_id,
      team_avversario_id: payload.team_avversario_id,
      competition_id: payload.competition_id,
      ambito: payload.ambito,
      categoria_lavoro: payload.categoria_lavoro,
      tipo_media: payload.tipo_media,
      sorgente_video: payload.sorgente_video,
      titolo_archivio: payload.titolo_archivio,
      descrizione_estesa: payload.descrizione_estesa,
    })
    .eq("id", payload.id)
    .eq("workspace_id", workspace.id);
  if (updateErr) throw new Error(updateErr.message);

  // 5) Resync tag: cancella tutti i link e ne reinserisce solo quelli nuovi.
  // (Approccio semplice; il set è piccolo.)
  await supabase
    .from("archive_item_tags")
    .delete()
    .eq("archive_item_id", payload.id);
  if (payload.tag_ids.length > 0) {
    await supabase.from("archive_item_tags").insert(
      payload.tag_ids.map((tag_id) => ({
        archive_item_id: payload.id,
        tag_id,
      })),
    );
  }

  revalidatePath("/archivio");
  revalidatePath(`/archivio/${payload.id}`);
  return { ok: true };
}
