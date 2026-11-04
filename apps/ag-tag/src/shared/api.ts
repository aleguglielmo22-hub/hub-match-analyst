/**
 * Contratto tra l'interfaccia (renderer) e il processo principale.
 * Il renderer non accede né al disco né a Supabase: chiede tutto da qui,
 * tramite il ponte esposto dal preload (window.agTag).
 */
import type { ProbeInfo } from "./media.ts";
import type { Panel } from "./panel.ts";
import type { EventKeys } from "./panel-shortcuts.ts";
import type { Shortcuts } from "./shortcuts.ts";
import type { ImportPreview } from "./videomatch-import.ts";

export type Lookup = { id: string; label: string };
export type LookupKind = "team" | "competition" | "season";
export type Lookups = { teams: Lookup[]; competitions: Lookup[]; seasons: Lookup[]; myTeamId: string | null };

export type UserInfo = { email: string; workspaceId: string; isOwner: boolean };
export type SignInResult = { ok: true; user: UserInfo } | { ok: false; message: string };

export type ThemeChoice = "dark" | "light";
export type Settings = { cacheDir: string; shortcuts: Shortcuts; theme: ThemeChoice; eventKeys: EventKeys };

/** Anteprima di un'importazione del pannello, da confermare con il token. */
export type PanelImportResult = { ok: true; token: string; preview: ImportPreview } | { ok: false; message: string };

/** File scelto dal disco: il percorso resta nel processo principale, qui solo un riferimento. */
export type PickedVideo = {
  token: string;
  fileName: string;
  sizeBytes: number;
  fingerprint: string;
  probe: ProbeInfo;
  playable: boolean;
  /** Motivo per cui serve la copia di lavoro. */
  reason: string | null;
};

export type NewMatchInput = {
  token: string;
  titolo: string | null;
  data_partita: string | null;
  home_team_id: string;
  away_team_id: string;
  competition_id: string | null;
  season_id: string | null;
  preferred_team_id: string | null;
};

export type MatchListItem = {
  id: string;
  titolo: string | null;
  data_partita: string | null;
  home: Lookup | null;
  away: Lookup | null;
  competition: Lookup | null;
  season: Lookup | null;
  preferred_team_id: string | null;
  video_file_name: string;
  duration_ms: number | null;
  fps: number | null;
  width: number | null;
  height: number | null;
  video_codec: string | null;
};

export type MatchFilters = { q: string; teamId: string | null; competitionId: string | null; seasonId: string | null };

/** Esito dell'apertura del video di una partita. */
export type OpenVideoResult =
  | { status: "ready"; url: string; source: "original" | "working"; fps: number; durationMs: number | null }
  | { status: "needs-working-copy"; reason: string }
  | { status: "missing"; fileName: string; lastPath: string | null };

export type RelinkResult = { ok: true } | { ok: false; message: string };

export type WorkingCopyProgress = { matchId: string; progress: number };

export type AgTagApi = {
  auth: {
    current(): Promise<UserInfo | null>;
    signIn(email: string, password: string): Promise<SignInResult>;
    signOut(): Promise<void>;
  };
  lookups: {
    list(): Promise<Lookups>;
    create(kind: LookupKind, name: string): Promise<Lookup>;
  };
  media: {
    /** Apre la finestra di scelta del file e lo analizza (FFprobe + impronta). */
    pickVideo(): Promise<PickedVideo | null>;
  };
  matches: {
    list(): Promise<MatchListItem[]>;
    create(input: NewMatchInput): Promise<{ id: string }>;
    get(id: string): Promise<MatchListItem | null>;
    openVideo(id: string): Promise<OpenVideoResult>;
    /** Chiede di indicare di nuovo il file e lo accetta solo se l'impronta coincide. */
    relink(id: string): Promise<RelinkResult>;
    /** Crea la copia di lavoro H.264 (avanzamento con onProgress). */
    makeWorkingCopy(id: string): Promise<{ ok: true } | { ok: false; message: string }>;
    cancelWorkingCopy(id: string): Promise<void>;
    onProgress(listener: (p: WorkingCopyProgress) => void): () => void;
  };
  panel: {
    /** Pannello in uso (per ora solo in memoria fino alla chiusura dell'app). */
    get(): Promise<Panel | null>;
    /** Sceglie il file VideoMatch (XML) e, facoltativo, il LiveTag (JSON): restituisce l'anteprima. */
    pickImport(): Promise<PanelImportResult | null>;
    confirmImport(token: string): Promise<{ panel: Panel; settings: Settings }>;
    setTiming(code: string, leadMs: number, lagMs: number): Promise<Panel>;
  };
  settings: {
    get(): Promise<Settings>;
    chooseCacheDir(): Promise<Settings>;
    setShortcuts(shortcuts: Shortcuts): Promise<Settings>;
    setTheme(theme: ThemeChoice): Promise<Settings>;
    setEventKeys(keys: EventKeys): Promise<Settings>;
  };
};

/** Nomi dei canali IPC (uno per metodo). */
export const IPC = {
  authCurrent: "auth:current",
  authSignIn: "auth:signIn",
  authSignOut: "auth:signOut",
  lookupsList: "lookups:list",
  lookupsCreate: "lookups:create",
  mediaPick: "media:pick",
  matchesList: "matches:list",
  matchesCreate: "matches:create",
  matchesGet: "matches:get",
  matchesOpenVideo: "matches:openVideo",
  matchesRelink: "matches:relink",
  matchesMakeWorkingCopy: "matches:makeWorkingCopy",
  matchesCancelWorkingCopy: "matches:cancelWorkingCopy",
  matchesProgress: "matches:progress",
  panelGet: "panel:get",
  panelPickImport: "panel:pickImport",
  panelConfirmImport: "panel:confirmImport",
  panelSetTiming: "panel:setTiming",
  settingsGet: "settings:get",
  settingsChooseCacheDir: "settings:chooseCacheDir",
  settingsSetShortcuts: "settings:setShortcuts",
  settingsSetTheme: "settings:setTheme",
  settingsSetEventKeys: "settings:setEventKeys",
} as const;
