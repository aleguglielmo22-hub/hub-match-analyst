"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/supabase/queries";
import { ilikeAnyFilter } from "@/lib/search/ilike-filter";
import { logLoadError } from "@/lib/load-result";
import { ATTACHMENTS_BUCKET } from "@/lib/attachments/shared";
import {
  TRASH_SECTION,
  TRASH_SECTIONS,
  type TrashSection,
} from "@/lib/trash/sections";
import { FASE_LABEL, TIPO_PIAZZATO_LABEL } from "@/lib/types/set-pieces";
import { MACRO_FASE_LABEL } from "@/lib/types/situational";
import { CATEGORIA_LAVORO_LABEL } from "@/lib/types/archivio";

const sectionSchema = z.enum(TRASH_SECTIONS);
const idSchema = z.string().uuid();

type Supabase = Awaited<ReturnType<typeof createClient>>;

function revalidateSection(section: TrashSection, id: string) {
  const cfg = TRASH_SECTION[section];
  revalidatePath(cfg.listHref);
  revalidatePath(cfg.detailHref(id));
  revalidatePath("/cestino");
  revalidatePath("/dashboard");
}

async function requireWorkspace() {
  const workspace = await getCurrentWorkspace();
  if (!workspace) throw new Error("Workspace non trovato");
  return workspace;
}

/**
 * Imposta (o azzera) deleted_at. La RLS consente l'update solo a owner o
 * creatore: se non torna nessuna riga, l'utente non ne ha i permessi.
 */
async function setDeletedAt(
  section: TrashSection,
  id: string,
  deletedAt: string | null,
): Promise<void> {
  sectionSchema.parse(section);
  idSchema.parse(id);
  const workspace = await requireWorkspace();
  const supabase = await createClient();

  let q = supabase
    .from(TRASH_SECTION[section].table)
    .update({ deleted_at: deletedAt })
    .eq("id", id)
    .eq("workspace_id", workspace.id);
  q = deletedAt ? q.is("deleted_at", null) : q.not("deleted_at", "is", null);
  const { data, error } = await q.select("id");

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error(
      "Elemento non trovato o non hai i permessi (solo chi l'ha creato o il proprietario del workspace).",
    );
  }
  revalidateSection(section, id);
}

/** Sposta nel cestino (soft delete). */
export async function moveToTrash(
  section: TrashSection,
  id: string,
): Promise<{ ok: true }> {
  await setDeletedAt(section, id, new Date().toISOString());
  return { ok: true };
}

/** Ripristina dal cestino. */
export async function restoreFromTrash(
  section: TrashSection,
  id: string,
): Promise<{ ok: true }> {
  await setDeletedAt(section, id, null);
  return { ok: true };
}

/**
 * Cancella i file dallo storage e verifica che non ne resti nessuno.
 * Se qualcosa non va lancia un errore: la voce NON va eliminata
 * (meglio un elemento in più nel cestino che file orfani).
 */
async function removeStorageFiles(
  supabase: Supabase,
  bucket: string,
  paths: string[],
): Promise<void> {
  if (paths.length === 0) return;
  const failMessage =
    "Non è stato possibile cancellare i file allegati: l'elemento resta nel cestino. Riprova tra poco.";

  const { data, error } = await supabase.storage.from(bucket).remove(paths);
  if (error) {
    logLoadError("Cestino · cancellazione file", error);
    throw new Error(failMessage);
  }
  // remove() non segnala i file che non ha potuto cancellare: controllo quelli
  // non confermati (se non esistono già più, va bene).
  const removed = new Set((data ?? []).map((o) => o.name));
  for (const path of paths.filter((p) => !removed.has(p))) {
    const { data: stillThere, error: existsError } = await supabase.storage
      .from(bucket)
      .exists(path);
    if (existsError || stillThere) {
      logLoadError("Cestino · file non cancellato", existsError ?? path);
      throw new Error(failMessage);
    }
  }
}

/**
 * Elimina definitivamente un elemento già nel cestino (solo owner):
 * 1) file nello storage, 2) righe degli allegati, 3) la voce.
 * Per il Cloud, file e link spariscono in cascata con la voce.
 */
export async function deleteForever(
  section: TrashSection,
  id: string,
): Promise<{ ok: true }> {
  sectionSchema.parse(section);
  idSchema.parse(id);
  const workspace = await requireWorkspace();
  if (!workspace.isOwner) {
    throw new Error("Solo il proprietario del workspace può eliminare definitivamente.");
  }
  const supabase = await createClient();
  const cfg = TRASH_SECTION[section];

  // L'elemento deve esistere ed essere nel cestino.
  const { data: item, error: itemError } = await supabase
    .from(cfg.table)
    .select("id")
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .not("deleted_at", "is", null)
    .maybeSingle();
  if (itemError) throw new Error(itemError.message);
  if (!item) throw new Error("Elemento non trovato nel cestino.");

  if (section === "cloud") {
    const { data: files, error } = await supabase
      .from("archive_files")
      .select("file_path")
      .eq("archive_item_id", id);
    if (error) throw new Error(error.message);
    await removeStorageFiles(supabase, "archivio", (files ?? []).map((f) => f.file_path));
  } else if (cfg.attachmentEntity) {
    const { data: files, error } = await supabase
      .from("attachments")
      .select("id, file_path")
      .eq("workspace_id", workspace.id)
      .eq("entity_type", cfg.attachmentEntity)
      .eq("entity_id", id);
    if (error) throw new Error(error.message);
    await removeStorageFiles(
      supabase,
      ATTACHMENTS_BUCKET,
      (files ?? []).map((f) => f.file_path),
    );
    if (files && files.length > 0) {
      const { error: rowsError } = await supabase
        .from("attachments")
        .delete()
        .in("id", files.map((f) => f.id));
      if (rowsError) throw new Error(rowsError.message);
    }
  }

  const { error: deleteError } = await supabase
    .from(cfg.table)
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspace.id);
  if (deleteError) throw new Error(deleteError.message);

  revalidatePath("/cestino");
  return { ok: true };
}

/* ============================================================
 * Elenco del cestino (tutte le sezioni)
 * ============================================================ */

export type TrashItem = {
  section: TrashSection;
  id: string;
  title: string;
  subtitle: string | null;
  deleted_at: string;
  /** Ripristino consentito: owner o creatore. */
  can_restore: boolean;
};

export type TrashListResult = {
  items: TrashItem[];
  /** Sezioni che non è stato possibile caricare. */
  failed: TrashSection[];
  /** True se almeno una sezione ha più elementi di quelli mostrati. */
  truncated: boolean;
};

const TRASH_LIMIT = 200;

export async function loadTrash(opts: {
  section: TrashSection | null;
  query?: string;
}): Promise<TrashListResult> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return { items: [], failed: [], truncated: false };
  const supabase = await createClient();
  const q = opts.query?.trim() || undefined;
  const canRestore = (createdBy: string) =>
    workspace.isOwner || createdBy === workspace.userId;

  const loaders: Record<TrashSection, () => Promise<TrashItem[]>> = {
    scouting: async () => {
      let r = supabase
        .from("players")
        .select("id, nome, cognome, ruolo_principale, squadra_attuale, created_by, deleted_at")
        .eq("workspace_id", workspace.id)
        .not("deleted_at", "is", null);
      if (q) r = r.or(ilikeAnyFilter(["nome", "cognome", "squadra_attuale"], q));
      const { data, error } = await r
        .order("deleted_at", { ascending: false })
        .limit(TRASH_LIMIT + 1);
      if (error) throw error;
      return (data ?? []).map((p) => ({
        section: "scouting" as const,
        id: p.id,
        title: [p.nome, p.cognome].filter(Boolean).join(" ") || "Giocatore senza nome",
        subtitle: [p.ruolo_principale, p.squadra_attuale].filter(Boolean).join(" · ") || null,
        deleted_at: p.deleted_at!,
        can_restore: canRestore(p.created_by),
      }));
    },
    "set-pieces": async () => {
      let r = supabase
        .from("set_pieces")
        .select("id, titolo, fase, tipo_piazzato, created_by, deleted_at")
        .eq("workspace_id", workspace.id)
        .not("deleted_at", "is", null);
      if (q) r = r.or(ilikeAnyFilter(["titolo", "squadra_esecutrice", "squadra_avversaria"], q));
      const { data, error } = await r
        .order("deleted_at", { ascending: false })
        .limit(TRASH_LIMIT + 1);
      if (error) throw error;
      return (data ?? []).map((s) => ({
        section: "set-pieces" as const,
        id: s.id,
        title: s.titolo,
        subtitle: `${FASE_LABEL[s.fase]} · ${TIPO_PIAZZATO_LABEL[s.tipo_piazzato]}`,
        deleted_at: s.deleted_at!,
        can_restore: canRestore(s.created_by),
      }));
    },
    training: async () => {
      let r = supabase
        .from("situational_tactics")
        .select("id, titolo, macro_fase, created_by, deleted_at")
        .eq("workspace_id", workspace.id)
        .not("deleted_at", "is", null);
      if (q) r = r.or(ilikeAnyFilter(["titolo"], q));
      const { data, error } = await r
        .order("deleted_at", { ascending: false })
        .limit(TRASH_LIMIT + 1);
      if (error) throw error;
      return (data ?? []).map((s) => ({
        section: "training" as const,
        id: s.id,
        title: s.titolo,
        subtitle: MACRO_FASE_LABEL[s.macro_fase],
        deleted_at: s.deleted_at!,
        can_restore: canRestore(s.created_by),
      }));
    },
    cloud: async () => {
      let r = supabase
        .from("archive_items")
        .select("id, titolo_archivio, categoria_lavoro, created_by, deleted_at")
        .eq("workspace_id", workspace.id)
        .not("deleted_at", "is", null);
      if (q) r = r.or(ilikeAnyFilter(["titolo_archivio"], q));
      const { data, error } = await r
        .order("deleted_at", { ascending: false })
        .limit(TRASH_LIMIT + 1);
      if (error) throw error;
      return (data ?? []).map((a) => ({
        section: "cloud" as const,
        id: a.id,
        title: a.titolo_archivio,
        subtitle: CATEGORIA_LAVORO_LABEL[a.categoria_lavoro],
        deleted_at: a.deleted_at!,
        can_restore: canRestore(a.created_by),
      }));
    },
  };

  const sections = opts.section ? [opts.section] : [...TRASH_SECTIONS];
  const results = await Promise.all(
    sections.map(async (s) => {
      try {
        return { section: s, items: await loaders[s]() };
      } catch (err) {
        logLoadError(`Cestino · ${TRASH_SECTION[s].label}`, err);
        return { section: s, items: null };
      }
    }),
  );

  let truncated = false;
  const items: TrashItem[] = [];
  const failed: TrashSection[] = [];
  for (const r of results) {
    if (!r.items) {
      failed.push(r.section);
      continue;
    }
    if (r.items.length > TRASH_LIMIT) truncated = true;
    items.push(...r.items.slice(0, TRASH_LIMIT));
  }
  items.sort((a, b) => (a.deleted_at < b.deleted_at ? 1 : a.deleted_at > b.deleted_at ? -1 : 0));
  return { items, failed, truncated };
}
