import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/supabase/queries";
import type { PlayerListItem } from "@/lib/types/scouting";
import { logLoadError } from "@/lib/load-result";
import { ESITO_TONE } from "@/lib/tones";
import {
  computeSetPiecesEfficacy,
  type EfficacyRow,
  type SetPiecesEfficacy,
} from "@/lib/set-pieces/efficacy";

/* ============================================================
 * KPI numerici (count head-only: query veloci, niente payload)
 * ============================================================ */

export type DashboardKpis = {
  playersTotal: number;
  playersElite: number;
  /** Osservazioni su giocatori non nel cestino. */
  observationsTotal: number;
  setPiecesTotal: number;
  setPiecesOffensivi: number;
  setPiecesDifensivi: number;
  situationalTotal: number;
};

export async function loadDashboardKpis(): Promise<DashboardKpis> {
  const workspace = await getCurrentWorkspace();
  if (!workspace)
    return {
      playersTotal: 0,
      playersElite: 0,
      observationsTotal: 0,
      setPiecesTotal: 0,
      setPiecesOffensivi: 0,
      setPiecesDifensivi: 0,
      situationalTotal: 0,
    };

  const supabase = await createClient();
  const wsId = workspace.id;

  // Query in parallelo. PostgREST con `count: exact, head: true` ritorna
  // solo il Count nell'header HTTP — niente payload trasferito.
  // Helper tipizzati per ogni tabella (necessari perché supabase-js esige
  // un nome di tabella tipato, non una stringa generica).
  const players = () =>
    supabase
      .from("players")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", wsId)
      .is("deleted_at", null);
  const setPieces = () =>
    supabase
      .from("set_pieces")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", wsId)
      .is("deleted_at", null);
  const situational = () =>
    supabase
      .from("situational_tactics")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", wsId)
      .is("deleted_at", null);

  const observations = () =>
    supabase
      .from("player_observations")
      .select("id, players!inner(id)", { count: "exact", head: true })
      .eq("workspace_id", wsId)
      .is("players.deleted_at", null);

  const [
    playersTotalRes,
    playersEliteRes,
    observationsRes,
    setPiecesTotalRes,
    setPiecesOffRes,
    setPiecesDifRes,
    situationalRes,
  ] = await Promise.all([
    players(),
    players().in("voto_potenziale", ["A1", "A2"]),
    observations(),
    setPieces(),
    setPieces().eq("fase", "OFFENSIVO"),
    setPieces().eq("fase", "DIFENSIVO"),
    situational(),
  ]);

  const failed = [
    playersTotalRes,
    playersEliteRes,
    observationsRes,
    setPiecesTotalRes,
    setPiecesOffRes,
    setPiecesDifRes,
    situationalRes,
  ].find((r) => r.error);
  if (failed) {
    // Un conteggio fallito non deve apparire come "0": il widget mostrerà l'errore.
    logLoadError("Dashboard · contatori", failed.error);
    throw new Error("Impossibile caricare i contatori");
  }

  return {
    playersTotal: playersTotalRes.count ?? 0,
    playersElite: playersEliteRes.count ?? 0,
    observationsTotal: observationsRes.count ?? 0,
    setPiecesTotal: setPiecesTotalRes.count ?? 0,
    setPiecesOffensivi: setPiecesOffRes.count ?? 0,
    setPiecesDifensivi: setPiecesDifRes.count ?? 0,
    situationalTotal: situationalRes.count ?? 0,
  };
}

/* ============================================================
 * Efficacia calci piazzati per fase (calcolo in lib/set-pieces/efficacy.ts)
 * ============================================================ */

const EFFICACY_PAGE = 1000;

export async function loadSetPiecesEfficacy(): Promise<SetPiecesEfficacy> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return computeSetPiecesEfficacy([], ESITO_TONE);

  const supabase = await createClient();
  // Solo le 3 colonne necessarie; a pagine perché PostgREST limita le righe
  // per richiesta. I piazzati nel cestino sono esclusi.
  const rows: EfficacyRow[] = [];
  for (let from = 0; ; from += EFFICACY_PAGE) {
    const { data, error } = await supabase
      .from("set_pieces")
      .select("fase, tipo_piazzato, esito_finale")
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)
      .order("id")
      .range(from, from + EFFICACY_PAGE - 1);
    if (error) {
      logLoadError("Dashboard · efficacia piazzati", error);
      throw new Error("Impossibile caricare l'efficacia dei piazzati");
    }
    rows.push(...(data ?? []));
    if (!data || data.length < EFFICACY_PAGE) break;
  }
  return computeSetPiecesEfficacy(rows, ESITO_TONE);
}

/* ============================================================
 * Attività recente: ultimi 4 giocatori, ultimi 3 schemi/situational
 * ============================================================ */

export type RecentPlayer = Pick<
  PlayerListItem,
  "id" | "nome" | "cognome" | "ruolo_principale" | "voto_potenziale" | "foto_url"
> & { created_at: string };

export type RecentItem = {
  id: string;
  kind: "set_piece" | "situational";
  titolo: string;
  /** Sotto-etichetta contestuale (fase per set piece, macro per situational). */
  subtitle: string;
  updated_at: string;
};

export async function loadRecentPlayers(): Promise<RecentPlayer[]> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("players")
    .select(
      "id, nome, cognome, ruolo_principale, voto_potenziale, foto_url, created_at",
    )
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(4);
  if (error) {
    logLoadError("Dashboard · ultimi giocatori", error);
    throw new Error("Impossibile caricare gli ultimi giocatori");
  }
  return (data ?? []) as RecentPlayer[];
}

/**
 * Ultimi N elementi modificati di recente combinando set_pieces e situational
 * (merge lato app: due query separate, ordinamento finale per updated_at).
 */
export async function loadRecentSchemes(limit = 3): Promise<RecentItem[]> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return [];

  const supabase = await createClient();

  const [spRes, stRes] = await Promise.all([
    supabase
      .from("set_pieces")
      .select("id, titolo, fase, updated_at")
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(limit),
    supabase
      .from("situational_tactics")
      .select("id, titolo, macro_fase, updated_at")
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(limit),
  ]);
  if (spRes.error || stRes.error) {
    logLoadError("Dashboard · ultimi schemi", spRes.error ?? stRes.error);
    throw new Error("Impossibile caricare gli ultimi schemi");
  }

  const setPieces: RecentItem[] = (spRes.data ?? []).map((r) => ({
    id: r.id,
    kind: "set_piece" as const,
    titolo: r.titolo,
    subtitle: r.fase === "OFFENSIVO" ? "Offensivo" : "Difensivo",
    updated_at: r.updated_at,
  }));
  const situational: RecentItem[] = (stRes.data ?? []).map((r) => ({
    id: r.id,
    kind: "situational" as const,
    titolo: r.titolo,
    subtitle:
      r.macro_fase === "POSSESSO"
        ? "Possesso"
        : r.macro_fase === "NON_POSSESSO"
          ? "Non possesso"
          : r.macro_fase === "TRANSIZIONE_POSITIVA"
            ? "Transizione +"
            : "Transizione −",
    updated_at: r.updated_at,
  }));

  return [...setPieces, ...situational]
    .sort((a, b) =>
      a.updated_at < b.updated_at ? 1 : a.updated_at > b.updated_at ? -1 : 0,
    )
    .slice(0, limit);
}
