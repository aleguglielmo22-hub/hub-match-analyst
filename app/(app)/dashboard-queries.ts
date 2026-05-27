import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/supabase/queries";
import type { PlayerListItem } from "@/lib/types/scouting";

/* ============================================================
 * KPI numerici (count head-only: query veloci, niente payload)
 * ============================================================ */

export type DashboardKpis = {
  playersTotal: number;
  playersElite: number;
  setPiecesTotal: number;
  setPiecesOffensivi: number;
  setPiecesDifensivi: number;
  situationalTotal: number;
  setPiecesGol: number;
  setPiecesConEsito: number;
};

export async function loadDashboardKpis(): Promise<DashboardKpis> {
  const workspace = await getCurrentWorkspace();
  if (!workspace)
    return {
      playersTotal: 0,
      playersElite: 0,
      setPiecesTotal: 0,
      setPiecesOffensivi: 0,
      setPiecesDifensivi: 0,
      situationalTotal: 0,
      setPiecesGol: 0,
      setPiecesConEsito: 0,
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

  const [
    playersTotalRes,
    playersEliteRes,
    setPiecesTotalRes,
    setPiecesOffRes,
    setPiecesDifRes,
    situationalRes,
    setPiecesGolRes,
    setPiecesConEsitoRes,
  ] = await Promise.all([
    players(),
    players().in("voto_potenziale", ["A1", "A2"]),
    setPieces(),
    setPieces().eq("fase", "OFFENSIVO"),
    setPieces().eq("fase", "DIFENSIVO"),
    situational(),
    setPieces().eq("esito_finale", "GOL"),
    setPieces().not("esito_finale", "is", null),
  ]);

  return {
    playersTotal: playersTotalRes.count ?? 0,
    playersElite: playersEliteRes.count ?? 0,
    setPiecesTotal: setPiecesTotalRes.count ?? 0,
    setPiecesOffensivi: setPiecesOffRes.count ?? 0,
    setPiecesDifensivi: setPiecesDifRes.count ?? 0,
    situationalTotal: situationalRes.count ?? 0,
    setPiecesGol: setPiecesGolRes.count ?? 0,
    setPiecesConEsito: setPiecesConEsitoRes.count ?? 0,
  };
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
  const { data } = await supabase
    .from("players")
    .select(
      "id, nome, cognome, ruolo_principale, voto_potenziale, foto_url, created_at",
    )
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(4);
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
