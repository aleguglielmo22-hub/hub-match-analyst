"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/supabase/queries";
import { playerFormSchema, type PlayerFormValues } from "@/lib/schemas/scouting";
import type { ScoutingFilters } from "@/lib/schemas/scouting-filters";
import {
  INFLUENZE_NEG,
  RATING_KEYS,
  type PlayerListItem,
  type PlayerRow,
  type RatingKey,
} from "@/lib/types/scouting";

const PAGE_SIZE = 24;

export type ScoutingSort = "recent" | "alpha" | "scadenza";

const sortSchema = z.enum(["recent", "alpha", "scadenza"]);
const pageSchema = z.number().int().min(0).max(1000);

function ageRangeToDates(ages: { min?: number; max?: number }): {
  from?: string;
  to?: string;
} {
  const today = new Date();
  const toISO = (d: Date) => d.toISOString().slice(0, 10);
  const out: { from?: string; to?: string } = {};
  if (typeof ages.max === "number") {
    const d = new Date(today);
    d.setFullYear(d.getFullYear() - ages.max - 1);
    d.setDate(d.getDate() + 1);
    out.from = toISO(d);
  }
  if (typeof ages.min === "number") {
    const d = new Date(today);
    d.setFullYear(d.getFullYear() - ages.min);
    out.to = toISO(d);
  }
  return out;
}

function fasceEtaToDateRanges(fasce: ScoutingFilters["fascia_eta"]) {
  if (fasce.length === 0) return null;
  const ranges = fasce.map((f) => {
    if (f === "U21") return ageRangeToDates({ max: 20 });
    if (f === "TRA_22_26") return ageRangeToDates({ min: 22, max: 26 });
    return ageRangeToDates({ min: 27 });
  });
  let from = ranges[0].from;
  let to = ranges[0].to;
  for (const r of ranges) {
    if (r.from && (!from || r.from < from)) from = r.from;
    if (r.to && (!to || r.to > to)) to = r.to;
  }
  return { from, to };
}

function scadenzaCutoff(quick: ScoutingFilters["scadenza_quick"]): string | null {
  if (!quick) return null;
  const d = new Date();
  d.setMonth(d.getMonth() + (quick === "ENTRO_6_MESI" ? 6 : 12));
  return d.toISOString().slice(0, 10);
}

export type LoadPlayersOpts = {
  sort: ScoutingSort;
  page: number;
  filters?: ScoutingFilters;
};

export async function loadPlayersPage(
  opts: LoadPlayersOpts,
): Promise<{ items: PlayerListItem[]; hasMore: boolean }> {
  const sort = sortSchema.parse(opts.sort);
  const page = pageSchema.parse(opts.page);
  const filters = opts.filters;

  const workspace = await getCurrentWorkspace();
  if (!workspace) return { items: [], hasMore: false };

  const supabase = await createClient();
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE;

  let q = supabase
    .from("players")
    .select(
      `
        id, created_by, nome, cognome, foto_url, data_nascita, nazionalita, piede,
        ruolo_principale, ruoli_secondari, squadra_attuale, campionato,
        scadenza_contratto, valore_mercato_eur, status_osservazione, voto_potenziale
      `,
    )
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null);

  if (filters?.q) {
    const term = `%${filters.q.replace(/[%_]/g, "\\$&")}%`;
    q = q.or(
      `nome.ilike.${term},cognome.ilike.${term},squadra_attuale.ilike.${term}`,
    );
  }

  if (filters?.fascia_eta.length) {
    const range = fasceEtaToDateRanges(filters.fascia_eta);
    if (range?.from) q = q.gte("data_nascita", range.from);
    if (range?.to) q = q.lte("data_nascita", range.to);
  }

  if (filters?.passaporto.length) q = q.in("passaporto", filters.passaporto);
  if (filters?.piede.length) q = q.in("piede", filters.piede);
  if (filters?.struttura_corporea.length)
    q = q.in("struttura_corporea", filters.struttura_corporea);
  if (filters?.gesti_motori.length)
    q = q.in("gesti_motori", filters.gesti_motori);
  if (filters?.muscolatura.length)
    q = q.in("muscolatura", filters.muscolatura);
  if (filters?.ruolo_principale.length)
    q = q.in("ruolo_principale", filters.ruolo_principale);
  if (filters?.ruoli_secondari.length)
    q = q.overlaps("ruoli_secondari", filters.ruoli_secondari);
  if (filters?.fascia_ingaggio.length)
    q = q.in("fascia_ingaggio", filters.fascia_ingaggio);
  if (filters?.status_osservazione.length)
    q = q.in("status_osservazione", filters.status_osservazione);
  if (filters?.voto_potenziale.length)
    q = q.in("voto_potenziale", filters.voto_potenziale);

  const scad = scadenzaCutoff(filters?.scadenza_quick);
  if (scad) {
    q = q.not("scadenza_contratto", "is", null).lte("scadenza_contratto", scad);
  }

  if (filters?.ratings_min) {
    for (const k of RATING_KEYS) {
      const min = filters.ratings_min[k];
      if (typeof min === "number" && min >= 1 && min <= 10) {
        q = q.gte(k, min);
      }
    }
  }

  if (sort === "recent") {
    q = q
      .order("updated_at", { ascending: false })
      .order("id", { ascending: false });
  } else if (sort === "alpha") {
    q = q
      .order("cognome", { ascending: true })
      .order("nome", { ascending: true })
      .order("id", { ascending: true });
  } else {
    q = q
      .order("scadenza_contratto", { ascending: true, nullsFirst: false })
      .order("id", { ascending: true });
  }

  q = q.range(from, to);

  const { data, error } = await q;
  if (error || !data) return { items: [], hasMore: false };

  const items = data.slice(0, PAGE_SIZE) as unknown as PlayerListItem[];
  return { items, hasMore: data.length > PAGE_SIZE };
}

/* ============================================================
 * Creazione giocatore
 * ============================================================ */

export async function createPlayer(
  raw: PlayerFormValues,
): Promise<{ id: string }> {
  const v = playerFormSchema.parse(raw);

  const workspace = await getCurrentWorkspace();
  if (!workspace) throw new Error("Workspace non trovato");

  const supabase = await createClient();

  const ratings = Object.fromEntries(
    RATING_KEYS.map((k) => [k, v[k as RatingKey]]),
  );
  const influenze = Object.fromEntries(
    INFLUENZE_NEG.map((i) => [i.key, v[i.key]]),
  );

  const { data, error } = await supabase
    .from("players")
    .insert({
      workspace_id: workspace.id,
      created_by: workspace.userId,

      nome: v.nome,
      cognome: v.cognome,
      foto_url: v.foto_url,
      data_nascita: v.data_nascita,
      nazionalita: v.nazionalita,
      passaporto: v.passaporto ?? null,
      piede: v.piede ?? null,

      ruolo_principale: v.ruolo_principale ?? null,
      ruoli_secondari: v.ruoli_secondari,
      stili_gioco: v.stili_gioco,

      transfermarkt_url: v.transfermarkt_url,
      squadra_attuale: v.squadra_attuale,
      campionato: v.campionato,
      scadenza_contratto: v.scadenza_contratto,
      agenzia: v.agenzia,
      valore_mercato_eur: v.valore_mercato_eur,
      fascia_ingaggio: v.fascia_ingaggio ?? null,

      altezza_cm: v.altezza_cm,
      peso_kg: v.peso_kg,
      struttura_corporea: v.struttura_corporea ?? null,
      gesti_motori: v.gesti_motori ?? null,
      muscolatura: v.muscolatura ?? null,
      capacita_condizionali: v.capacita_condizionali,

      behav_delega_altri: v.behav_delega_altri ?? null,
      behav_assume_responsabilita: v.behav_assume_responsabilita ?? null,
      ...influenze,
      ...ratings,

      status_osservazione: v.status_osservazione,
      voto_potenziale: v.voto_potenziale ?? null,
      data_ultimo_aggiornamento: v.data_ultimo_aggiornamento,
      scout_assegnato: v.scout_assegnato,

      scouting_report_url: v.scouting_report_url,
      note_rapide: v.note_rapide,
      clip_video_urls: v.clip_video_urls,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Errore creazione giocatore");

  revalidatePath("/scouting");
  return { id: data.id };
}

/* ============================================================
 * Modifica giocatore
 * ============================================================ */

/** Converte una riga DB nei valori attesi dal form. */
function playerRowToFormValues(p: PlayerRow): PlayerFormValues {
  const base: Record<string, unknown> = {
    nome: p.nome,
    cognome: p.cognome,
    foto_url: p.foto_url,
    data_nascita: p.data_nascita,
    nazionalita: p.nazionalita,
    passaporto: p.passaporto,
    piede: p.piede,

    ruolo_principale: p.ruolo_principale,
    ruoli_secondari: p.ruoli_secondari ?? [],
    stili_gioco: p.stili_gioco ?? [],

    transfermarkt_url: p.transfermarkt_url,
    squadra_attuale: p.squadra_attuale,
    campionato: p.campionato,
    scadenza_contratto: p.scadenza_contratto,
    agenzia: p.agenzia,
    valore_mercato_eur: p.valore_mercato_eur,
    fascia_ingaggio: p.fascia_ingaggio,

    altezza_cm: p.altezza_cm,
    peso_kg: p.peso_kg,
    struttura_corporea: p.struttura_corporea,
    gesti_motori: p.gesti_motori,
    muscolatura: p.muscolatura,
    capacita_condizionali: p.capacita_condizionali,

    behav_delega_altri: p.behav_delega_altri,
    behav_assume_responsabilita: p.behav_assume_responsabilita,

    status_osservazione: p.status_osservazione,
    voto_potenziale: p.voto_potenziale,
    data_ultimo_aggiornamento: p.data_ultimo_aggiornamento,
    scout_assegnato: p.scout_assegnato,

    scouting_report_url: p.scouting_report_url,
    note_rapide: p.note_rapide,
    clip_video_urls: p.clip_video_urls ?? [],
  };
  const row = p as unknown as Record<string, unknown>;
  for (const i of INFLUENZE_NEG) base[i.key] = !!row[i.key];
  for (const k of RATING_KEYS) {
    const v = row[k];
    base[k] = typeof v === "number" ? v : null;
  }
  return base as PlayerFormValues;
}

/**
 * Carica un giocatore per la pagina di modifica.
 * Ritorna i valori già pronti per il form e il flag `can_edit`
 * (creatore o owner del workspace — coerente con le RLS).
 */
export async function getPlayerForEdit(playerId: string): Promise<{
  id: string;
  values: PlayerFormValues;
  can_edit: boolean;
} | null> {
  z.string().uuid().parse(playerId);

  const workspace = await getCurrentWorkspace();
  if (!workspace) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("id", playerId)
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) return null;
  const p = data as PlayerRow;

  return {
    id: p.id,
    values: playerRowToFormValues(p),
    can_edit: workspace.isOwner || p.created_by === workspace.userId,
  };
}

/**
 * Aggiorna un giocatore esistente.
 * La RLS `players_update_owner_or_creator` garantisce che solo il creatore
 * o l'owner del workspace possano scrivere. Imposta sempre
 * `data_ultimo_aggiornamento` a oggi.
 */
export async function updatePlayer(
  playerId: string,
  raw: PlayerFormValues,
): Promise<{ id: string }> {
  z.string().uuid().parse(playerId);
  const v = playerFormSchema.parse(raw);

  const workspace = await getCurrentWorkspace();
  if (!workspace) throw new Error("Workspace non trovato");

  const supabase = await createClient();

  const ratings = Object.fromEntries(
    RATING_KEYS.map((k) => [k, v[k as RatingKey]]),
  );
  const influenze = Object.fromEntries(
    INFLUENZE_NEG.map((i) => [i.key, v[i.key]]),
  );

  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("players")
    .update({
      nome: v.nome,
      cognome: v.cognome,
      foto_url: v.foto_url,
      data_nascita: v.data_nascita,
      nazionalita: v.nazionalita,
      passaporto: v.passaporto ?? null,
      piede: v.piede ?? null,

      ruolo_principale: v.ruolo_principale ?? null,
      ruoli_secondari: v.ruoli_secondari,
      stili_gioco: v.stili_gioco,

      transfermarkt_url: v.transfermarkt_url,
      squadra_attuale: v.squadra_attuale,
      campionato: v.campionato,
      scadenza_contratto: v.scadenza_contratto,
      agenzia: v.agenzia,
      valore_mercato_eur: v.valore_mercato_eur,
      fascia_ingaggio: v.fascia_ingaggio ?? null,

      altezza_cm: v.altezza_cm,
      peso_kg: v.peso_kg,
      struttura_corporea: v.struttura_corporea ?? null,
      gesti_motori: v.gesti_motori ?? null,
      muscolatura: v.muscolatura ?? null,
      capacita_condizionali: v.capacita_condizionali,

      behav_delega_altri: v.behav_delega_altri ?? null,
      behav_assume_responsabilita: v.behav_assume_responsabilita ?? null,
      ...influenze,
      ...ratings,

      status_osservazione: v.status_osservazione,
      voto_potenziale: v.voto_potenziale ?? null,
      data_ultimo_aggiornamento: today,
      scout_assegnato: v.scout_assegnato,

      scouting_report_url: v.scouting_report_url,
      note_rapide: v.note_rapide,
      clip_video_urls: v.clip_video_urls,
    })
    .eq("id", playerId)
    .eq("workspace_id", workspace.id)
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Errore aggiornamento giocatore");
  }

  revalidatePath("/scouting");
  revalidatePath(`/scouting/${playerId}`);
  return { id: data.id };
}

/* ============================================================
 * Placeholder Transfermarkt auto-fetch
 * (vedi commento esteso nella precedente versione di questo file)
 * ============================================================ */
export async function syncFromTransfermarkt(
  _playerId: string,
): Promise<{ ok: true; message: string }> {
  void _playerId;
  return {
    ok: true,
    message:
      "Integrazione Transfermarkt non ancora implementata. Vedi commenti in actions.ts.",
  };
}
