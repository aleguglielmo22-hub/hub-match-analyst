"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/supabase/queries";
import { logLoadError } from "@/lib/load-result";
import type { LookupOption } from "@/app/(app)/archivio/actions";

export type SharedLookups = {
  teams: LookupOption[];
  competitions: LookupOption[];
  seasons: LookupOption[];
};

/**
 * Squadre, competizioni e stagioni del workspace (condivise da Cloud, Set
 * Pieces e Osservazioni), con quelle usate di recente in cima.
 */
export async function getSharedLookups(): Promise<SharedLookups> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return { teams: [], competitions: [], seasons: [] };
  const supabase = await createClient();
  const ws = workspace.id;

  const [teams, comps, seasons, obs, sp, cloud] = await Promise.all([
    supabase.from("teams").select("id, nome").eq("workspace_id", ws).order("nome"),
    supabase.from("competitions").select("id, nome").eq("workspace_id", ws).order("nome"),
    supabase.from("seasons").select("id, label").eq("workspace_id", ws).order("label", { ascending: false }),
    supabase
      .from("player_observations")
      .select("updated_at, team_casa_id, team_ospite_id, competition_id")
      .eq("workspace_id", ws)
      .order("updated_at", { ascending: false })
      .limit(50),
    supabase
      .from("set_pieces")
      .select("updated_at, team_esecutrice_id, team_avversaria_id, competition_id, season_id")
      .eq("workspace_id", ws)
      .order("updated_at", { ascending: false })
      .limit(50),
    supabase
      .from("archive_items")
      .select("updated_at, team_principale_id, team_avversario_id, competition_id, season_id")
      .eq("workspace_id", ws)
      .order("updated_at", { ascending: false })
      .limit(50),
  ]);
  const err = teams.error ?? comps.error ?? seasons.error ?? obs.error ?? sp.error ?? cloud.error;
  if (err) logLoadError("Elenchi squadre/competizioni/stagioni", err);

  // Ultimo utilizzo di ogni anagrafica (la più recente tra le tre sezioni).
  const lastUse = new Map<string, string>();
  const use = (id: string | null, at: string) => {
    if (id && (lastUse.get(id) ?? "") < at) lastUse.set(id, at);
  };
  for (const r of obs.data ?? []) [r.team_casa_id, r.team_ospite_id, r.competition_id].forEach((id) => use(id, r.updated_at));
  for (const r of sp.data ?? [])
    [r.team_esecutrice_id, r.team_avversaria_id, r.competition_id, r.season_id].forEach((id) => use(id, r.updated_at));
  for (const r of cloud.data ?? [])
    [r.team_principale_id, r.team_avversario_id, r.competition_id, r.season_id].forEach((id) => use(id, r.updated_at));

  // Ordinamento stabile: prima le usate (più recente prima), poi il resto.
  const recentFirst = (list: LookupOption[]) =>
    list
      .map((o, i) => ({ o, i, at: lastUse.get(o.id) ?? "" }))
      .sort((a, b) => (a.at === b.at ? a.i - b.i : a.at < b.at ? 1 : -1))
      .map((x) => x.o);

  return {
    teams: recentFirst((teams.data ?? []).map((t) => ({ id: t.id, label: t.nome }))),
    competitions: recentFirst((comps.data ?? []).map((c) => ({ id: c.id, label: c.nome }))),
    seasons: recentFirst((seasons.data ?? []).map((s) => ({ id: s.id, label: s.label }))),
  };
}

/* ============================================================
 * Preferenze di lavoro (tabella user_preferences, per utente e workspace)
 * ============================================================ */

export type WorkPreferences = {
  my_team_id: string | null;
  current_season_id: string | null;
  main_competition_id: string | null;
};

const EMPTY_PREFS: WorkPreferences = {
  my_team_id: null,
  current_season_id: null,
  main_competition_id: null,
};

/** Le mie preferenze; in caso di errore nessun valore predefinito (il form funziona comunque). */
export async function getMyPreferences(): Promise<WorkPreferences> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return EMPTY_PREFS;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_preferences")
    .select("my_team_id, current_season_id, main_competition_id")
    .eq("user_id", workspace.userId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();
  if (error) logLoadError("Preferenze", error);
  return data ?? EMPTY_PREFS;
}

const prefsSchema = z.object({
  my_team_id: z.string().uuid().nullable(),
  current_season_id: z.string().uuid().nullable(),
  main_competition_id: z.string().uuid().nullable(),
});

export async function saveMyPreferences(raw: WorkPreferences): Promise<{ ok: true }> {
  const v = prefsSchema.parse(raw);
  const workspace = await getCurrentWorkspace();
  if (!workspace) throw new Error("Workspace non trovato");
  const supabase = await createClient();
  const { error } = await supabase
    .from("user_preferences")
    .upsert(
      { user_id: workspace.userId, workspace_id: workspace.id, ...v },
      { onConflict: "user_id,workspace_id" },
    );
  if (error) throw new Error(error.message);
  revalidatePath("/impostazioni/preferenze");
  return { ok: true };
}
