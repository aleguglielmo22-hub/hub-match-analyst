import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, FileVideo, Loader2, Save } from "lucide-react";
import type { LookupKind, Lookups, PickedVideo } from "@shared/api";
import { suggestPreferred } from "@shared/matches";
import { formatDuration } from "@shared/time";
import { LookupPicker } from "../components/LookupPicker";
import { Button, Card, ErrorBox, Field, Input } from "../components/ui";
import { api, cn, errorMessage } from "../lib/api";

function formatSize(bytes: number): string {
  const gb = bytes / 1024 ** 3;
  return gb >= 1 ? `${gb.toFixed(2).replace(".", ",")} GB` : `${Math.round(bytes / 1024 ** 2)} MB`;
}

/** Nuova partita: file video dal disco + dati della partita dalle anagrafiche condivise. */
export function NewMatchPage({ onCreated, onCancel }: { onCreated: (id: string) => void; onCancel: () => void }) {
  const [lookups, setLookups] = useState<Lookups | null>(null);
  const [video, setVideo] = useState<PickedVideo | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    data_partita: "",
    titolo: "",
    home_team_id: null as string | null,
    away_team_id: null as string | null,
    competition_id: null as string | null,
    season_id: null as string | null,
  });
  // Scelta esplicita della squadra preferita; altrimenti quella delle preferenze.
  const [preferredChoice, setPreferredChoice] = useState<string | "none" | null>(null);

  useEffect(() => {
    api.lookups.list().then(setLookups).catch((err) => setError(errorMessage(err)));
  }, []);

  const suggested = suggestPreferred(lookups?.myTeamId ?? null, form.home_team_id, form.away_team_id);
  const validChoice =
    preferredChoice === "none" || (preferredChoice && [form.home_team_id, form.away_team_id].includes(preferredChoice))
      ? preferredChoice
      : null;
  const preferred = validChoice === "none" ? null : (validChoice ?? suggested);

  async function pick() {
    setError(null);
    setAnalyzing(true);
    try {
      const v = await api.media.pickVideo();
      if (v) setVideo(v);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setAnalyzing(false);
    }
  }

  async function create(kind: LookupKind, name: string) {
    const created = await api.lookups.create(kind, name);
    const key = kind === "team" ? "teams" : kind === "competition" ? "competitions" : "seasons";
    setLookups((l) => (l && !l[key].some((o) => o.id === created.id) ? { ...l, [key]: [created, ...l[key]] } : l));
    return created;
  }

  async function save() {
    if (!video || !form.home_team_id || !form.away_team_id) return;
    setSaving(true);
    setError(null);
    try {
      const { id } = await api.matches.create({
        token: video.token,
        titolo: form.titolo.trim() || null,
        data_partita: form.data_partita || null,
        home_team_id: form.home_team_id,
        away_team_id: form.away_team_id,
        competition_id: form.competition_id,
        season_id: form.season_id,
        preferred_team_id: preferred,
      });
      onCreated(id);
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  const sameTeam = !!form.home_team_id && form.home_team_id === form.away_team_id;
  const canSave = !!video && !!form.home_team_id && !!form.away_team_id && !sameTeam && !saving;
  const teams = lookups?.teams ?? [];
  const teamLabel = (id: string | null) => teams.find((t) => t.id === id)?.label ?? "";

  return (
    <div className="min-h-0 flex-1 overflow-auto px-8 pt-10 pb-10">
      <h1 className="text-2xl font-semibold tracking-tight">Nuova partita</h1>
      <p className="mb-6 text-sm text-muted-foreground">Il video resta dove si trova: AG Tag ne salva solo i dati e l'impronta.</p>

      <div className="grid max-w-5xl gap-5 lg:grid-cols-[1fr_1.2fr]">
        <Card className="space-y-4">
          <h2 className="text-sm font-semibold">1. Video</h2>
          <Button variant="outline" onClick={() => void pick()} disabled={analyzing}>
            {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileVideo className="h-4 w-4" />}
            {video ? "Scegli un altro file" : "Scegli il video dal disco"}
          </Button>
          {analyzing && <p className="text-xs text-muted-foreground">Analisi del file in corso…</p>}
          {video && (
            <div className="space-y-3 text-sm">
              <p className="font-medium break-all">{video.fileName}</p>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                <dt className="text-muted-foreground">Durata</dt>
                <dd>{formatDuration(video.probe.durationMs)}</dd>
                <dt className="text-muted-foreground">Fotogrammi</dt>
                <dd>{video.probe.fps ? `${video.probe.fps} fps` : "—"}</dd>
                <dt className="text-muted-foreground">Risoluzione</dt>
                <dd>{video.probe.width && video.probe.height ? `${video.probe.width}×${video.probe.height}` : "—"}</dd>
                <dt className="text-muted-foreground">Codec</dt>
                <dd>{[video.probe.videoCodec, video.probe.audioCodec].filter(Boolean).join(" / ") || "—"}</dd>
                <dt className="text-muted-foreground">Dimensione</dt>
                <dd>{formatSize(video.sizeBytes)}</dd>
              </dl>
              {video.playable ? (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary-text" />
                  Riproducibile direttamente.
                </p>
              ) : (
                <p className="flex items-start gap-2 text-xs text-muted-foreground">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-primary-text" />
                  Formato non affidabile ({video.reason}): all'apertura verrà proposta una copia di lavoro H.264,
                  l'originale non viene toccato.
                </p>
              )}
            </div>
          )}
        </Card>

        <Card className="space-y-4">
          <h2 className="text-sm font-semibold">2. Partita</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Squadra di casa *">
              <LookupPicker
                ariaLabel="Squadra di casa"
                value={form.home_team_id}
                options={teams}
                onChange={(id) => setForm((f) => ({ ...f, home_team_id: id }))}
                onCreate={(n) => create("team", n)}
                placeholder="Cerca o crea…"
              />
            </Field>
            <Field label="Squadra ospite *">
              <LookupPicker
                ariaLabel="Squadra ospite"
                value={form.away_team_id}
                options={teams}
                onChange={(id) => setForm((f) => ({ ...f, away_team_id: id }))}
                onCreate={(n) => create("team", n)}
                placeholder="Cerca o crea…"
              />
            </Field>
            <Field label="Data">
              <Input type="date" value={form.data_partita} onChange={(e) => setForm((f) => ({ ...f, data_partita: e.target.value }))} />
            </Field>
            <Field label="Titolo (facoltativo)">
              <Input
                value={form.titolo}
                maxLength={200}
                placeholder="Es. Andata, amichevole…"
                onChange={(e) => setForm((f) => ({ ...f, titolo: e.target.value }))}
              />
            </Field>
            <Field label="Competizione">
              <LookupPicker
                ariaLabel="Competizione"
                value={form.competition_id}
                options={lookups?.competitions ?? []}
                onChange={(id) => setForm((f) => ({ ...f, competition_id: id }))}
                onCreate={(n) => create("competition", n)}
                placeholder="Cerca o crea…"
              />
            </Field>
            <Field label="Stagione">
              <LookupPicker
                ariaLabel="Stagione"
                value={form.season_id}
                options={lookups?.seasons ?? []}
                onChange={(id) => setForm((f) => ({ ...f, season_id: id }))}
                onCreate={(n) => create("season", n)}
                placeholder="Es. 2026/27"
              />
            </Field>
          </div>
          {sameTeam && <ErrorBox>Casa e ospite devono essere squadre diverse.</ErrorBox>}

          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-muted-foreground">Squadra preferita (codifica dal suo punto di vista)</legend>
            <div className="flex flex-wrap gap-2">
              {[
                { id: form.home_team_id, label: teamLabel(form.home_team_id) || "Casa" },
                { id: form.away_team_id, label: teamLabel(form.away_team_id) || "Ospite" },
                { id: "none", label: "Nessuna" },
              ].map((o) => {
                const value = o.id === "none" ? null : o.id;
                const active = o.id === "none" ? preferred === null : !!value && preferred === value;
                return (
                  <button
                    key={o.label + String(o.id)}
                    type="button"
                    disabled={o.id === null}
                    aria-pressed={active}
                    onClick={() => setPreferredChoice(o.id === "none" ? "none" : o.id)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs transition-colors disabled:opacity-40",
                      active ? "border-primary/60 bg-primary-soft text-primary-text" : "border-border hover:bg-muted",
                    )}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
            {suggested && preferredChoice === null && (
              <p className="text-[11px] text-muted-foreground">Proposta dalla «mia squadra» nelle preferenze di AG Workspace.</p>
            )}
          </fieldset>
        </Card>
      </div>

      {error && <div className="mt-5 max-w-5xl"><ErrorBox>{error}</ErrorBox></div>}

      <div className="mt-6 flex max-w-5xl justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          Annulla
        </Button>
        <Button onClick={() => void save()} disabled={!canSave}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salva e apri
        </Button>
      </div>
    </div>
  );
}
