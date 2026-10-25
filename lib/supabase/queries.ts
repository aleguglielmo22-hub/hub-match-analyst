import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { ACCESS_DENIED_MESSAGE, isEmailAllowed } from "@/lib/auth/allowlist";

/**
 * Workspace dell'utente loggato (assumiamo un solo workspace attivo per utente).
 * Cached per-richiesta con React `cache`.
 * Ritorna null se non c'è utente o membership; lancia un errore se il DB non risponde.
 * Punto di passaggio di tutte le azioni server e dei caricamenti: un account
 * non autorizzato viene rifiutato qui anche se chiama le azioni direttamente.
 */
export const getCurrentWorkspace = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;
  if (!isEmailAllowed(user.email)) {
    console.warn(`[Accesso] Operazione rifiutata, account non autorizzato: ${user.id}`);
    throw new Error(ACCESS_DENIED_MESSAGE);
  }

  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, workspaces(id, nome, owner_id)")
    .eq("user_id", user.id)
    .eq("status", "ACTIVE")
    .limit(1)
    .maybeSingle();

  if (error) {
    // Errore del server: non va confuso con "nessuno spazio di lavoro".
    console.error("[Workspace] Errore di caricamento:", error);
    throw new Error("Impossibile leggere lo spazio di lavoro");
  }
  if (!data) return null;

  const workspace = Array.isArray(data.workspaces)
    ? data.workspaces[0]
    : data.workspaces;
  if (!workspace) return null;

  return {
    id: workspace.id,
    nome: workspace.nome,
    ownerId: workspace.owner_id,
    role: data.role,
    isOwner: workspace.owner_id === user.id,
    userId: user.id,
  };
});
