"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, Loader2, Minus, Plus, RefreshCw, Timer, Trash2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { parseDecimal, type Option } from "@/lib/hub/fields";
import { formatClock, formatSetShort, groupByExercise, totalVolume } from "@/lib/hub/workout";
import {
  addSet,
  deleteSet,
  finishSession,
  updateSet,
  updateTemplateFromSession,
  type SetRow,
} from "@/app/(app)/hub/workout-actions";

type PreviousSet = { ripetizioni: number | null; carico_kg: number | null };
type LocalSet = SetRow & { kgText: string; repsText: string };

const DEFAULT_REST_S = 90;

/** Orologio letto solo dentro eventi e timer, mai durante il disegno della pagina. */
function clockNow(): number {
  return Date.now();
}

const numInput =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2 text-center text-sm tabular-nums outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 max-md:h-11 max-md:text-base dark:bg-input/30";

function toLocal(s: SetRow): LocalSet {
  return {
    ...s,
    kgText: s.carico_kg == null ? "" : String(s.carico_kg).replace(".", ","),
    repsText: s.ripetizioni == null ? "" : String(s.ripetizioni),
  };
}

function parseKg(text: string): number | null {
  const n = parseDecimal(text);
  return n === null || n < 0 || n > 1000 ? null : n;
}

function parseReps(text: string): number | null {
  const n = parseDecimal(text);
  return n === null || n < 0 || n > 1000 ? null : Math.round(n);
}

type WakeLockLike = { release: () => Promise<void> };
type NavigatorWithWakeLock = Navigator & { wakeLock?: { request: (type: "screen") => Promise<WakeLockLike> } };

/**
 * Allenamento dal vivo: le serie si modificano qui, senza finestre. Per ogni
 * serie vedi cosa hai fatto l'ultima volta; spuntandola parte il recupero.
 * Il cronometro conta dall'inizio dell'allenamento e lo schermo resta acceso.
 */
export function WorkoutLogger({
  sessionId,
  startedAt,
  durationMin,
  hasTemplate,
  initialSets,
  exercises,
  previous,
  rest,
}: {
  sessionId: string;
  startedAt: string;
  durationMin: number | null;
  hasTemplate: boolean;
  initialSets: SetRow[];
  exercises: Option[];
  previous: Record<string, PreviousSet[]>;
  rest: Record<string, number>;
}) {
  const router = useRouter();
  const [sets, setSets] = useState<LocalSet[]>(() => initialSets.map(toLocal));
  const [now, setNow] = useState(() => clockNow());
  const [restEnd, setRestEnd] = useState<number | null>(null);
  const [restTotal, setRestTotal] = useState(DEFAULT_REST_S);
  const [newExercise, setNewExercise] = useState("");
  const [isPending, startTransition] = useTransition();
  const restEndRef = useRef<number | null>(null);
  const finished = durationMin !== null;

  const names = useMemo(() => Object.fromEntries(exercises.map((e) => [e.value, e.label])), [exercises]);
  const groups = useMemo(() => groupByExercise(sets), [sets]);
  const done = sets.filter((s) => s.fatta).length;
  const volume = Math.round(totalVolume(sets.map((s) => ({ ...s, carico_kg: parseKg(s.kgText), ripetizioni: parseReps(s.repsText) }))));

  // Un solo orologio per cronometro e recupero.
  useEffect(() => {
    const t = setInterval(() => {
      const n = clockNow();
      setNow(n);
      const end = restEndRef.current;
      if (end !== null && n >= end) {
        restEndRef.current = null;
        setRestEnd(null);
        toast.success("Recupero finito: tocca alla serie successiva");
        try {
          navigator.vibrate?.([200, 100, 200]);
        } catch {
          // Vibrazione non disponibile: resta la notifica a schermo.
        }
      }
    }, 500);
    return () => clearInterval(t);
  }, []);

  // Schermo acceso durante l'allenamento (se il dispositivo lo consente).
  useEffect(() => {
    if (finished) return;
    let lock: WakeLockLike | null = null;
    let cancelled = false;
    (navigator as NavigatorWithWakeLock).wakeLock
      ?.request("screen")
      .then((l) => {
        if (cancelled) void l.release();
        else lock = l;
      })
      .catch(() => {
        // Non concesso: lo schermo seguirà le impostazioni del telefono.
      });
    return () => {
      cancelled = true;
      void lock?.release().catch(() => undefined);
    };
  }, [finished]);

  function startRest(seconds: number) {
    const end = clockNow() + seconds * 1000;
    restEndRef.current = end;
    setRestEnd(end);
    setRestTotal(seconds);
  }

  function stopRest() {
    restEndRef.current = null;
    setRestEnd(null);
  }

  const patch = useCallback((id: string, p: Partial<LocalSet>) => {
    setSets((prev) => prev.map((s) => (s.id === id ? { ...s, ...p } : s)));
  }, []);

  async function save(s: LocalSet, p: Partial<LocalSet> = {}) {
    const merged = { ...s, ...p };
    const res = await updateSet({
      id: s.id,
      ripetizioni: parseReps(merged.repsText),
      carico_kg: parseKg(merged.kgText),
      fatta: merged.fatta,
    });
    if (!res.ok) toast.error("Non è stato possibile salvare la serie.");
  }

  function toggleDone(s: LocalSet, indexInGroup: number) {
    const fatta = !s.fatta;
    let { kgText, repsText } = s;
    if (fatta) {
      // Se non hai scritto nulla, vale quello che avevi pianificato o fatto l'ultima volta.
      const prev = previous[s.exercise_id]?.[indexInGroup];
      if (kgText === "" && prev?.carico_kg != null) kgText = String(prev.carico_kg).replace(".", ",");
      if (repsText === "" && prev?.ripetizioni != null) repsText = String(prev.ripetizioni);
      startRest(rest[s.exercise_id] ?? DEFAULT_REST_S);
    } else {
      stopRest();
    }
    patch(s.id, { fatta, kgText, repsText });
    void save(s, { fatta, kgText, repsText });
  }

  function add(exerciseId: string) {
    startTransition(async () => {
      const res = await addSet(sessionId, exerciseId);
      if (!res.ok) return void toast.error(res.message);
      setSets((prev) => [...prev, toLocal(res.set)]);
    });
  }

  function remove(s: LocalSet) {
    startTransition(async () => {
      const res = await deleteSet(s.id);
      if (!res.ok) return void toast.error("Non è stato possibile togliere la serie.");
      setSets((prev) => prev.filter((x) => x.id !== s.id));
    });
  }

  function finish() {
    const elapsedMin = Math.max(1, Math.round((clockNow() - new Date(startedAt).getTime()) / 60000));
    const minutes = Math.min(600, elapsedMin);
    startTransition(async () => {
      const res = await finishSession(sessionId, minutes);
      if (!res.ok) return void toast.error("Non è stato possibile concludere l'allenamento.");
      stopRest();
      toast.success(`Allenamento concluso: ${minutes} minuti`);
      router.refresh();
    });
  }

  function syncTemplate() {
    startTransition(async () => {
      const res = await updateTemplateFromSession(sessionId);
      if (!res.ok) return void toast.error(res.message ?? "Non è stato possibile aggiornare la scheda.");
      toast.success(res.updated ? `Scheda aggiornata (${res.updated} esercizi)` : "Nessun carico da riportare nella scheda.");
      router.refresh();
    });
  }

  const elapsedSec = Math.floor((now - new Date(startedAt).getTime()) / 1000);
  const showClock = !finished && elapsedSec >= 0 && elapsedSec < 6 * 3600;
  const restLeft = restEnd === null ? 0 : Math.max(0, Math.ceil((restEnd - now) / 1000));

  return (
    <section className="space-y-4" aria-label="Allenamento">
      {/* Barra sempre visibile: tempo, avanzamento e recupero. */}
      <div className="sticky top-0 z-20 -mx-1 space-y-2 rounded-xl border border-border bg-background/95 p-3 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {showClock && (
            <span className="inline-flex items-center gap-1.5 font-semibold tabular-nums">
              <Clock className="h-4 w-4 text-primary-text" /> {formatClock(elapsedSec)}
            </span>
          )}
          {finished && (
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <Trophy className="h-4 w-4 text-primary-text" /> Concluso · {durationMin} min
            </span>
          )}
          <span className="text-muted-foreground">
            Serie fatte <strong className="text-foreground">{done}</strong> di {sets.length}
          </span>
          <span className="text-muted-foreground">
            Volume <strong className="text-foreground tabular-nums">{volume.toLocaleString("it-IT")} kg</strong>
          </span>
        </div>
        {restEnd !== null && (
          <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2" role="timer" aria-live="off">
            <Timer className="h-4 w-4 shrink-0 text-primary-text" />
            <span className="text-lg font-semibold tabular-nums">{formatClock(restLeft)}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-primary/20">
              <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${Math.min(100, (restLeft / Math.max(1, restTotal)) * 100)}%` }} />
            </div>
            <Button type="button" size="icon-sm" variant="ghost" aria-label="Togli 15 secondi" className="max-md:size-11" onClick={() => startRest(Math.max(5, restLeft - 15))}>
              <Minus className="h-4 w-4" />
            </Button>
            <Button type="button" size="icon-sm" variant="ghost" aria-label="Aggiungi 15 secondi" className="max-md:size-11" onClick={() => startRest(restLeft + 15)}>
              <Plus className="h-4 w-4" />
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={stopRest} className="max-md:min-h-11">
              Salta
            </Button>
          </div>
        )}
      </div>

      {groups.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nessun esercizio ancora: aggiungine uno qui sotto.
        </p>
      )}

      {groups.map((g) => (
        <div key={g.exercise_id} className="rounded-xl border border-border bg-card/40 p-3 sm:p-4">
          <h3 className="mb-2 text-sm font-semibold">{names[g.exercise_id] ?? "Esercizio"}</h3>
          <div className="grid grid-cols-[1.75rem_1fr_4.25rem_4.25rem_2.75rem_1.75rem] items-center gap-x-1.5 gap-y-1.5 sm:grid-cols-[2rem_1fr_5.5rem_5.5rem_3rem_2rem] sm:gap-x-2">
            <span className="text-[11px] text-muted-foreground">Serie</span>
            <span className="text-[11px] text-muted-foreground">Ultima volta</span>
            <span className="text-center text-[11px] text-muted-foreground">kg</span>
            <span className="text-center text-[11px] text-muted-foreground">Rip.</span>
            <span className="text-center text-[11px] text-muted-foreground">Fatta</span>
            <span />
            {g.sets.map((s, i) => {
              const prev = previous[g.exercise_id]?.[i];
              return (
                <SetLine
                  key={s.id}
                  index={i + 1}
                  set={s}
                  prevText={prev ? formatSetShort(prev) : "—"}
                  onChange={(p) => patch(s.id, p)}
                  onBlur={() => void save(s)}
                  onToggle={() => toggleDone(s, i)}
                  onRemove={() => remove(s)}
                  disabled={isPending}
                />
              );
            })}
          </div>
          <Button type="button" variant="ghost" size="sm" disabled={isPending} onClick={() => add(g.exercise_id)} className="mt-2 max-md:min-h-11">
            <Plus className="mr-1 h-4 w-4" /> Aggiungi serie
          </Button>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/40 p-3">
        <label className="min-w-48 flex-1 text-xs text-muted-foreground">
          <span className="sr-only">Esercizio da aggiungere</span>
          <select
            value={newExercise}
            onChange={(e) => setNewExercise(e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground max-md:min-h-11 max-md:text-base"
          >
            <option value="">Aggiungi un esercizio…</option>
            {exercises.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <Button
          type="button"
          variant="outline"
          disabled={!newExercise || isPending}
          onClick={() => {
            add(newExercise);
            setNewExercise("");
          }}
          className="max-md:min-h-11"
        >
          <Plus className="mr-1 h-4 w-4" /> Aggiungi
        </Button>
        {exercises.length === 0 && (
          <p className="w-full text-xs text-muted-foreground">Non hai ancora esercizi: creali in Benessere → Esercizi (c&apos;è il pulsante con quelli più comuni).</p>
        )}
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        {hasTemplate && (
          <Button type="button" variant="outline" onClick={syncTemplate} disabled={isPending} className="max-md:min-h-11">
            <RefreshCw className="mr-1.5 h-4 w-4" /> Porta i carichi di oggi nella scheda
          </Button>
        )}
        {!finished && (
          <Button type="button" onClick={finish} disabled={isPending} className="max-md:min-h-11">
            {isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
            Concludi allenamento
          </Button>
        )}
      </div>
    </section>
  );
}

function SetLine({
  index,
  set,
  prevText,
  onChange,
  onBlur,
  onToggle,
  onRemove,
  disabled,
}: {
  index: number;
  set: LocalSet;
  prevText: string;
  onChange: (p: Partial<LocalSet>) => void;
  onBlur: () => void;
  onToggle: () => void;
  onRemove: () => void;
  disabled: boolean;
}) {
  return (
    <>
      <span className={cn("text-sm font-medium tabular-nums", set.fatta ? "text-primary-text" : "text-muted-foreground")}>{index}</span>
      <span className="truncate text-xs text-muted-foreground tabular-nums">{prevText}</span>
      <input
        aria-label={`Serie ${index}: chili`}
        inputMode="decimal"
        value={set.kgText}
        onChange={(e) => onChange({ kgText: e.target.value })}
        onBlur={onBlur}
        className={numInput}
        placeholder="0"
      />
      <input
        aria-label={`Serie ${index}: ripetizioni`}
        inputMode="numeric"
        value={set.repsText}
        onChange={(e) => onChange({ repsText: e.target.value })}
        onBlur={onBlur}
        className={numInput}
        placeholder="0"
      />
      <button
        type="button"
        role="checkbox"
        aria-checked={set.fatta}
        aria-label={`Serie ${index} fatta`}
        onClick={onToggle}
        className={cn(
          "grid h-9 w-full place-items-center rounded-lg border transition-colors max-md:h-11",
          set.fatta ? "border-primary bg-primary text-primary-foreground" : "border-input text-transparent hover:border-primary/50",
        )}
      >
        <Check className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label={`Togli la serie ${index}`}
        onClick={onRemove}
        disabled={disabled}
        className="grid h-9 w-full place-items-center rounded-lg text-muted-foreground hover:text-destructive max-md:h-11"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </>
  );
}
