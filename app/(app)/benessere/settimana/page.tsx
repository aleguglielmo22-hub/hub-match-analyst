import Link from "next/link";
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { SectionHeader } from "@/components/app/section-header";
import { LoadErrorBox } from "@/components/app/load-error";
import { HBars, LineChart } from "@/components/hub/charts";
import { addDays, formatDate, todayIso } from "@/lib/hub/fields";
import { COLLECTIONS, detailHref } from "@/lib/hub/registry";
import { logSafeError } from "@/lib/hub/server";
import {
  metricsBetween,
  mondayOf,
  nutritionGoals,
  nutritionLog,
  sessionsBetween,
  sumNutrition,
  type LogEntry,
  type MetricPoint,
  type NutritionGoals,
} from "@/lib/hub/summary";

export const metadata = { title: "La settimana · Benessere" };
export const dynamic = "force-dynamic";

const DAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const fmt1 = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ","));

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function avg(list: number[]): number | null {
  return list.length ? list.reduce((a, b) => a + b, 0) / list.length : null;
}

export default async function SettimanaPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.settimana) ? sp.settimana[0] : sp.settimana;
  const start = mondayOf(raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : todayIso());
  const end = addDays(start, 6);
  const days = DAYS.map((_, i) => addDays(start, i));

  let metrics: MetricPoint[] = [];
  let history: MetricPoint[] = [];
  let log: LogEntry[] = [];
  let goals: NutritionGoals | null = null;
  let sessions: Awaited<ReturnType<typeof sessionsBetween>> = [];
  let failed = false;
  try {
    [metrics, history, log, goals, sessions] = await Promise.all([
      metricsBetween(start, end),
      metricsBetween(addDays(start, -56), end),
      nutritionLog(start, end),
      nutritionGoals(),
      sessionsBetween(start, end),
    ]);
  } catch (err) {
    logSafeError("Settimana benessere", err);
    failed = true;
  }

  const values = (tipo: string) => metrics.filter((m) => m.tipo === tipo).map((m) => m.valore);
  const weights = metrics.filter((m) => m.tipo === "peso").sort((a, b) => a.data.localeCompare(b.data));
  const weightChange = weights.length >= 2 ? weights[weights.length - 1].valore - weights[0].valore : null;
  const sleep = avg(values("sonno_ore"));
  const steps = values("passi");
  const rhr = avg(values("battito_riposo"));
  const stress = avg(values("stress"));
  const kcalByDay = days.map((d) => Math.round(sumNutrition(log.filter((e) => e.data === d)).kcal));
  const loggedDays = kcalByDay.filter((k) => k > 0);
  const kcalAvg = avg(loggedDays);
  const week = sumNutrition(log);
  const minutes = sessions.reduce((s, x) => s + (x.durata_min ?? 0), 0);

  const link = (d: string) => `/benessere/settimana?settimana=${d}`;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-10">
      <Link href="/benessere" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground max-md:min-h-11">
        <ArrowLeft className="h-3.5 w-3.5" /> Benessere
      </Link>
      <SectionHeader icon={CalendarDays} eyebrow="Benessere" title="La settimana" subtitle="Parametri, allenamenti e alimentazione in un colpo d'occhio." />

      <div className="flex items-center gap-2">
        <Link href={link(addDays(start, -7))} aria-label="Settimana precedente" className="grid h-9 w-9 place-items-center rounded-lg border border-border hover:bg-muted max-md:h-11 max-md:w-11">
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <h2 className="min-w-52 text-center text-sm font-semibold">
          {formatDate(start)} – {formatDate(end)}
        </h2>
        <Link href={link(addDays(start, 7))} aria-label="Settimana successiva" className="grid h-9 w-9 place-items-center rounded-lg border border-border hover:bg-muted max-md:h-11 max-md:w-11">
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {failed ? (
        <LoadErrorBox />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Peso"
              value={weights.length ? `${fmt1(weights[weights.length - 1].valore)} kg` : "—"}
              hint={weightChange !== null ? `${weightChange > 0 ? "+" : ""}${fmt1(Math.round(weightChange * 10) / 10)} kg nella settimana` : undefined}
            />
            <Stat label="Sonno medio" value={sleep !== null ? `${fmt1(Math.round(sleep * 10) / 10)} ore` : "—"} />
            <Stat
              label="Passi"
              value={steps.length ? steps.reduce((a, b) => a + b, 0).toLocaleString("it-IT") : "—"}
              hint={steps.length ? `media ${Math.round(avg(steps)!).toLocaleString("it-IT")} al giorno` : undefined}
            />
            <Stat
              label="Battito a riposo"
              value={rhr !== null ? `${Math.round(rhr)} bpm` : "—"}
              hint={stress !== null ? `stress medio ${Math.round(stress)}` : undefined}
            />
            <Stat label="Allenamenti" value={String(sessions.length)} hint={minutes ? `${minutes} minuti in tutto` : undefined} />
            <Stat
              label="Calorie medie"
              value={kcalAvg !== null ? `${Math.round(kcalAvg)} kcal` : "—"}
              hint={goals?.kcal ? `obiettivo ${goals.kcal} kcal · ${loggedDays.length} giorni registrati` : `${loggedDays.length} giorni registrati`}
            />
            <Stat
              label="Macro della settimana"
              value={`${Math.round(week.proteine)} g proteine`}
              hint={`${Math.round(week.carboidrati)} g carboidrati · ${Math.round(week.grassi)} g grassi`}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-border bg-card/40 p-5">
              <h2 className="mb-3 text-sm font-semibold">Calorie giorno per giorno</h2>
              <HBars
                bars={days.map((d, i) => ({ label: `${DAYS[i]} ${formatDate(d).split(" ").slice(0, 2).join(" ")}`, value: kcalByDay[i], tone: goals?.kcal && kcalByDay[i] > goals.kcal ? "danger" : "primary" }))}
                format={(v) => `${v} kcal`}
              />
            </section>
            <section className="rounded-xl border border-border bg-card/40 p-5">
              <h2 className="mb-3 text-sm font-semibold">Peso nelle ultime 8 settimane</h2>
              <LineChart points={history.filter((m) => m.tipo === "peso").map((m) => ({ x: m.data, y: m.valore }))} unit="kg" label="Peso" />
            </section>
          </div>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold">Allenamenti della settimana</h2>
            {sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nessun allenamento registrato. <Link href="/benessere/schede" className="underline">Parti da una scheda</Link>.
              </p>
            ) : (
              <ul className="divide-y divide-border/60 rounded-xl border border-border">
                {sessions.map((s) => (
                  <li key={s.id}>
                    <Link href={detailHref(COLLECTIONS.sessions, s.id)} className="flex justify-between gap-2 px-4 py-3 text-sm hover:bg-muted/30">
                      <span className="font-medium">{s.titolo}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(s.data)}
                        {s.durata_min ? ` · ${s.durata_min} min` : ""}
                        {s.sensazione ? ` · ${"★".repeat(s.sensazione)}` : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
