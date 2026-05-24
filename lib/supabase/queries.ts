import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Workspace dell'utente loggato (assumiamo un solo workspace attivo per utente).
 * Cached per-richiesta con React `cache`.
 */
export const getCurrentWorkspace = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, workspaces(id, nome, owner_id)")
    .eq("user_id", user.id)
    .eq("status", "ACTIVE")
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

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
