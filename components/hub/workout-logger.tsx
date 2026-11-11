"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ChevronUp, Clock, Loader2, Minus, Play, Plus, RefreshCw, Square, StickyNote, Timer, Trash2, Trophy, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { parseDecimal, type Option } from "@/lib/hub/fields";
import type { SetRow } from "@/lib/hub/set-row";
import type { PreviousSet } from "@/lib/hub/summary";
import {
  SET_KINDS,
  formatClock,
  formatDurationField,
  formatSetShort,
  groupByExercise,
  parseDurationInput,
  repsHint,
  setLabels,
  totalVolume,
  type SetKind,
} from "@/lib/hub/workout";
import {
  addSet,
  createExercise,
  deleteSet,
  discardSession,
  finishSession,
  moveExercise,
  removeExercise,
  updateSet,
  updateTemplateFromSession,
  type SessionRecord,
} from "@/app/(app)/hub/workout-actions";

type LocalSet = SetRow & { kgText: string; repsText: string; durText: string };
type Measure = "peso_rip" | "durata";

const DEFAULT_REST_S = 90;
const RECORD_LABEL: Record<SessionRecord["kinds"][number], string> = { peso: "carico", massimale: "massimale stimato", volume: "volume" };

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
    durText: formatDurationField(s.durata_s),
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
 * Allenamento dal vivo, sul modello di Lyfta: per ogni serie vedi cosa hai
 * fatto l'ultima volta e cosa prevede la scheda; spuntandola parte il recupero
 * dell'esercizio. Il numero della serie si tocca per cambiarne il tipo
 * (riscaldamento, drop, cedimento). Lo schermo resta acceso.
 */
export function WorkoutLogger({
  sessionId,
  startedAt,
  durationMin,
  hasTemplate,
  initialSets,
  exercises,
  measures,
  previous,
}: {
  sessionId: string;
  startedAt: string;
  durationMin: number | null;
  hasTemplate: boolean;
  initialSets: SetRow[];
  exercises: Option[];
  measures: Record<string, string>;
  previous: Record<string, PreviousSet[]>;
}) {
  const router = useRouter();
  const [sets, setSets] = useState<LocalSet[]>(() => initialSets.map(toLocal));
  const [library, setLibrary] = useState<Option[]>(exercises);
  const [measure, setMeasure] = useState<Record<string, string>>(measures);
  const [now, setNow] = useState(() => clockNow());
  const [restEnd, setRestEnd] = useState<number | null>(null);
  const [restTotal, setRestTotal] = useState(DEFAULT_REST_S);
  const [stopwatch, setStopwatch] = useState<{ id: string; since: number } | null>(null);
  const [search, setSearch] = useState("");
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ minutes: number; sets: number; volume: number; records: SessionRecord[] } | null>(null);
  const [isPending, startTransition] = useTransition();
  const restEndRef = useRef<number | null>(null);
  const finished = durationMin !== null || summary !== null;

  const names = useMemo(() => Object.fromEntries(library.map((e) => [e.value, e.label])), [library]);
  const groups = useMemo(() => groupByExercise(sets), [sets]);
  const done = sets.filter((s) => s.fatta).length;
  const undone = sets.length - done;
  const volume = Math.round(
    totalVolume(sets.map((s) => ({ ...s, carico_kg: parseKg(s.kgText), ripetizioni: parseReps(s.repsText) }))),
  );

  // Un solo orologio per cronometro, recupero e cronometro delle serie a tempo.
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
      tipo: merged.tipo,
      durata_s: parseDurationInput(merged.durText),
    });
    if (!res.ok) toast.error("Non è stato possibile salvare la serie.");
  }

  /** La serie "gemella" dell'ultima volta: stessa posizione tra i riscaldamenti o tra le serie di lavoro. */
  function previousFor(exerciseId: string, group: LocalSet[], index: number): PreviousSet | undefined {
    const warm = group[index].tipo === "riscaldamento";
    const pos = group.slice(0, index).filter((x) => (x.tipo === "riscaldamento") === warm).length;
    return (previous[exerciseId] ?? []).filter((p) => (p.tipo === "riscaldamento") === warm)[pos];
  }

  function toggleDone(s: LocalSet, group: LocalSet[], indexInGroup: number) {
    const fatta = !s.fatta;
    let { kgText, repsText, durText } = s;
    if (fatta) {
      // Se non hai scritto nulla, vale quello che avevi fatto l'ultima volta o che prevede la scheda.
      const prev = previousFor(s.exercise_id, group, indexInGroup);
      if (kgText === "" && prev?.carico_kg != null) kgText = String(prev.carico_kg).replace(".", ",");
      if (repsText === "") {
        const guess = prev?.ripetizioni ?? s.rip_min;
        if (guess != null) repsText = String(guess);
      }
      if (durText === "" && prev?.durata_s != null) durText = formatDurationField(prev.durata_s);
      if (stopwatch?.id === s.id) setStopwatch(null);

      // Recupero dell'esercizio: 0 = nessuno. In una superserie si passa subito all'altro esercizio.
      const rest = s.recupero_s ?? DEFAULT_REST_S;
      const inSuperset = s.superset != null && sets.some((x) => x.superset === s.superset && x.exercise_id !== s.exercise_id && !x.fatta);
      if (rest > 0 && !inSuperset) startRest(rest);
      else stopRest();
    } else {
      stopRest();
    }
    patch(s.id, { fatta, kgText, repsText, durText });
    void save(s, { fatta, kgText, repsText, durText });
  }

  function cycleKind(s: LocalSet) {
    const order: SetKind[] = SET_KINDS.map((k) => k.value);
    const next = order[(order.indexOf(s.tipo) + 1) % order.length];
    patch(s.id, { tipo: next });
    void save(s, { tipo: next });
  }

  function toggleStopwatch(s: LocalSet) {
    if (stopwatch?.id === s.id) {
      const secs = Math.max(1, Math.round((clockNow() - stopwatch.since) / 1000));
      const durText = formatDurationField(secs);
      setStopwatch(null);
      patch(s.id, { durText });
      void save(s, { durText });
    } else {
      setStopwatch({ id: s.id, since: clockNow() });
    }
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

  function dropExercise(exerciseId: string) {
    startTransition(async () => {
      const res = await removeExercise(sessionId, exerciseId);
      setConfirmRemove(null);
      if (!res.ok) return void toast.error("Non è stato possibile togliere l'esercizio.");
      setSets((prev) => prev.filter((x) => x.exercise_id !== exerciseId));
    });
  }

  function shiftExercise(exerciseId: string, direction: "up" | "down") {
    startTransition(async () => {
      const res = await moveExercise(sessionId, exerciseId, direction);
      if (!res.ok) return void toast.error("Non è stato possibile spostare l'esercizio.");
      const order = res.order;
      if (order) setSets((prev) => prev.map((s) => (order[s.id] !== undefined ? { ...s, ordine: order[s.id] } : s)));
    });
  }

  function pickExercise(exerciseId: string) {
    setSearch("");
    add(exerciseId);
  }

  function createAndAdd(nome: string) {
    startTransition(async () => {
      const res = await createExercise(nome, "peso_rip");
      if (!res.ok) return void toast.error(res.message);
      setLibrary((prev) => (prev.some((o) => o.value === res.id) ? prev : [...prev, { value: res.id, label: res.nome }]));
      setMeasure((prev) => ({ ...prev, [res.id]: res.misura }));
      setSearch("");
      const added = await addSet(sessionId, res.id);
      if (!added.ok) return void toast.error(added.message);
      setSets((prev) => [...prev, toLocal(added.set)]);
    });
  }

  function finish(removeUndone: boolean) {
    const elapsedMin = Math.max(1, Math.round((clockNow() - new Date(startedAt).getTime()) / 60000));
    const minutes = Math.min(600, elapsedMin);
    startTransition(async () => {
      const res = await finishSession(sessionId, minutes, removeUndone);
      setConfirmFinish(false);
      if (!res.ok) return void toast.error("Non è stato possibile concludere l'allenamento.");
      stopRest();
      if (removeUndone) setSets((prev) => prev.filter((s) => s.fatta));
      setSummary({ minutes, sets: res.sets, volume: res.volume, records: res.records });
      router.refresh();
    });
  }

  function requestFinish() {
    if (undone > 0) return setConfirmFinish(true);
    finish(false);
  }

  function markAllDoneAndFinish() {
    const pending = sets.filter((s) => !s.fatta);
    for (const s of pending) patch(s.id, { fatta: true });
    startTransition(async () => {
      await Promise.all(pending.map((s) => save(s, { fatta: true })));
      finish(false);
    });
  }

  function discard() {
    startTransition(async () => {
      const res = await discardSession(sessionId);
      setConfirmDiscard(false);
      if (!res.ok) return void toast.error("Non è stato possibile scartare l'allenamento.");
      toast.success("Allenamento scartato (è nel cestino)");
      router.push("/benessere/allenati");
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
  const query = search.trim().toLowerCase();
  const inWorkout = new Set(groups.map((g) => g.exercise_id));
  const matches = query ? library.filter((o) => o.label.toLowerCase().includes(query)).slice(0, 8) : [];
  const exactMatch = library.some((o) => o.label.toLowerCase() === query);

  return (
    <section className="space-y-4" aria-label="Allenamento">
      {/* Barra sempre visibile: tempo, avanzamento, recupero e fine. */}
      <div className="sticky top-0 z-20 -mx-1 space-y-2 rounded-xl border border-border bg-background/95 p-3 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {showClock && (
            <span className="inline-flex items-center gap-1.5 font-semibold tabular-nums">
              <Clock className="h-4 w-4 text-primary-text" /> {formatClock(elapsedSec)}
            </span>
          )}
          {finished && (
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <Trophy className="h-4 w-4 text-primary-text" /> Concluso · {summary?.minutes ?? durationMin} min
            </span>
          )}
          <span className="text-muted-foreground">
            Serie fatte <strong className="text-foreground">{done}</strong> di {sets.length}
          </span>
          <span className="text-muted-foreground">
            Volume <strong className="text-foreground tabular-nums">{volume.toLocaleString("it-IT")} kg</strong>
          </span>
          {!finished && (
            <Button type="button" size="sm" onClick={requestFinish} disabled={isPending} className="ml-auto max-md:min-h-11">
              {isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
              Concludi
            </Button>
          )}
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

      {summary && (
        <div className="space-y-3 rounded-xl border border-primary/40 bg-primary/5 p-4" role="status">
          <p className="flex items-center gap-2 text-base font-semibold">
            <Trophy className="h-5 w-5 text-primary-text" /> Allenamento concluso
          </p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xl font-semibold tabular-nums">{summary.minutes}</p>
              <p className="text-[11px] text-muted-foreground">minuti</p>
            </div>
            <div>
              <p className="text-xl font-semibold tabular-nums">{summary.sets}</p>
              <p className="text-[11px] text-muted-foreground">serie</p>
            </div>
            <div>
              <p className="text-xl font-semibold tabular-nums">{summary.volume.toLocaleString("it-IT")}</p>
              <p className="text-[11px] text-muted-foreground">kg sollevati</p>
            </div>
          </div>
          {summary.records.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {summary.records.map((r) => (
                <li key={r.exercise_id}>
                  🏆 <strong>{names[r.exercise_id] ?? "Esercizio"}</strong>: nuovo record di {r.kinds.map((k) => RECORD_LABEL[k]).join(", ")}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">Nessun record questa volta: la costanza conta più di tutto.</p>
          )}
        </div>
      )}

      {groups.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nessun esercizio ancora: cercane uno qui sotto per iniziare.
        </p>
      )}

      {groups.map((g, gi) => (
        <ExerciseCard
          key={g.exercise_id}
          name={names[g.exercise_id] ?? "Esercizio"}
          sets={g.sets}
          kind={measure[g.exercise_id] === "durata" ? "durata" : "peso_rip"}
          index={gi}
          total={groups.length}
          disabled={isPending}
          stopwatch={stopwatch}
          now={now}
          previousFor={(i) => previousFor(g.exercise_id, g.sets, i)}
          onChange={patch}
          onSave={(s) => void save(s)}
          onToggle={(s, i) => toggleDone(s, g.sets, i)}
          onCycleKind={cycleKind}
          onStopwatch={toggleStopwatch}
          onRemoveSet={remove}
          onAddSet={() => add(g.exercise_id)}
          onMove={(d) => shiftExercise(g.exercise_id, d)}
          onRemoveExercise={() => setConfirmRemove(g.exercise_id)}
        />
      ))}

      <div className="space-y-2 rounded-xl border border-border bg-card/40 p-3">
        <label className="block text-xs text-muted-foreground">
          <span className="sr-only">Aggiungi un esercizio</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Aggiungi un esercizio: scrivi per cercare o creare…"
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 max-md:h-11 max-md:text-base"
          />
        </label>
        {query && (
          <ul className="space-y-1">
            {matches.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => pickExercise(o.value)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-muted/50 max-md:min-h-11"
                >
                  <span>{o.label}</span>
                  {inWorkout.has(o.value) && <span className="text-[11px] text-muted-foreground">già presente</span>}
                </button>
              </li>
            ))}
            {!exactMatch && (
              <li>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => createAndAdd(search.trim())}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-primary-text hover:bg-muted/50 max-md:min-h-11"
                >
                  <Plus className="h-4 w-4" /> Crea «{search.trim()}»
                </button>
              </li>
            )}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        {!finished ? (
          <Button type="button" variant="ghost" onClick={() => setConfirmDiscard(true)} disabled={isPending} className="text-destructive max-md:min-h-11">
            <X className="mr-1.5 h-4 w-4" /> Scarta allenamento
          </Button>
        ) : (
          <span />
        )}
        <div className="flex flex-wrap justify-end gap-2">
          {hasTemplate && (
            <Button type="button" variant="outline" onClick={syncTemplate} disabled={isPending} className="max-md:min-h-11">
              <RefreshCw className="mr-1.5 h-4 w-4" /> Porta i carichi di oggi nella scheda
            </Button>
          )}
          {!finished && (
            <Button type="button" onClick={requestFinish} disabled={isPending} className="max-md:min-h-11">
              {isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
              Concludi allenamento
            </Button>
          )}
        </div>
      </div>

      <Dialog open={confirmFinish} onOpenChange={setConfirmFinish}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ci sono {undone} serie non fatte</DialogTitle>
            <DialogDescription>Puoi toglierle dall&apos;allenamento oppure segnarle tutte come fatte.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmFinish(false)} disabled={isPending}>
              Torna all&apos;allenamento
            </Button>
            <Button variant="outline" onClick={markAllDoneAndFinish} disabled={isPending}>
              Segna tutte come fatte
            </Button>
            <Button onClick={() => finish(true)} disabled={isPending}>
              Togli quelle non fatte e concludi
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scartare questo allenamento?</DialogTitle>
            <DialogDescription>Finisce nel cestino: se cambi idea lo recuperi da lì.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmDiscard(false)} disabled={isPending}>
              Annulla
            </Button>
            <Button variant="destructive" onClick={discard} disabled={isPending}>
              Sì, scarta
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmRemove !== null} onOpenChange={(o) => !o && setConfirmRemove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Togliere l&apos;esercizio dall&apos;allenamento?</DialogTitle>
            <DialogDescription>Le sue serie di oggi vengono eliminate. La scheda non cambia.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmRemove(null)} disabled={isPending}>
              Annulla
            </Button>
            <Button variant="destructive" onClick={() => confirmRemove && dropExercise(confirmRemove)} disabled={isPending}>
              Sì, toglilo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function ExerciseCard({
  name,
  sets,
  kind,
  index,
  total,
  disabled,
  stopwatch,
  now,
  previousFor,
  onChange,
  onSave,
  onToggle,
  onCycleKind,
  onStopwatch,
  onRemoveSet,
  onAddSet,
  onMove,
  onRemoveExercise,
}: {
  name: string;
  sets: LocalSet[];
  kind: Measure;
  index: number;
  total: number;
  disabled: boolean;
  stopwatch: { id: string; since: number } | null;
  now: number;
  previousFor: (i: number) => PreviousSet | undefined;
  onChange: (id: string, p: Partial<LocalSet>) => void;
  onSave: (s: LocalSet) => void;
  onToggle: (s: LocalSet, i: number) => void;
  onCycleKind: (s: LocalSet) => void;
  onStopwatch: (s: LocalSet) => void;
  onRemoveSet: (s: LocalSet) => void;
  onAddSet: () => void;
  onMove: (d: "up" | "down") => void;
  onRemoveExercise: () => void;
}) {
  const [showNote, setShowNote] = useState(false);
  const first = sets[0];
  const note = sets.find((s) => s.nota_esercizio)?.nota_esercizio ?? null;
  const rest = first?.recupero_s;
  const superset = first?.superset;
  const labels = setLabels(sets.map((s) => s.tipo));
  const grid = "grid-cols-[2.25rem_1fr_4.25rem_4.25rem_2.75rem_1.75rem] sm:grid-cols-[2.5rem_1fr_5.5rem_5.5rem_3rem_2rem]";

  return (
    <div className="rounded-xl border border-border bg-card/40 p-3 sm:p-4">
      <div className="mb-2 flex items-start gap-1">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">{name}</h3>
          <p className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
            {rest != null && <span>{rest === 0 ? "Nessun recupero" : `Recupero ${formatClock(rest)}`}</span>}
            {superset != null && <span className="rounded-full bg-primary/10 px-1.5 text-primary-text">Superserie {superset}</span>}
            {kind === "durata" && <span>A tempo</span>}
          </p>
        </div>
        {note && (
          <Button type="button" size="icon-sm" variant={showNote ? "secondary" : "ghost"} aria-label="Note dell'esercizio" aria-expanded={showNote} onClick={() => setShowNote((v) => !v)} className="max-md:size-11">
            <StickyNote className="h-4 w-4" />
          </Button>
        )}
        <Button type="button" size="icon-sm" variant="ghost" aria-label="Sposta su" disabled={disabled || index === 0} onClick={() => onMove("up")} className="max-md:size-11">
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button type="button" size="icon-sm" variant="ghost" aria-label="Sposta giù" disabled={disabled || index === total - 1} onClick={() => onMove("down")} className="max-md:size-11">
          <ChevronDown className="h-4 w-4" />
        </Button>
        <Button type="button" size="icon-sm" variant="ghost" aria-label="Togli esercizio" disabled={disabled} onClick={onRemoveExercise} className="text-muted-foreground hover:text-destructive max-md:size-11">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {note && showNote && <p className="mb-3 whitespace-pre-line rounded-lg bg-muted/40 p-3 text-xs leading-relaxed">{note}</p>}

      <div className={cn("grid items-center gap-x-1.5 gap-y-1.5 sm:gap-x-2", grid)}>
        <span className="text-[11px] text-muted-foreground">Serie</span>
        <span className="text-[11px] text-muted-foreground">Ultima volta</span>
        {kind === "durata" ? (
          <span className="col-span-2 text-center text-[11px] text-muted-foreground">Durata</span>
        ) : (
          <>
            <span className="text-center text-[11px] text-muted-foreground">kg</span>
            <span className="text-center text-[11px] text-muted-foreground">Rip.</span>
          </>
        )}
        <span className="text-center text-[11px] text-muted-foreground">Fatta</span>
        <span />
        {sets.map((s, i) => {
          const prev = previousFor(i);
          const running = stopwatch?.id === s.id;
          const prevText = prev ? (kind === "durata" ? (prev.durata_s != null ? formatClock(prev.durata_s) : "—") : formatSetShort(prev)) : "—";
          return (
            <SetLine
              key={s.id}
              label={labels[i]}
              set={s}
              kind={kind}
              prevText={prevText}
              prevKg={prev?.carico_kg ?? null}
              prevReps={prev?.ripetizioni ?? null}
              running={running}
              liveText={running ? formatClock(Math.max(0, Math.floor((now - stopwatch.since) / 1000))) : null}
              onChange={(p) => onChange(s.id, p)}
              onBlur={() => onSave(s)}
              onToggle={() => onToggle(s, i)}
              onCycleKind={() => onCycleKind(s)}
              onStopwatch={() => onStopwatch(s)}
              onRemove={() => onRemoveSet(s)}
              disabled={disabled}
            />
          );
        })}
      </div>
      <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={onAddSet} className="mt-2 max-md:min-h-11">
        <Plus className="mr-1 h-4 w-4" /> Aggiungi serie
      </Button>
      {index === 0 && sets.every((s) => s.tipo === "normale") && (
        <p className="mt-1 text-[11px] text-muted-foreground">Tocca il numero della serie per cambiarne il tipo: R riscaldamento, D drop set, C al cedimento.</p>
      )}
    </div>
  );
}

function SetLine({
  label,
  set,
  kind,
  prevText,
  prevKg,
  prevReps,
  running,
  liveText,
  onChange,
  onBlur,
  onToggle,
  onCycleKind,
  onStopwatch,
  onRemove,
  disabled,
}: {
  label: string;
  set: LocalSet;
  kind: Measure;
  prevText: string;
  prevKg: number | null;
  prevReps: number | null;
  running: boolean;
  liveText: string | null;
  onChange: (p: Partial<LocalSet>) => void;
  onBlur: () => void;
  onToggle: () => void;
  onCycleKind: () => void;
  onStopwatch: () => void;
  onRemove: () => void;
  disabled: boolean;
}) {
  const special = set.tipo !== "normale";
  const hint = repsHint(set.rip_min, set.rip_max);
  const kindLabel = SET_KINDS.find((k) => k.value === set.tipo)?.label ?? "";
  return (
    <>
      <button
        type="button"
        onClick={onCycleKind}
        aria-label={`Serie ${label}: ${kindLabel}. Tocca per cambiare tipo`}
        title="Tocca per cambiare il tipo di serie"
        className={cn(
          "grid h-9 w-full place-items-center rounded-lg text-sm font-semibold tabular-nums max-md:h-11",
          set.tipo === "riscaldamento" && "bg-amber-500/15 text-amber-600 dark:text-amber-400",
          set.tipo === "drop" && "bg-sky-500/15 text-sky-600 dark:text-sky-400",
          set.tipo === "cedimento" && "bg-rose-500/15 text-rose-600 dark:text-rose-400",
          !special && (set.fatta ? "text-primary-text" : "text-muted-foreground"),
        )}
      >
        {label}
      </button>
      <span className="truncate text-xs text-muted-foreground tabular-nums">{prevText}</span>
      {kind === "durata" ? (
        <>
          <input
            aria-label={`Serie ${label}: durata (minuti:secondi)`}
            inputMode="numeric"
            value={running && liveText ? liveText : set.durText}
            readOnly={running}
            onChange={(e) => onChange({ durText: e.target.value })}
            onBlur={onBlur}
            className={numInput}
            placeholder="0:00"
          />
          <button
            type="button"
            onClick={onStopwatch}
            aria-label={running ? `Serie ${label}: ferma il cronometro` : `Serie ${label}: avvia il cronometro`}
            className={cn(
              "grid h-9 w-full place-items-center rounded-lg border max-md:h-11",
              running ? "border-primary bg-primary/10 text-primary-text" : "border-input text-muted-foreground hover:border-primary/50",
            )}
          >
            {running ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
        </>
      ) : (
        <>
          <input
            aria-label={`Serie ${label}: chili`}
            inputMode="decimal"
            value={set.kgText}
            onChange={(e) => onChange({ kgText: e.target.value })}
            onBlur={onBlur}
            className={numInput}
            placeholder={prevKg != null ? String(prevKg).replace(".", ",") : "0"}
          />
          <input
            aria-label={`Serie ${label}: ripetizioni`}
            inputMode="numeric"
            value={set.repsText}
            onChange={(e) => onChange({ repsText: e.target.value })}
            onBlur={onBlur}
            className={numInput}
            placeholder={hint || (prevReps != null ? String(prevReps) : "0")}
          />
        </>
      )}
      <button
        type="button"
        role="checkbox"
        aria-checked={set.fatta}
        aria-label={`Serie ${label} fatta`}
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
        aria-label={`Togli la serie ${label}`}
        onClick={onRemove}
        disabled={disabled}
        className="grid h-9 w-full place-items-center rounded-lg text-muted-foreground hover:text-destructive max-md:h-11"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </>
  );
}
