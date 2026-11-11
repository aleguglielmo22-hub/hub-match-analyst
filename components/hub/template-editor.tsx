"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { parseDecimal, type Option } from "@/lib/hub/fields";
import { SET_KINDS, formatClock, parseDurationInput, setLabels, type SetKind, type TemplateSet } from "@/lib/hub/workout";
import { createExercise, deleteTemplateItem, moveChild, saveTemplateItem } from "@/app/(app)/hub/workout-actions";

export type EditorItem = {
  id: string;
  exercise_id: string;
  recupero_s: number | null;
  superset: number | null;
  note: string | null;
  sets: TemplateSet[];
};

type EditSet = { t: SetKind; min: string; max: string; kg: string; dur: string };
type EditItem = {
  id: string | null;
  exercise_id: string;
  rest: string;
  superset: string;
  note: string;
  sets: EditSet[];
  dirty: boolean;
};

const REST_CHOICES = [0, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300];
const inputCls =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2 text-center text-sm tabular-nums outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 max-md:h-11 max-md:text-base dark:bg-input/30";

const txt = (n: number | null) => (n == null ? "" : String(n).replace(".", ","));

function toEdit(it: EditorItem): EditItem {
  return {
    id: it.id,
    exercise_id: it.exercise_id,
    rest: it.recupero_s == null ? "" : String(it.recupero_s),
    superset: it.superset == null ? "" : String(it.superset),
    note: it.note ?? "",
    dirty: false,
    sets: it.sets.map((s) => ({
      t: s.t,
      min: txt(s.min ?? s.rip),
      max: txt(s.min != null ? s.max : null),
      kg: txt(s.kg),
      dur: s.dur == null ? "" : formatClock(s.dur),
    })),
  };
}

function toSets(item: EditItem): TemplateSet[] {
  const int = (v: string) => {
    const n = parseDecimal(v);
    return n === null || n < 0 || n > 1000 ? null : Math.round(n);
  };
  return item.sets.map((s) => {
    const min = int(s.min);
    const max = int(s.max);
    const kg = parseDecimal(s.kg);
    return {
      t: s.t,
      rip: max == null ? min : null,
      min: max == null ? null : min,
      max: max == null ? null : max,
      kg: kg !== null && kg >= 0 && kg <= 1000 ? kg : null,
      dur: parseDurationInput(s.dur),
    };
  });
}

/**
 * Editor di una scheda, serie per serie come in Lyfta: riscaldamento e serie di
 * lavoro, range di ripetizioni (8-10), carico, recupero, note e superserie.
 */
export function TemplateEditor({
  templateId,
  items,
  exercises,
  measures,
}: {
  templateId: string;
  items: EditorItem[];
  exercises: Option[];
  measures: Record<string, string>;
}) {
  const router = useRouter();
  const [list, setList] = useState<EditItem[]>(() => items.map(toEdit));
  const [library, setLibrary] = useState<Option[]>(exercises);
  const [measure, setMeasure] = useState<Record<string, string>>(measures);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const names = useMemo(() => Object.fromEntries(library.map((o) => [o.value, o.label])), [library]);

  function update(i: number, fn: (it: EditItem) => EditItem) {
    setList((prev) => prev.map((it, idx) => (idx === i ? { ...fn(it), dirty: true } : it)));
  }

  function save(i: number) {
    const it = list[i];
    const rest = it.rest === "" ? null : Number(it.rest);
    const ss = it.superset === "" ? null : Math.max(1, Math.min(20, Math.round(Number(it.superset)) || 1));
    startTransition(async () => {
      const res = await saveTemplateItem({
        templateId,
        itemId: it.id,
        exerciseId: it.exercise_id,
        recupero_s: rest,
        superset: ss,
        note: it.note.trim() || null,
        sets: toSets(it),
      });
      if (!res.ok) return void toast.error(res.message);
      setList((prev) => prev.map((x, idx) => (idx === i ? { ...x, id: res.id, dirty: false } : x)));
      toast.success("Esercizio salvato");
      router.refresh();
    });
  }

  function remove(i: number) {
    const it = list[i];
    if (!it.id) return setList((prev) => prev.filter((_, idx) => idx !== i));
    startTransition(async () => {
      const res = await deleteTemplateItem(it.id as string);
      if (!res.ok) return void toast.error("Non è stato possibile togliere l'esercizio.");
      setList((prev) => prev.filter((_, idx) => idx !== i));
      router.refresh();
    });
  }

  function move(i: number, direction: "up" | "down") {
    const it = list[i];
    if (!it.id || it.dirty) return void toast.error("Salva l'esercizio prima di spostarlo.");
    startTransition(async () => {
      const res = await moveChild("templateItems", it.id as string, direction);
      if (!res.ok) return void toast.error("Non è stato possibile spostare l'esercizio.");
      setList((prev) => {
        const j = direction === "up" ? i - 1 : i + 1;
        if (j < 0 || j >= prev.length) return prev;
        const next = [...prev];
        [next[i], next[j]] = [next[j], next[i]];
        return next;
      });
      router.refresh();
    });
  }

  function addExercise(exerciseId: string) {
    const isTimed = measure[exerciseId] === "durata";
    const blank: EditSet = { t: "normale", min: isTimed ? "" : "10", max: "", kg: "", dur: isTimed ? "0:30" : "" };
    setSearch("");
    setList((prev) => [
      ...prev,
      { id: null, exercise_id: exerciseId, rest: isTimed ? "" : "90", superset: "", note: "", sets: [blank, { ...blank }, { ...blank }], dirty: true },
    ]);
  }

  function createAndAdd(nome: string) {
    startTransition(async () => {
      const res = await createExercise(nome, "peso_rip");
      if (!res.ok) return void toast.error(res.message);
      setLibrary((prev) => (prev.some((o) => o.value === res.id) ? prev : [...prev, { value: res.id, label: res.nome }]));
      setMeasure((prev) => ({ ...prev, [res.id]: res.misura }));
      addExercise(res.id);
    });
  }

  const query = search.trim().toLowerCase();
  const matches = query ? library.filter((o) => o.label.toLowerCase().includes(query)).slice(0, 8) : [];
  const exactMatch = library.some((o) => o.label.toLowerCase() === query);

  return (
    <section className="space-y-3" aria-label="Esercizi della scheda">
      <h2 className="text-sm font-semibold">
        Esercizi della scheda <span className="font-normal text-muted-foreground">({list.length})</span>
      </h2>

      {list.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">Nessun esercizio: aggiungine uno qui sotto.</p>
      )}

      {list.map((it, i) => {
        const timed = measure[it.exercise_id] === "durata";
        const labels = setLabels(it.sets.map((s) => s.t));
        return (
          <div key={it.id ?? `new-${i}`} className={cn("rounded-xl border bg-card/40 p-3 sm:p-4", it.dirty ? "border-primary/50" : "border-border")}>
            <div className="mb-2 flex items-start gap-1">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold">{names[it.exercise_id] ?? "Esercizio"}</h3>
                {it.dirty && <p className="text-[11px] text-primary-text">Modifiche da salvare</p>}
              </div>
              <Button type="button" size="icon-sm" variant="ghost" aria-label="Sposta su" disabled={isPending || i === 0} onClick={() => move(i, "up")} className="max-md:size-11">
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button type="button" size="icon-sm" variant="ghost" aria-label="Sposta giù" disabled={isPending || i === list.length - 1} onClick={() => move(i, "down")} className="max-md:size-11">
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button type="button" size="icon-sm" variant="ghost" aria-label="Togli esercizio dalla scheda" disabled={isPending} onClick={() => remove(i)} className="text-muted-foreground hover:text-destructive max-md:size-11">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="mb-3 grid gap-2 sm:grid-cols-[10rem_8rem_1fr]">
              <label className="space-y-1 text-[11px] text-muted-foreground">
                <span>Recupero</span>
                <select
                  value={it.rest}
                  onChange={(e) => update(i, (x) => ({ ...x, rest: e.target.value }))}
                  className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground max-md:min-h-11 max-md:text-base"
                >
                  <option value="">Predefinito (1:30)</option>
                  {REST_CHOICES.map((s) => (
                    <option key={s} value={s}>
                      {s === 0 ? "Nessuno" : formatClock(s)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-[11px] text-muted-foreground">
                <span>Superserie n.</span>
                <input
                  inputMode="numeric"
                  value={it.superset}
                  placeholder="—"
                  onChange={(e) => update(i, (x) => ({ ...x, superset: e.target.value.replace(/\D/g, "").slice(0, 2) }))}
                  className={inputCls}
                />
              </label>
              <label className="space-y-1 text-[11px] text-muted-foreground">
                <span>Note</span>
                <textarea
                  value={it.note}
                  maxLength={500}
                  rows={2}
                  onChange={(e) => update(i, (x) => ({ ...x, note: e.target.value }))}
                  className="w-full rounded-lg border border-input bg-transparent px-2 py-1.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 max-md:text-base dark:bg-input/30"
                />
              </label>
            </div>

            <div className="grid grid-cols-[2.25rem_1fr_1fr_4.5rem_1.75rem] items-center gap-x-1.5 gap-y-1.5 sm:grid-cols-[2.5rem_5rem_5rem_6rem_2rem] sm:gap-x-2">
              <span className="text-[11px] text-muted-foreground">Serie</span>
              {timed ? (
                <span className="col-span-2 text-center text-[11px] text-muted-foreground">Durata (m:ss)</span>
              ) : (
                <span className="col-span-2 text-center text-[11px] text-muted-foreground">Ripetizioni (da – a)</span>
              )}
              <span className="text-center text-[11px] text-muted-foreground">{timed ? "" : "kg"}</span>
              <span />
              {it.sets.map((s, si) => (
                <SetEditRow
                  key={si}
                  label={labels[si]}
                  s={s}
                  timed={timed}
                  onChange={(p) => update(i, (x) => ({ ...x, sets: x.sets.map((y, yi) => (yi === si ? { ...y, ...p } : y)) }))}
                  onRemove={() => update(i, (x) => ({ ...x, sets: x.sets.filter((_, yi) => yi !== si) }))}
                />
              ))}
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={it.sets.length >= 30}
                onClick={() => update(i, (x) => ({ ...x, sets: [...x.sets, { ...(x.sets.filter((y) => y.t !== "riscaldamento").at(-1) ?? { t: "normale", min: "10", max: "", kg: "", dur: "" }), t: "normale" }] }))}
                className="max-md:min-h-11"
              >
                <Plus className="mr-1 h-4 w-4" /> Aggiungi serie
              </Button>
              <Button type="button" size="sm" onClick={() => save(i)} disabled={isPending || !it.dirty} className="max-md:min-h-11">
                {isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                Salva esercizio
              </Button>
            </div>
          </div>
        );
      })}

      <div className="space-y-2 rounded-xl border border-border bg-card/40 p-3">
        <label className="block text-xs text-muted-foreground">
          <span className="sr-only">Aggiungi un esercizio alla scheda</span>
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
                <button type="button" onClick={() => addExercise(o.value)} className="flex w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted/50 max-md:min-h-11">
                  {o.label}
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
    </section>
  );
}

function SetEditRow({
  label,
  s,
  timed,
  onChange,
  onRemove,
}: {
  label: string;
  s: EditSet;
  timed: boolean;
  onChange: (p: Partial<EditSet>) => void;
  onRemove: () => void;
}) {
  const kinds = SET_KINDS.map((k) => k.value);
  const kindLabel = SET_KINDS.find((k) => k.value === s.t)?.label ?? "";
  return (
    <>
      <button
        type="button"
        onClick={() => onChange({ t: kinds[(kinds.indexOf(s.t) + 1) % kinds.length] })}
        aria-label={`Serie ${label}: ${kindLabel}. Tocca per cambiare tipo`}
        title="Tocca per cambiare il tipo di serie"
        className={cn(
          "grid h-9 w-full place-items-center rounded-lg text-sm font-semibold tabular-nums text-muted-foreground max-md:h-11",
          s.t === "riscaldamento" && "bg-amber-500/15 text-amber-600 dark:text-amber-400",
          s.t === "drop" && "bg-sky-500/15 text-sky-600 dark:text-sky-400",
          s.t === "cedimento" && "bg-rose-500/15 text-rose-600 dark:text-rose-400",
        )}
      >
        {label}
      </button>
      {timed ? (
        <input
          aria-label={`Serie ${label}: durata`}
          value={s.dur}
          placeholder="0:30"
          onChange={(e) => onChange({ dur: e.target.value })}
          className={cn(inputCls, "col-span-2")}
        />
      ) : (
        <>
          <input aria-label={`Serie ${label}: ripetizioni minime`} inputMode="numeric" value={s.min} placeholder="10" onChange={(e) => onChange({ min: e.target.value })} className={inputCls} />
          <input aria-label={`Serie ${label}: ripetizioni massime (facoltative)`} inputMode="numeric" value={s.max} placeholder="—" onChange={(e) => onChange({ max: e.target.value })} className={inputCls} />
        </>
      )}
      {timed ? (
        <span />
      ) : (
        <input aria-label={`Serie ${label}: chili`} inputMode="decimal" value={s.kg} placeholder="kg" onChange={(e) => onChange({ kg: e.target.value })} className={inputCls} />
      )}
      <button
        type="button"
        aria-label={`Togli la serie ${label}`}
        onClick={onRemove}
        className="grid h-9 w-full place-items-center rounded-lg text-muted-foreground hover:text-destructive max-md:h-11"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </>
  );
}
