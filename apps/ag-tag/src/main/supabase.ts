/**
 * Supabase nel processo principale: stesso progetto e stessi account di
 * AG Workspace, stessa lista degli ammessi. La sessione è cifrata sul Mac
 * (session-store.ts); il renderer riceve solo i dati che gli servono.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isEmailAllowed, ACCESS_DENIED_MESSAGE } from "@workspace-lib/auth/allowlist";
import { findByName } from "@workspace-lib/lookups/names";
import type { Database } from "@workspace-lib/types/database";
import type { Lookup, LookupKind, Lookups, MatchListItem, SignInResult, UserInfo } from "@shared/api";
import type { ProbeInfo } from "@shared/media";
import { EncryptedSessionStore } from "./session-store";

let client: SupabaseClient<Database> | null = null;
let workspace: UserInfo | null = null;

export function supabase(): SupabaseClient<Database> {
  if (client) return client;
  const url = import.meta.env.MAIN_VITE_SUPABASE_URL;
  const key = import.meta.env.MAIN_VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Configurazione di Supabase mancante (apps/ag-tag/.env: npm run env).");
  client = createClient<Database>(url, key, {
    auth: {
      storage: new EncryptedSessionStore(),
      storageKey: "ag-tag-auth",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  return client;
}

/** Spazio di lavoro dell'utente (stessa regola di AG Workspace: primo membro attivo). */
async function loadWorkspace(userId: string, email: string): Promise<UserInfo | null> {
  const { data, error } = await supabase()
    .from("workspace_members")
    .select("workspace_id, workspaces(id, owner_id)")
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("Impossibile leggere lo spazio di lavoro");
  const ws = Array.isArray(data?.workspaces) ? data?.workspaces[0] : data?.workspaces;
  if (!ws) return null;
  return { email, workspaceId: ws.id, isOwner: ws.owner_id === userId };
}

/** Utente collegato (sessione ricordata), oppure null. Un account non ammesso viene disconnesso. */
export async function currentUser(): Promise<UserInfo | null> {
  const { data } = await supabase().auth.getUser();
  const user = data.user;
  if (!user) {
    workspace = null;
    return null;
  }
  if (!isEmailAllowed(user.email)) {
    await supabase().auth.signOut({ scope: "local" });
    workspace = null;
    return null;
  }
  workspace = await loadWorkspace(user.id, user.email ?? "");
  return workspace;
}

export async function signIn(email: string, password: string): Promise<SignInResult> {
  const { data, error } = await supabase().auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) {
    const network = /fetch|network/i.test(error.message);
    return { ok: false, message: network ? "Impossibile contattare il server. Controlla la connessione." : "Email o password errate." };
  }
  if (!isEmailAllowed(data.user?.email)) {
    await supabase().auth.signOut({ scope: "local" });
    return { ok: false, message: ACCESS_DENIED_MESSAGE };
  }
  const info = await loadWorkspace(data.user.id, data.user.email ?? "");
  if (!info) {
    await supabase().auth.signOut({ scope: "local" });
    return { ok: false, message: "Nessuno spazio di lavoro collegato a questo account." };
  }
  workspace = info;
  return { ok: true, user: info };
}

export async function signOut(): Promise<void> {
  await supabase().auth.signOut({ scope: "local" });
  workspace = null;
}

function requireWorkspace(): UserInfo {
  if (!workspace) throw new Error("Sessione scaduta: accedi di nuovo.");
  return workspace;
}

/* ============================================================
 * Anagrafiche condivise con AG Workspace
 * ============================================================ */

/** Squadre, competizioni e stagioni, con quelle usate di recente (anche in AG Tag) in cima. */
export async function listLookups(): Promise<Lookups> {
  const { workspaceId: ws } = requireWorkspace();
  const sb = supabase();
  const [teams, comps, seasons, matches, sp, prefs] = await Promise.all([
    sb.from("teams").select("id, nome").eq("workspace_id", ws).order("nome"),
    sb.from("competitions").select("id, nome").eq("workspace_id", ws).order("nome"),
    sb.from("seasons").select("id, label").eq("workspace_id", ws).order("label", { ascending: false }),
    sb
      .from("tag_matches")
      .select("updated_at, home_team_id, away_team_id, competition_id, season_id")
      .eq("workspace_id", ws)
      .order("updated_at", { ascending: false })
      .limit(50),
    sb
      .from("set_pieces")
      .select("updated_at, team_esecutrice_id, team_avversaria_id, competition_id, season_id")
      .eq("workspace_id", ws)
      .order("updated_at", { ascending: false })
      .limit(50),
    sb.from("user_preferences").select("my_team_id").eq("workspace_id", ws).maybeSingle(),
  ]);
  const err = teams.error ?? comps.error ?? seasons.error;
  if (err) throw new Error(err.message);

  const lastUse = new Map<string, string>();
  const use = (id: string | null, at: string) => {
    if (id && (lastUse.get(id) ?? "") < at) lastUse.set(id, at);
  };
  for (const r of matches.data ?? []) [r.home_team_id, r.away_team_id, r.competition_id, r.season_id].forEach((id) => use(id, r.updated_at));
  for (const r of sp.data ?? []) [r.team_esecutrice_id, r.team_avversaria_id, r.competition_id, r.season_id].forEach((id) => use(id, r.updated_at));
  const recentFirst = (list: Lookup[]) =>
    list
      .map((o, i) => ({ o, i, at: lastUse.get(o.id) ?? "" }))
      .sort((a, b) => (a.at === b.at ? a.i - b.i : a.at < b.at ? 1 : -1))
      .map((x) => x.o);

  return {
    teams: recentFirst((teams.data ?? []).map((t) => ({ id: t.id, label: t.nome }))),
    competitions: recentFirst((comps.data ?? []).map((c) => ({ id: c.id, label: c.nome }))),
    seasons: recentFirst((seasons.data ?? []).map((s) => ({ id: s.id, label: s.label }))),
    myTeamId: prefs.data?.my_team_id ?? null,
  };
}

const LOOKUP_TABLE = { team: "teams", competition: "competitions", season: "seasons" } as const;

/** Crea al volo (stessa regola di AG Workspace: maiuscole e spazi non contano, niente doppioni). */
export async function createLookup(kind: LookupKind, rawName: string): Promise<Lookup> {
  const { workspaceId: ws } = requireWorkspace();
  const name = rawName.trim();
  if (!name || name.length > 100) throw new Error("Nome non valido");
  const table = LOOKUP_TABLE[kind];
  const column = kind === "season" ? "label" : "nome";
  const sb = supabase();

  const findExisting = async (): Promise<Lookup | undefined> => {
    const { data } = await sb.from(table).select(`id, ${column}`).eq("workspace_id", ws);
    const rows = ((data ?? []) as unknown as Record<string, string>[]).map((r) => ({ id: r.id, label: r[column] }));
    return findByName(rows, name);
  };
  const existing = await findExisting();
  if (existing) return existing;

  const { data, error } = await sb
    .from(table)
    .insert({ workspace_id: ws, [column]: name } as never)
    .select(`id, ${column}`)
    .single();
  if (error || !data) {
    const raced = error?.code === "23505" ? await findExisting() : undefined;
    if (raced) return raced;
    throw new Error(error?.message ?? "Creazione non riuscita");
  }
  const row = data as unknown as Record<string, string>;
  return { id: row.id, label: row[column] };
}

/* ============================================================
 * Partite
 * ============================================================ */

const MATCH_COLUMNS = `
  id, titolo, data_partita, preferred_team_id, video_file_name, video_path, video_size_bytes,
  video_fingerprint, duration_ms, fps, width, height, video_codec,
  home:teams!tag_matches_home_team_id_fkey(id, nome),
  away:teams!tag_matches_away_team_id_fkey(id, nome),
  competition:competitions(id, nome),
  season:seasons(id, label)
`;

type MatchRow = {
  id: string;
  titolo: string | null;
  data_partita: string | null;
  preferred_team_id: string | null;
  video_file_name: string;
  video_path: string | null;
  video_size_bytes: number;
  video_fingerprint: string;
  duration_ms: number | null;
  fps: number | null;
  width: number | null;
  height: number | null;
  video_codec: string | null;
  home: { id: string; nome: string } | null;
  away: { id: string; nome: string } | null;
  competition: { id: string; nome: string } | null;
  season: { id: string; label: string } | null;
};

export type MatchRecord = MatchListItem & {
  video_path: string | null;
  video_size_bytes: number;
  video_fingerprint: string;
};

function toRecord(r: MatchRow): MatchRecord {
  return {
    id: r.id,
    titolo: r.titolo,
    data_partita: r.data_partita,
    preferred_team_id: r.preferred_team_id,
    video_file_name: r.video_file_name,
    video_path: r.video_path,
    video_size_bytes: r.video_size_bytes,
    video_fingerprint: r.video_fingerprint,
    duration_ms: r.duration_ms,
    fps: r.fps === null ? null : Number(r.fps),
    width: r.width,
    height: r.height,
    video_codec: r.video_codec,
    home: r.home ? { id: r.home.id, label: r.home.nome } : null,
    away: r.away ? { id: r.away.id, label: r.away.nome } : null,
    competition: r.competition ? { id: r.competition.id, label: r.competition.nome } : null,
    season: r.season ? { id: r.season.id, label: r.season.label } : null,
  };
}

/** Il renderer non riceve percorso e impronta del file. */
export function publicMatch(m: MatchRecord): MatchListItem {
  const { video_path: _p, video_size_bytes: _s, video_fingerprint: _f, ...rest } = m;
  void _p;
  void _s;
  void _f;
  return rest;
}

export async function listMatches(): Promise<MatchRecord[]> {
  const { workspaceId: ws } = requireWorkspace();
  const { data, error } = await supabase()
    .from("tag_matches")
    .select(MATCH_COLUMNS)
    .eq("workspace_id", ws)
    .is("deleted_at", null)
    .order("data_partita", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as MatchRow[]).map(toRecord);
}

export async function getMatch(id: string): Promise<MatchRecord | null> {
  const { workspaceId: ws } = requireWorkspace();
  const { data, error } = await supabase()
    .from("tag_matches")
    .select(MATCH_COLUMNS)
    .eq("id", id)
    .eq("workspace_id", ws)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toRecord(data as unknown as MatchRow) : null;
}

export async function insertMatch(input: {
  titolo: string | null;
  data_partita: string | null;
  home_team_id: string;
  away_team_id: string;
  competition_id: string | null;
  season_id: string | null;
  preferred_team_id: string | null;
  file: { name: string; path: string; sizeBytes: number; fingerprint: string; probe: ProbeInfo };
}): Promise<{ id: string }> {
  const { workspaceId: ws } = requireWorkspace();
  const { file, ...match } = input;
  const { data, error } = await supabase()
    .from("tag_matches")
    .insert({
      workspace_id: ws,
      ...match,
      video_file_name: file.name.slice(0, 255),
      video_path: file.path,
      video_size_bytes: file.sizeBytes,
      video_fingerprint: file.fingerprint,
      duration_ms: file.probe.durationMs,
      fps: file.probe.fps,
      width: file.probe.width,
      height: file.probe.height,
      video_codec: file.probe.videoCodec,
      audio_codec: file.probe.audioCodec,
      container: file.probe.container?.slice(0, 80) ?? null,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Salvataggio non riuscito");
  return { id: data.id };
}

/** Nuovo percorso del file (dopo averlo indicato di nuovo, impronta già verificata). */
export async function updateMatchPath(id: string, path: string, fileName: string): Promise<void> {
  const { workspaceId: ws } = requireWorkspace();
  const { error } = await supabase()
    .from("tag_matches")
    .update({ video_path: path, video_file_name: fileName.slice(0, 255) })
    .eq("id", id)
    .eq("workspace_id", ws);
  if (error) throw new Error(error.message);
}
