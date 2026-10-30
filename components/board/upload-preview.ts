"use client";

import { createClient } from "@/lib/supabase/client";
import { getAttachmentWorkspaceId } from "@/app/(app)/attachments/actions";
import { setBoardPreview } from "@/app/(app)/lavagna/actions";
import { ATTACHMENTS_BUCKET } from "@/lib/attachments/shared";
import { boardPreviewPath, type BoardData, type BoardEntity } from "@/lib/board/model";

/**
 * Genera l'anteprima PNG della lavagna, la carica nel bucket "media" e la
 * registra sulla riga. true = riuscito. In caso di errore il file appena
 * caricato viene tolto e i dati della lavagna restano salvati.
 */
export async function uploadBoardPreview(
  entity: BoardEntity,
  itemId: string,
  board: BoardData,
): Promise<boolean> {
  let path: string | null = null;
  const supabase = createClient();
  try {
    const [{ renderBoardPng }, workspaceId] = await Promise.all([
      import("./render-png"),
      getAttachmentWorkspaceId(),
    ]);
    if (!workspaceId) return false;
    const png = await renderBoardPng(board);
    path = boardPreviewPath(workspaceId, entity, itemId, crypto.randomUUID());
    const { error } = await supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .upload(path, png, { contentType: "image/png", cacheControl: "3600", upsert: false });
    if (error) {
      path = null;
      throw error;
    }
    await setBoardPreview(entity, itemId, path);
    return true;
  } catch (err) {
    console.error("[Lavagna] Anteprima non generata:", err);
    if (path) await supabase.storage.from(ATTACHMENTS_BUCKET).remove([path]);
    return false;
  }
}
