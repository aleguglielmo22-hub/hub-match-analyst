"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/supabase/queries";
import { isUuid, logLoadError, type LoadResult } from "@/lib/load-result";
import { ilikeAnyFilter } from "@/lib/search/ilike-filter";
import { insertOnce } from "@/lib/forms/insert-once";
import {
  observationFormSchema,
  type ObservationFormInput,
  type ObservationFormValues,
} from "@/lib/schemas/observations";
import { RUOLO_VALUES, type RuoloEnum } from "@/lib/types/scouting";
import type { LookupOption } from "@/app/(app)/archivio/actions";
import { getSharedLookups } from "@/app/(app)/lookups/actions";

async function requireWorkspace() {
  const workspace = await getCurrentWorkspace();
  if (!workspace) throw new Error("Workspace non trovato");
  return workspace;
}

function revalidatePlayer(playerId: string) {
  revalidatePath("/scouting");
  revalidatePath(`/scouting/${playerId}`);
  revalidatePath("/dashboard");
}

/* ============================================================
 * Giocatore: ricerca e creazione rapida
 * ============================================================ */

export type ObservationPlayer = {
  id: string;
  nome: string;
  cognome: string;
  ruolo_principale: RuoloEnum | null;
  squadra_attuale: string | null;
};

const PLAYER_COLUMNS = "id, nome, cognome, ruolo_principale, squadra_attuale";

/** Ricerca per nome, cognome o squadra (giocatori non nel cestino). */
export async function searchObservationPlayers(query: string): Promise<ObservationPlayer[]> {
  const q = z.string().max(100).parse(query).trim();
  const workspace = await getCurrentWorkspace();
  if (!workspace) return [];
  const supabase = await createClient();
  let r = supabase
    .from("players")
    .select(PLAYER_COLUMNS)
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null);
  r = q
    ? r.or(ilikeAnyFilter(["nome", "cognome", "squadra_attuale"], q)).order("cognome")
    : r.order("ultima_osservazione", { ascending: false, nullsFirst: false }).order("updated_at", { ascending: false });
  const { data, error } = await r.limit(12);
  if (error) {
    logLoadError("Osservazioni · ricerca giocatore", error);
    throw new Error("Ricerca non riuscita");
  }
  return (data ?? []) as ObservationPlayer[];
}

export async function getObservationPlayer(id: string): Promise<ObservationPlayer | null> {
  if (!isUuid(id)) return null;
  const workspace = await getCurrentWorkspace();
  if (!workspace) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("players")
    .select(PLAYER_COLUMNS)
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) logLoadError("Osservazioni · giocatore", error);
  return (data as ObservationPlayer | null) ?? null;
}

const quickPlayerSchema = z.object({
  nome: z.string().trim().min(1, "Nome obbligatorio").max(80),
  cognome: z.string().trim().min(1, "Cognome obbligatorio").max(80),
  ruolo_principale: z.enum(RUOLO_VALUES as [RuoloEnum, ...RuoloEnum[]]).nullable(),
});

/**
 * Nuovo giocatore con solo nome, cognome e ruolo (il resto si completa dopo).
 * L'id arriva dal form: un secondo invio non crea un doppione.
 */
export async function createQuickPlayer(
  id: string,
  raw: z.input<typeof quickPlayerSchema>,
): Promise<ObservationPlayer> {
  z.string().uuid().parse(id);
  const v = quickPlayerSchema.parse(raw);
  const workspace = await requireWorkspace();
  const supabase = await createClient();
  await insertOnce({
    insert: () =>
      supabase.from("players").insert({
        id,
        workspace_id: workspace.id,
        created_by: workspace.userId,
        nome: v.nome,
        cognome: v.cognome,
        ruolo_principale: v.ruolo_principale,
      }),
    exists: async () => {
      const { data } = await supabase
        .from("players")
        .select("id")
        .eq("id", id)
        .eq("workspace_id", workspace.id)
        .maybeSingle();
      return !!data;
    },
  });
  revalidatePath("/scouting");
  revalidatePath("/dashboard");
  return { id, nome: v.nome, cognome: v.cognome, ruolo_principale: v.ruolo_principale, squadra_attuale: null };
}

/* ============================================================
 * Elenchi squadre e competizioni (condivisi), recenti in cima
 * ============================================================ */

export async function getObservationLookups(): Promise<{
  teams: LookupOption[];
  competitions: LookupOption[];
}> {
  const { teams, competitions } = await getSharedLookups();
  return { teams, competitions };
}

/* ============================================================
 * Osservazioni: crea, modifica, elimina, elenco
 * ============================================================ */

function observationColumns(v: ObservationFormValues) {
  return {
    data_osservazione: v.data_osservazione,
    team_casa_id: v.team_casa_id,
    team_ospite_id: v.team_ospite_id,
    competition_id: v.competition_id,
    ruolo_giocato: v.ruolo_giocato,
    voto: v.voto,
    nota: v.nota,
  };
}

/**
 * Crea un'osservazione con l'id generato all'apertura del form: un secondo
 * invio con lo stesso id (risposta persa) non crea un doppione.
 */
export async function createObservation(
  id: string,
  playerId: string,
  raw: ObservationFormInput,
): Promise<{ id: string }> {
  z.string().uuid().parse(id);
  z.string().uuid().parse(playerId);
  const v = observationFormSchema.parse(raw);
  const workspace = await requireWorkspace();
  const supabase = await createClient();
  await insertOnce({
    insert: () =>
      supabase.from("player_observations").insert({
        id,
        workspace_id: workspace.id,
        created_by: workspace.userId,
        player_id: playerId,
        ...observationColumns(v),
      }),
    exists: async () => {
      const { data } = await supabase
        .from("player_observations")
        .select("id")
        .eq("id", id)
        .eq("workspace_id", workspace.id)
        .maybeSingle();
      return !!data;
    },
  });
  revalidatePlayer(playerId);
  return { id };
}

/** Modifica (RLS: creatore o owner). */
export async function updateObservation(
  id: string,
  raw: ObservationFormInput,
): Promise<{ id: string; playerId: string }> {
  z.string().uuid().parse(id);
  const v = observationFormSchema.parse(raw);
  const workspace = await requireWorkspace();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("player_observations")
    .update(observationColumns(v))
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .select("id, player_id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Osservazione non trovata o non hai i permessi per modificarla");
  revalidatePlayer(data.player_id);
  return { id, playerId: data.player_id };
}

/** Eliminazione definitiva (RLS: creatore o owner). */
export async function deleteObservation(id: string): Promise<{ ok: true }> {
  z.string().uuid().parse(id);
  const workspace = await requireWorkspace();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("player_observations")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .select("player_id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error("Osservazione non trovata o non hai i permessi per eliminarla");
  }
  revalidatePlayer(data[0].player_id);
  return { ok: true };
}

export type ObservationItem = {
  id: string;
  player_id: string;
  data_osservazione: string;
  created_at: string;
  updated_at: string;
  ruolo_giocato: RuoloEnum | null;
  voto: number | null;
  nota: string | null;
  importata: boolean;
  team_casa: string | null;
  team_ospite: string | null;
  competizione: string | null;
  can_edit: boolean;
};

const OBS_SELECT = `
  id, player_id, created_by, data_osservazione, created_at, updated_at,
  ruolo_giocato, voto, nota, importata, team_casa_id, team_ospite_id, competition_id,
  team_casa:teams!player_observations_team_casa_id_fkey(nome),
  team_ospite:teams!player_observations_team_ospite_id_fkey(nome),
  competition:competitions(nome)
`;

type ObsRow = {
  id: string;
  player_id: string;
  created_by: string;
  data_osservazione: string;
  created_at: string;
  updated_at: string;
  ruolo_giocato: RuoloEnum | null;
  voto: number | null;
  nota: string | null;
  importata: boolean;
  team_casa_id: string | null;
  team_ospite_id: string | null;
  competition_id: string | null;
  team_casa: { nome: string } | null;
  team_ospite: { nome: string } | null;
  competition: { nome: string } | null;
};

/** Storico delle osservazioni di un giocatore. */
export async function listPlayerObservations(
  playerId: string,
): Promise<LoadResult<ObservationItem[]>> {
  if (!isUuid(playerId)) return { ok: false, reason: "not_found" };
  try {
    const workspace = await requireWorkspace();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("player_observations")
      .select(OBS_SELECT)
      .eq("workspace_id", workspace.id)
      .eq("player_id", playerId)
      .order("data_osservazione", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    const rows = (data ?? []) as unknown as ObsRow[];
    return {
      ok: true,
      data: rows.map((r) => ({
        id: r.id,
        player_id: r.player_id,
        data_osservazione: r.data_osservazione,
        created_at: r.created_at,
        updated_at: r.updated_at,
        ruolo_giocato: r.ruolo_giocato,
        voto: r.voto,
        nota: r.nota,
        importata: r.importata,
        team_casa: r.team_casa?.nome ?? null,
        team_ospite: r.team_ospite?.nome ?? null,
        competizione: r.competition?.nome ?? null,
        can_edit: workspace.isOwner || r.created_by === workspace.userId,
      })),
    };
  } catch (err) {
    logLoadError("Scouting · osservazioni", err);
    return { ok: false, reason: "error" };
  }
}

export type ObservationForEdit = {
  id: string;
  player: ObservationPlayer;
  values: ObservationFormInput;
  updated_at: string;
  can_edit: boolean;
};

export async function getObservationForEdit(
  id: string,
): Promise<LoadResult<ObservationForEdit>> {
  if (!isUuid(id)) return { ok: false, reason: "not_found" };
  try {
    const workspace = await requireWorkspace();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("player_observations")
      .select(`${OBS_SELECT}, player:players(${PLAYER_COLUMNS}, deleted_at)`)
      .eq("id", id)
      .eq("workspace_id", workspace.id)
      .maybeSingle();
    if (error) throw error;
    const r = data as unknown as (ObsRow & { player: (ObservationPlayer & { deleted_at: string | null }) | null }) | null;
    if (!r || !r.player || r.player.deleted_at) return { ok: false, reason: "not_found" };
    const { deleted_at: _deleted, ...player } = r.player;
    void _deleted;
    return {
      ok: true,
      data: {
        id: r.id,
        player,
        values: {
          data_osservazione: r.data_osservazione,
          team_casa_id: r.team_casa_id,
          team_ospite_id: r.team_ospite_id,
          competition_id: r.competition_id,
          ruolo_giocato: r.ruolo_giocato,
          voto: r.voto,
          nota: r.nota,
        },
        updated_at: r.updated_at,
        can_edit: workspace.isOwner || r.created_by === workspace.userId,
      },
    };
  } catch (err) {
    logLoadError("Osservazioni · modifica", err);
    return { ok: false, reason: "error" };
  }
}
