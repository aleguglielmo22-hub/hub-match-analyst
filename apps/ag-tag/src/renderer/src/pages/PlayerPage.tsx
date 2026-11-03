import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronFirst,
  ChevronLast,
  FileSearch,
  Loader2,
  Pause,
  Play,
  Rewind,
  FastForward,
  Wand2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { MatchListItem, OpenVideoResult } from "@shared/api";
import { matchTitle } from "@shared/matches";
import { actionFor, comboLabel, type PlayerAction, type Shortcuts } from "@shared/shortcuts";
import { PLAYBACK_RATES, formatTimecode, frameAt, jump, nextRate, stepFrames } from "@shared/time";
import { Button, Card, ErrorBox } from "../components/ui";
import { api, cn, errorMessage } from "../lib/api";

/** Partita aperta: verifica del file, eventuale copia di lavoro, poi il lettore. */
export function PlayerPage({ id, shortcuts, onBack }: { id: string; shortcuts: Shortcuts; onBack: () => void }) {
  const [match, setMatch] = useState<MatchListItem | null>(null);
  const [state, setState] = useState<OpenVideoResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setState(null);
    try {
      const [m, s] = await Promise.all([api.matches.get(id), api.matches.openVideo(id)]);
      setMatch(m);
      setState(s);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(
    () =>
      api.matches.onProgress((p) => {
        if (p.matchId === id) setProgress(p.progress);
      }),
    [id],
  );

  async function relink() {
    setBusy(true);
    try {
      const res = await api.matches.relink(id);
      if (res.ok) await load();
      else setError(res.message);
    } finally {
      setBusy(false);
    }
  }

  async function makeCopy() {
    setBusy(true);
    setProgress(0);
    setError(null);
    try {
      const res = await api.matches.makeWorkingCopy(id);
      if (res.ok) await load();
      else setError(res.message);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-3 px-6 pt-9 pb-3">
        <Button variant="ghost" onClick={onBack} aria-label="Torna alle partite" className="no-drag px-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold">{match ? matchTitle(match) : "Partita"}</h1>
          <p className="truncate text-xs text-muted-foreground">
            {[match?.competition?.label, match?.season?.label, match?.video_file_name].filter(Boolean).join(" · ")}
            {state?.status === "ready" && state.source === "working" && " · copia di lavoro H.264"}
          </p>
        </div>
      </header>

      {error && <div className="px-6 pb-3"><ErrorBox>{error}</ErrorBox></div>}

      {!state && !error && <Loader2 className="mx-auto mt-16 h-6 w-6 animate-spin text-primary-text" aria-label="Apertura del video" />}

      {state?.status === "missing" && (
        <Card className="mx-6 max-w-xl space-y-3">
          <p className="font-medium">Il video non si trova più</p>
          <p className="text-sm text-muted-foreground">
            «{state.fileName}» non è al percorso salvato{state.lastPath ? ` (${state.lastPath})` : ""}. Indica dov'è ora:
            verrà accettato solo se è lo stesso file (stessa impronta), anche se rinominato.
          </p>
          <Button onClick={() => void relink()} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSearch className="h-4 w-4" />}
            Indica il file
          </Button>
        </Card>
      )}

      {state?.status === "needs-working-copy" && (
        <Card className="mx-6 max-w-xl space-y-3">
          <p className="font-medium">Serve una copia di lavoro</p>
          <p className="text-sm text-muted-foreground">
            Il formato del file ({state.reason}) non garantisce una riproduzione precisa. AG Tag crea una copia H.264 nella
            cartella scelta nelle impostazioni; l'originale non viene toccato.
          </p>
          {progress !== null ? (
            <div className="space-y-2">
              <div
                className="h-2 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress * 100)}
              >
                <div className="h-full bg-primary transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{Math.round(progress * 100)}%</span>
                <Button variant="ghost" onClick={() => void api.matches.cancelWorkingCopy(id)}>
                  Annulla
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => void makeCopy()} disabled={busy}>
              <Wand2 className="h-4 w-4" />
              Crea copia di lavoro
            </Button>
          )}
        </Card>
      )}

      {state?.status === "ready" && (
        <VideoPlayer key={state.url} url={state.url} fps={state.fps} shortcuts={shortcuts} />
      )}
    </div>
  );
}

const MAX_ZOOM = 4;

/** Lettore preciso: fotogramma per fotogramma, salti, velocità, ingrandimento, scorciatoie. */
function VideoPlayer({ url, fps, shortcuts }: { url: string; fps: number; shortcuts: Shortcuts }) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  // Tempo esatto del fotogramma mostrato (requestVideoFrameCallback), anche in riproduzione.
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    let handle = 0;
    const onFrame = (_now: number, meta: VideoFrameCallbackMetadata) => {
      setTime(meta.mediaTime);
      handle = v.requestVideoFrameCallback(onFrame);
    };
    handle = v.requestVideoFrameCallback(onFrame);
    return () => v.cancelVideoFrameCallback(handle);
  }, []);

  const seek = (t: number) => {
    const v = video.current;
    if (!v) return;
    v.currentTime = t;
    setTime(t);
  };

  const run = useCallback(
    (action: PlayerAction) => {
      const v = video.current;
      if (!v) return;
      const d = v.duration || 0;
      switch (action) {
        case "playPause":
          if (v.paused) void v.play();
          else v.pause();
          break;
        case "frameForward":
        case "frameBack":
          v.pause();
          seek(stepFrames(v.currentTime, fps, action === "frameForward" ? 1 : -1, d));
          break;
        case "jumpForward":
        case "jumpBack":
          seek(jump(v.currentTime, action === "jumpForward" ? 5 : -5, d));
          break;
        case "faster":
        case "slower": {
          const r = nextRate(v.playbackRate, action === "faster" ? 1 : -1);
          v.playbackRate = r;
          setRate(r);
          break;
        }
        case "normalSpeed":
          v.playbackRate = 1;
          setRate(1);
          break;
        case "zoomIn":
          setZoom((z) => Math.min(MAX_ZOOM, z + 0.25));
          break;
        case "zoomOut":
          setZoom((z) => {
            const next = Math.max(1, z - 0.25);
            if (next === 1) setPan({ x: 0, y: 0 });
            return next;
          });
          break;
        case "zoomReset":
          setZoom(1);
          setPan({ x: 0, y: 0 });
          break;
      }
    },
    [fps],
  );

  // Scorciatoie (non mentre si scrive in un campo).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      const action = actionFor(e, shortcuts);
      if (!action) return;
      e.preventDefault();
      run(action);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [run, shortcuts]);

  const frame = frameAt(time, fps);
  const hint = (a: PlayerAction, label: string) => `${label} (${comboLabel(shortcuts[a])})`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className={cn("relative mx-6 min-h-0 flex-1 overflow-hidden rounded-xl bg-stage", zoom > 1 && "cursor-grab active:cursor-grabbing")}
        onPointerDown={(e) => {
          if (zoom <= 1) return;
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          setPan({ x: drag.current.px + e.clientX - drag.current.x, y: drag.current.py + e.clientY - drag.current.y });
        }}
        onPointerUp={() => (drag.current = null)}
        onDoubleClick={() => run("playPause")}
      >
        <video
          ref={video}
          src={url}
          preload="auto"
          className="absolute inset-0 h-full w-full object-contain"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
          onSeeked={(e) => setTime(e.currentTarget.currentTime)}
        />
        {zoom > 1 && (
          <span className="absolute top-3 right-3 rounded-md bg-black/60 px-2 py-0.5 text-xs text-white tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
        )}
      </div>

      <div className="space-y-2 px-6 pt-3 pb-5">
        <input
          type="range"
          aria-label="Posizione nel video"
          min={0}
          max={duration || 0}
          step={1 / fps}
          value={Math.min(time, duration || 0)}
          onChange={(e) => seek(Number(e.target.value))}
          className="w-full accent-[var(--brand-orange)]"
        />
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => run("jumpBack")} title={hint("jumpBack", "Indietro 5 s")} aria-label="Indietro 5 secondi" className="px-2.5">
            <Rewind className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => run("frameBack")} title={hint("frameBack", "Fotogramma indietro")} aria-label="Fotogramma indietro" className="px-2.5">
            <ChevronFirst className="h-4 w-4" />
          </Button>
          <Button onClick={() => run("playPause")} title={hint("playPause", playing ? "Pausa" : "Play")} aria-label={playing ? "Pausa" : "Play"} className="w-12">
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button variant="outline" onClick={() => run("frameForward")} title={hint("frameForward", "Fotogramma avanti")} aria-label="Fotogramma avanti" className="px-2.5">
            <ChevronLast className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => run("jumpForward")} title={hint("jumpForward", "Avanti 5 s")} aria-label="Avanti 5 secondi" className="px-2.5">
            <FastForward className="h-4 w-4" />
          </Button>

          <div className="ml-3 font-mono text-sm tabular-nums" aria-live="off">
            {formatTimecode(time)} <span className="text-muted-foreground">/ {formatTimecode(duration)}</span>
          </div>
          <div className="font-mono text-xs text-muted-foreground tabular-nums" title={`${fps} fotogrammi al secondo`}>
            F {frame}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Velocità
              <select
                value={rate}
                onChange={(e) => {
                  const r = Number(e.target.value);
                  if (video.current) video.current.playbackRate = r;
                  setRate(r);
                }}
                className="h-8 rounded-md border border-input bg-card px-1.5 text-xs text-foreground"
              >
                {PLAYBACK_RATES.map((r) => (
                  <option key={r} value={r}>
                    {String(r).replace(".", ",")}×
                  </option>
                ))}
              </select>
            </label>
            <Button variant="outline" onClick={() => run("zoomOut")} title={hint("zoomOut", "Riduci")} aria-label="Riduci" className="px-2.5" disabled={zoom <= 1}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => run("zoomIn")} title={hint("zoomIn", "Ingrandisci")} aria-label="Ingrandisci" className="px-2.5" disabled={zoom >= MAX_ZOOM}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
