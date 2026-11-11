"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { parseDecimal } from "@/lib/hub/fields";
import { MEALS } from "@/lib/hub/registry";
import { addLogEntry, deleteLogEntry, saveNutritionGoals } from "@/app/(app)/hub/food-actions";
import { ProgressBarClient } from "./progress-client";
import { OffSearch } from "./off-search";

type Food = { id: string; nome: string; marca: string | null; kcal: number; proteine: number; carboidrati: number; grassi: number; porzione_g: number | null };
type Entry = { id: string; pasto: string; nome: string; grammi: number; kcal: number; proteine: number; carboidrati: number; grassi: number };
type Goals = { kcal: number | null; proteine: number | null; carboidrati: number | null; grassi: number | null };

const inputCls = "h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm max-md:min-h-11 max-md:text-base";
const r0 = (n: number) => Math.round(n);

/**
 * Diario del giorno: per ogni pasto gli alimenti con i grammi, totali di
 * calorie e macro e confronto con l'obiettivo giornaliero.
 */
export function NutritionDiary({ day, entries, foods, goals }: { day: string; entries: Entry[]; foods: Food[]; goals: Goals | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [meal, setMeal] = useState<string>(MEALS[0].value);
  const [foodId, setFoodId] = useState("");
  const [grams, setGrams] = useState("100");
  const [filter, setFilter] = useState("");
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [offOpen, setOffOpen] = useState(false);
  const [g, setG] = useState({
    kcal: goals?.kcal ? String(goals.kcal) : "",
    proteine: goals?.proteine ? String(goals.proteine) : "",
    carboidrati: goals?.carboidrati ? String(goals.carboidrati) : "",
    grassi: goals?.grassi ? String(goals.grassi) : "",
  });

  const totals = useMemo(
    () => entries.reduce((t, e) => ({ kcal: t.kcal + e.kcal, proteine: t.proteine + e.proteine, carboidrati: t.carboidrati + e.carboidrati, grassi: t.grassi + e.grassi }), { kcal: 0, proteine: 0, carboidrati: 0, grassi: 0 }),
    [entries],
  );
  const shownFoods = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q ? foods.filter((f) => `${f.nome} ${f.marca ?? ""}`.toLowerCase().includes(q)) : foods;
  }, [foods, filter]);
  const selected = foods.find((f) => f.id === foodId);
  const gramsNum = parseDecimal(grams) ?? 0;

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!foodId || gramsNum <= 0) return void toast.error("Scegli un alimento e i grammi.");
    startTransition(async () => {
      const res = await addLogEntry({ data: day, pasto: meal, food_id: foodId, grammi: gramsNum });
      if (!res.ok) return void toast.error(res.message ?? "Errore");
      toast.success("Aggiunto al diario");
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const res = await deleteLogEntry(id);
      if (!res.ok) return void toast.error("Eliminazione non riuscita.");
      router.refresh();
    });
  }

  function saveGoals(e: React.FormEvent) {
    e.preventDefault();
    const toInt = (s: string) => (s.trim() ? Math.round(parseDecimal(s) ?? NaN) : null);
    startTransition(async () => {
      const res = await saveNutritionGoals({ kcal: toInt(g.kcal), proteine: toInt(g.proteine), carboidrati: toInt(g.carboidrati), grassi: toInt(g.grassi) });
      if (!res.ok) return void toast.error(res.message ?? "Errore");
      toast.success("Obiettivo salvato");
      setGoalsOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-3 rounded-xl border border-border bg-card/40 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <ProgressBarClient label={`Calorie: ${r0(totals.kcal)}${goals?.kcal ? ` di ${goals.kcal}` : ""} kcal`} value={totals.kcal} max={goals?.kcal ?? 0} />
        <ProgressBarClient label={`Proteine: ${r0(totals.proteine)}${goals?.proteine ? ` di ${goals.proteine}` : ""} g`} value={totals.proteine} max={goals?.proteine ?? 0} />
        <ProgressBarClient label={`Carboidrati: ${r0(totals.carboidrati)}${goals?.carboidrati ? ` di ${goals.carboidrati}` : ""} g`} value={totals.carboidrati} max={goals?.carboidrati ?? 0} />
        <ProgressBarClient label={`Grassi: ${r0(totals.grassi)}${goals?.grassi ? ` di ${goals.grassi}` : ""} g`} value={totals.grassi} max={goals?.grassi ?? 0} />
        <div className="sm:col-span-2 lg:col-span-4">
          <Button variant="ghost" size="sm" onClick={() => setGoalsOpen(true)} className="max-md:min-h-11">
            <Target className="mr-1.5 h-4 w-4" /> {goals?.kcal ? "Modifica l'obiettivo giornaliero" : "Imposta l'obiettivo giornaliero"}
          </Button>
        </div>
      </section>

      <form onSubmit={add} className="space-y-3 rounded-xl border border-border bg-card/40 p-5">
        <h2 className="text-sm font-semibold">Aggiungi al diario</h2>
        {foods.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Non hai ancora alimenti salvati: cercali su Open Food Facts qui sotto o aggiungili a mano in <Link href="/benessere/alimenti/nuovo" className="underline">Alimenti</Link>.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-[1fr_2fr_1fr_auto] sm:items-end">
            <label className="space-y-1 text-xs text-muted-foreground">
              <span>Pasto</span>
              <select value={meal} onChange={(e) => setMeal(e.target.value)} className={inputCls}>
                {MEALS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </label>
            <div className="space-y-1">
              <label className="space-y-1 text-xs text-muted-foreground">
                <span>Alimento</span>
                <input type="search" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filtra i tuoi alimenti…" className={inputCls} />
              </label>
              <select
                aria-label="Scegli l'alimento"
                value={foodId}
                onChange={(e) => {
                  setFoodId(e.target.value);
                  const f = foods.find((x) => x.id === e.target.value);
                  if (f?.porzione_g) setGrams(String(f.porzione_g).replace(".", ","));
                }}
                className={inputCls}
              >
                <option value="">Scegli…</option>
                {shownFoods.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome}{f.marca ? ` (${f.marca})` : ""} · {r0(f.kcal)} kcal/100 g
                  </option>
                ))}
              </select>
            </div>
            <label className="space-y-1 text-xs text-muted-foreground">
              <span>Grammi</span>
              <input inputMode="decimal" value={grams} onChange={(e) => setGrams(e.target.value)} className={inputCls} />
            </label>
            <Button type="submit" disabled={isPending} className="max-md:min-h-11">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />} Aggiungi
            </Button>
            {selected && gramsNum > 0 && (
              <p className="text-xs text-muted-foreground sm:col-span-4">
                {r0((selected.kcal * gramsNum) / 100)} kcal · P {r0((selected.proteine * gramsNum) / 100)} g · C {r0((selected.carboidrati * gramsNum) / 100)} g · G {r0((selected.grassi * gramsNum) / 100)} g
              </p>
            )}
          </div>
        )}
        <Button type="button" variant="link" size="sm" onClick={() => setOffOpen((o) => !o)} className="px-0">
          {offOpen ? "Chiudi la ricerca su Open Food Facts" : "Non lo trovi? Cerca su Open Food Facts"}
        </Button>
        {offOpen && <OffSearch onAdded={(id) => setFoodId(id)} />}
      </form>

      <div className="grid gap-4 md:grid-cols-2">
        {MEALS.map((m) => {
          const list = entries.filter((e) => e.pasto === m.value);
          const kcal = list.reduce((s, e) => s + e.kcal, 0);
          return (
            <section key={m.value} className="rounded-xl border border-border bg-card/40 p-4">
              <h2 className="mb-2 flex justify-between text-sm font-semibold">
                {m.label} <span className="font-normal text-muted-foreground">{r0(kcal)} kcal</span>
              </h2>
              {list.length === 0 ? (
                <p className="text-xs text-muted-foreground">Niente registrato.</p>
              ) : (
                <ul className="divide-y divide-border/60">
                  {list.map((e) => (
                    <li key={e.id} className="flex items-center gap-2 py-1.5 text-sm">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{e.nome}</span>
                        <span className="text-xs text-muted-foreground">
                          {String(e.grammi).replace(".", ",")} g · {r0(e.kcal)} kcal · P {r0(e.proteine)} · C {r0(e.carboidrati)} · G {r0(e.grassi)}
                        </span>
                      </span>
                      <Button size="icon-sm" variant="ghost" aria-label={`Togli ${e.nome}`} onClick={() => remove(e.id)} disabled={isPending} className="text-destructive max-md:size-11">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <Dialog open={goalsOpen} onOpenChange={setGoalsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Obiettivo giornaliero</DialogTitle>
            <DialogDescription>Lascia vuoto ciò che non vuoi seguire.</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveGoals} className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["kcal", "Calorie (kcal)"],
                ["proteine", "Proteine (g)"],
                ["carboidrati", "Carboidrati (g)"],
                ["grassi", "Grassi (g)"],
              ] as const
            ).map(([k, label]) => (
              <label key={k} className="space-y-1 text-xs text-muted-foreground">
                <span>{label}</span>
                <input inputMode="numeric" value={g[k]} onChange={(e) => setG((p) => ({ ...p, [k]: e.target.value }))} className={inputCls} />
              </label>
            ))}
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button type="button" variant="ghost" onClick={() => setGoalsOpen(false)}>Annulla</Button>
              <Button type="submit" disabled={isPending}>Salva</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
