"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/supabase/queries";
import { logLoadError } from "@/lib/load-result";
import { findByName } from "@/lib/lookups/names";

export type LookupKind = "team" | "competition" | "season";

export type LookupUsage = {
  id: string;
  label: string;
  /** Riferimenti per sezione (elementi nel cestino compresi). */
  cloud: number;
  set_pieces: number;
  osservazioni: number;
};

export type LookupsWithUsage = Record<LookupKind, LookupUsage[]>;

const kindSchema = z.enum(["team", "competition", "season"]);
const TABLE = { team: "teams", competition: "competitions", season: "seasons" } as const;
const COLUMN = { team: "nome", competition: "nome", season: "label" } as const;

async function requireOwner() {
  const workspace = await getCurrentWorkspace();
  if (!workspace) throw new Error("Workspace non trovato");
  if (!workspace.isOwner) throw new Error("Solo il proprietario del workspace può gestire le anagrafiche");
  return workspace;
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Tutte le righe di una tabella (a blocchi di 1000, limite di PostgREST). */
async function fetchAll<T>(
  load: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await load(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) return out;
  }
}

async function loadReferences(supabase: Supabase, ws: string) {
  const [cloud, sp, obs] = await Promise.all([
    fetchAll((a, b) =>
      supabase
        .from("archive_items")
        .select("team_principale_id, team_avversario_id, competition_id, season_id")
        .eq("workspace_id", ws)
        .order("id")
        .range(a, b),
    ),
    fetchAll((a, b) =>
      supabase
        .from("set_pieces")
        .select("team_esecutrice_id, team_avversaria_id, competition_id, season_id")
        .eq("workspace_id", ws)
        .order("id")
        .range(a, b),
    ),
    fetchAll((a, b) =>
      supabase
        .from("player_observations")
        .select("team_casa_id, team_ospite_id, competition_id")
        .eq("workspace_id", ws)
        .order("id")
        .range(a, b),
    ),
  ]);
  return { cloud, sp, obs };
}

/** Squadre, competizioni e stagioni con il numero di utilizzi per sezione. */
export async function listLookupsWithUsage(): Promise<LookupsWithUsage | null> {
  try {
    const workspace = await requireOwner();
    const supabase = await createClient();
    const ws = workspace.id;
    const [teams, comps, seasons, refs] = await Promise.all([
      supabase.from("teams").select("id, nome").eq("workspace_id", ws).order("nome"),
      supabase.from("competitions").select("id, nome").eq("workspace_id", ws).order("nome"),
      supabase.from("seasons").select("id, label").eq("workspace_id", ws).order("label", { ascending: false }),
      loadReferences(supabase, ws),
    ]);
    const err = teams.error ?? comps.error ?? seasons.error;
    if (err) throw err;

    const counter = () => new Map<string, { cloud: number; set_pieces: number; osservazioni: number }>();
    const counts = { team: counter(), competition: counter(), season: counter() };
    const add = (kind: LookupKind, id: string | null, section: "cloud" | "set_pieces" | "osservazioni") => {
      if (!id) return;
      const m = counts[kind];
      const c = m.get(id) ?? { cloud: 0, set_pieces: 0, osservazioni: 0 };
      c[section]++;
      m.set(id, c);
    };
    for (const r of refs.cloud) {
      add("team", r.team_principale_id, "cloud");
      add("team", r.team_avversario_id, "cloud");
      add("competition", r.competition_id, "cloud");
      add("season", r.season_id, "cloud");
    }
    for (const r of refs.sp) {
      add("team", r.team_esecutrice_id, "set_pieces");
      add("team", r.team_avversaria_id, "set_pieces");
      add("competition", r.competition_id, "set_pieces");
      add("season", r.season_id, "set_pieces");
    }
    for (const r of refs.obs) {
      add("team", r.team_casa_id, "osservazioni");
      add("team", r.team_ospite_id, "osservazioni");
      add("competition", r.competition_id, "osservazioni");
    }
    const withUsage = (kind: LookupKind, list: { id: string; label: string }[]): LookupUsage[] =>
      list.map((o) => ({ ...o, ...(counts[kind].get(o.id) ?? { cloud: 0, set_pieces: 0, osservazioni: 0 }) }));

    return {
      team: withUsage("team", (teams.data ?? []).map((t) => ({ id: t.id, label: t.nome }))),
      competition: withUsage("competition", (comps.data ?? []).map((c) => ({ id: c.id, label: c.nome }))),
      season: withUsage("season", (seasons.data ?? []).map((s) => ({ id: s.id, label: s.label }))),
    };
  } catch (err) {
    logLoadError("Impostazioni · anagrafiche", err);
    return null;
  }
}

function revalidateAll() {
  for (const p of ["/impostazioni/anagrafiche", "/archivio", "/set-pieces", "/scouting", "/dashboard"]) {
    revalidatePath(p);
  }
}

/** Rinomina (solo owner). Se il nome esiste già propone di unire. */
export async function renameLookup(kind: LookupKind, id: string, rawName: string): Promise<{ ok: true }> {
  kindSchema.parse(kind);
  z.string().uuid().parse(id);
  const name = z.string().trim().min(1, "Nome obbligatorio").max(100).parse(rawName);
  const workspace = await requireOwner();
  const supabase = await createClient();
  const table = TABLE[kind];
  const column = COLUMN[kind];

  const { data: rows, error: listError } = await supabase
    .from(table)
    .select(`id, ${column}`)
    .eq("workspace_id", workspace.id);
  if (listError) throw new Error(listError.message);
  const list = ((rows ?? []) as unknown as Record<string, string>[]).map((r) => ({ id: r.id, label: r[column] }));
  const clash = findByName(list, name);
  if (clash && clash.id !== id) {
    throw new Error(`Esiste già «${clash.label}»: usa "Unisci" per accorparle.`);
  }

  const { error } = await supabase
    .from(table)
    .update({ [column]: name } as never)
    .eq("id", id)
    .eq("workspace_id", workspace.id);
  if (error) {
    if (error.code === "23505") throw new Error("Esiste già un'anagrafica con questo nome: usa \"Unisci\".");
    throw new Error(error.message);
  }
  revalidateAll();
  return { ok: true };
}

/**
 * Unisce `sourceId` dentro `targetId` (stesso tipo): tutti i riferimenti
 * passano all'anagrafica che resta, poi il doppione viene eliminato.
 * Tutto nel DB in un'unica transazione (merge_lookup, migrazione 0013).
 */
export async function mergeLookups(
  kind: LookupKind,
  sourceId: string,
  targetId: string,
): Promise<{ cloud: number; set_pieces: number; osservazioni: number; preferenze: number }> {
  kindSchema.parse(kind);
  z.string().uuid().parse(sourceId);
  z.string().uuid().parse(targetId);
  await requireOwner();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("merge_lookup", {
    p_kind: kind,
    p_source: sourceId,
    p_target: targetId,
  });
  if (error) throw new Error(error.message);
  revalidateAll();
  return data as { cloud: number; set_pieces: number; osservazioni: number; preferenze: number };
}
