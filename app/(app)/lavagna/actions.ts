"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/supabase/queries";
import { isBoardPreviewPathFor, type BoardEntity } from "@/lib/board/model";
import { removeStaleBoardPreview } from "@/lib/board/persist";

const entitySchema = z.enum(["set_piece", "situational"]);

const DETAIL_PATH: Record<BoardEntity, (id: string) => string> = {
  set_piece: (id) => `/set-pieces/${id}`,
  situational: (id) => `/situational/${id}`,
};

/**
 * Registra l'anteprima PNG appena caricata nel bucket "media" per la lavagna
 * di un piazzato o di un'esercitazione. Il percorso deve stare nella cartella
 * della riga (stessa regola del database, 0017). La data di modifica
 * dell'elemento non cambia (funzione set_board_preview). L'anteprima
 * precedente, se diversa, viene rimossa dopo l'aggiornamento.
 */
export async function setBoardPreview(
  entity: BoardEntity,
  id: string,
  path: string,
): Promise<{ ok: true }> {
  entitySchema.parse(entity);
  z.string().uuid().parse(id);
  const workspace = await getCurrentWorkspace();
  if (!workspace) throw new Error("Workspace non trovato");
  if (!isBoardPreviewPathFor(path, workspace.id, entity, id)) {
    throw new Error("Percorso dell'anteprima non valido");
  }

  const supabase = await createClient();
  const { data: previous, error } = await supabase.rpc("set_board_preview", {
    p_entity: entity,
    p_id: id,
    p_path: path,
  });
  if (error) throw new Error(error.message);

  if (previous && previous !== path) {
    await removeStaleBoardPreview(supabase, previous);
  }
  revalidatePath(DETAIL_PATH[entity](id));
  revalidatePath(entity === "set_piece" ? "/set-pieces" : "/situational");
  return { ok: true };
}
