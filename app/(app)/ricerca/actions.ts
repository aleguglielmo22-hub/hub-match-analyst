"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/supabase/queries";
import { logLoadError } from "@/lib/load-result";
import type { SearchRow } from "@/lib/search/global-results";

/**
 * Ricerca globale nel workspace corrente (search_all, migrazione 0015).
 * Gira con i permessi dell'utente: valgono le regole di accesso (RLS).
 */
export async function globalSearch(
  query: string,
): Promise<{ ok: true; rows: SearchRow[] } | { ok: false }> {
  const q = z.string().max(100).parse(query).trim();
  if (q.length < 2) return { ok: true, rows: [] };
  try {
    const workspace = await getCurrentWorkspace();
    if (!workspace) return { ok: true, rows: [] };
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("search_all", {
      p_workspace: workspace.id,
      p_query: q,
    });
    if (error) throw error;
    return { ok: true, rows: (data ?? []) as SearchRow[] };
  } catch (err) {
    logLoadError("Ricerca globale", err);
    return { ok: false };
  }
}
