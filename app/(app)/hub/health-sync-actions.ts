"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { hubClient, logSafeError, requireOwner } from "@/lib/hub/server";

/**
 * Crea una nuova chiave di sincronizzazione (annulla la precedente). La chiave
 * si vede UNA volta sola: nel database resta solo la sua impronta.
 */
export async function createSyncToken(): Promise<{ ok: true; token: string } | { ok: false; message: string }> {
  try {
    const workspace = await requireOwner();
    const supabase = await hubClient();
    const token = randomBytes(32).toString("base64url");
    const hash = createHash("sha256").update(token, "utf8").digest("hex");
    const { error } = await supabase
      .from("health_sync")
      .upsert({ workspace_id: workspace.id, token_hash: hash, created_at: new Date().toISOString(), last_sync_at: null }, { onConflict: "workspace_id" });
    if (error) throw error;
    revalidatePath("/benessere/sincronizza");
    return { ok: true, token };
  } catch (err) {
    logSafeError("Chiave di sincronizzazione", err);
    return { ok: false, message: "Non è stato possibile creare la chiave." };
  }
}

/** Disattiva la sincronizzazione: la chiave smette subito di funzionare. */
export async function revokeSyncToken(): Promise<{ ok: boolean }> {
  try {
    const workspace = await requireOwner();
    const supabase = await hubClient();
    const { error } = await supabase.from("health_sync").delete().eq("workspace_id", workspace.id);
    if (error) throw error;
    revalidatePath("/benessere/sincronizza");
    return { ok: true };
  } catch (err) {
    logSafeError("Chiave di sincronizzazione revocata", err);
    return { ok: false };
  }
}
