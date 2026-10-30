import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { ATTACHMENTS_BUCKET } from "@/lib/attachments/shared";
import { sameBoard, type BoardData, type BoardEntity } from "@/lib/board/model";
import type { Json } from "@/lib/types/database";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export const BOARD_TABLE: Record<BoardEntity, "set_pieces" | "situational_tactics"> = {
  set_piece: "set_pieces",
  situational: "situational_tactics",
};

/**
 * Colonne della lavagna per un aggiornamento. Se i dati cambiano (o la
 * lavagna viene rimossa) l'anteprima esistente non vale più: si azzera e il
 * file vecchio va tolto DOPO l'aggiornamento riuscito (`staleFile`).
 */
export async function boardColumnsForUpdate(
  supabase: Supabase,
  entity: BoardEntity,
  workspaceId: string,
  id: string,
  board: BoardData | null,
): Promise<{
  columns: { lavagna_dati: Json | null; lavagna_anteprima?: null };
  staleFile: string | null;
}> {
  const { data, error } = await supabase
    .from(BOARD_TABLE[entity])
    .select("lavagna_dati, lavagna_anteprima")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const current = data as { lavagna_dati: Json | null; lavagna_anteprima: string | null } | null;
  const dati = board as unknown as Json | null;
  if (current && board && sameBoard(current.lavagna_dati, board)) {
    return { columns: { lavagna_dati: dati }, staleFile: null };
  }
  return {
    columns: { lavagna_dati: dati, lavagna_anteprima: null },
    staleFile: current?.lavagna_anteprima ?? null,
  };
}

/** Anteprima ancora da generare dopo il salvataggio? */
export async function boardNeedsPreview(
  supabase: Supabase,
  entity: BoardEntity,
  workspaceId: string,
  id: string,
): Promise<boolean> {
  const { data } = await supabase
    .from(BOARD_TABLE[entity])
    .select("lavagna_dati, lavagna_anteprima")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  const row = data as { lavagna_dati: Json | null; lavagna_anteprima: string | null } | null;
  return !!row?.lavagna_dati && !row.lavagna_anteprima;
}

/** Rimozione di un'anteprima non più usata (best effort: un errore non blocca il salvataggio). */
export async function removeStaleBoardPreview(supabase: Supabase, path: string | null): Promise<void> {
  if (!path) return;
  const { error } = await supabase.storage.from(ATTACHMENTS_BUCKET).remove([path]);
  if (error) console.warn("[Lavagna] Anteprima vecchia non rimossa:", path, error.message);
}

/** Link temporanei (1 ora) alle anteprime, nello stesso ordine dei percorsi. */
export async function signBoardPreviews(
  supabase: Supabase,
  paths: (string | null)[],
): Promise<(string | null)[]> {
  const wanted = [...new Set(paths.filter((p): p is string => !!p))];
  if (wanted.length === 0) return paths.map(() => null);
  const { data, error } = await supabase.storage.from(ATTACHMENTS_BUCKET).createSignedUrls(wanted, 3600);
  if (error || !data) return paths.map(() => null);
  const byPath = new Map(data.map((d) => [d.path, d.signedUrl]));
  return paths.map((p) => (p ? (byPath.get(p) ?? null) : null));
}
