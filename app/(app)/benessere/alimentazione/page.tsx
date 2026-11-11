import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, UtensilsCrossed } from "lucide-react";
import { SectionHeader } from "@/components/app/section-header";
import { LoadErrorBox } from "@/components/app/load-error";
import { HBars } from "@/components/hub/charts";
import { NutritionDiary } from "@/components/hub/nutrition-diary";
import { addDays, formatDate, todayIso } from "@/lib/hub/fields";
import { COLLECTIONS } from "@/lib/hub/registry";
import { listRows, logSafeError, type Row } from "@/lib/hub/server";
import { nutritionGoals, nutritionLog, sumNutrition, type LogEntry, type NutritionGoals } from "@/lib/hub/summary";

export const metadata = { title: "Diario dei pasti · Benessere" };
export const dynamic = "force-dynamic";

export default async function AlimentazionePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.giorno) ? sp.giorno[0] : sp.giorno;
  const day = raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) && !Number.isNaN(Date.parse(raw)) ? raw : todayIso();
  const weekStart = addDays(day, -6);

  let log: LogEntry[] = [];
  let foods: Row[] = [];
  let goals: NutritionGoals | null = null;
  let failed = false;
  try {
    [log, foods, goals] = await Promise.all([nutritionLog(weekStart, day), listRows(COLLECTIONS.foods), nutritionGoals()]);
  } catch (err) {
    logSafeError("Diario pasti", err);
    failed = true;
  }
  const today = log.filter((e) => e.data === day);
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).map((d) => ({
    label: formatDate(d).split(" ").slice(0, 2).join(" "),
    value: Math.round(sumNutrition(log.filter((e) => e.data === d)).kcal),
  }));
  const link = (d: string) => `/benessere/alimentazione?giorno=${d}`;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-10">
      <Link href="/benessere" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground max-md:min-h-11">
        <ArrowLeft className="h-3.5 w-3.5" /> Benessere
      </Link>
      <SectionHeader icon={UtensilsCrossed} eyebrow="Benessere" title="Diario dei pasti" subtitle="Calorie e macro del giorno, rispetto al tuo obiettivo." />

      <div className="flex items-center gap-2">
        <Link href={link(addDays(day, -1))} aria-label="Giorno precedente" className="grid h-9 w-9 place-items-center rounded-lg border border-border hover:bg-muted max-md:h-11 max-md:w-11">
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <h2 className="min-w-40 text-center text-sm font-semibold">{day === todayIso() ? `Oggi, ${formatDate(day)}` : formatDate(day)}</h2>
        <Link href={link(addDays(day, 1))} aria-label="Giorno successivo" className="grid h-9 w-9 place-items-center rounded-lg border border-border hover:bg-muted max-md:h-11 max-md:w-11">
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {failed ? (
        <LoadErrorBox />
      ) : (
        <>
          <NutritionDiary
            key={day}
            day={day}
            entries={today}
            goals={goals}
            foods={foods.map((f) => ({
              id: f.id,
              nome: String(f.nome),
              marca: (f.marca as string | null) ?? null,
              kcal: Number(f.kcal),
              proteine: Number(f.proteine),
              carboidrati: Number(f.carboidrati),
              grassi: Number(f.grassi),
              porzione_g: f.porzione_g == null ? null : Number(f.porzione_g),
            }))}
          />
          <section className="rounded-xl border border-border bg-card/40 p-5">
            <h2 className="mb-3 text-sm font-semibold">Ultimi 7 giorni</h2>
            <HBars bars={week.map((w) => ({ ...w, tone: goals?.kcal && w.value > goals.kcal ? "danger" : "primary" }))} format={(v) => `${v} kcal`} />
            <p className="mt-3 text-xs text-muted-foreground">
              Riepilogo completo nella pagina <Link href="/benessere/settimana" className="underline">La settimana</Link>.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
