import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock, Home, RotateCcw } from "lucide-react";
import { SectionHeader } from "@/components/app/section-header";
import { BackupReminder } from "@/components/dashboard/backup-reminder";
import { AREAS, type NavArea } from "@/components/app/nav-items";
import { getCurrentWorkspace } from "@/lib/supabase/queries";
import { formatDate, formatMoney, todayIso } from "@/lib/hub/fields";
import { logSafeError } from "@/lib/hub/server";
import {
  countWhere,
  latestMetric,
  monthBounds,
  nutritionLog,
  reviewQueue,
  sumByType,
  sumNutrition,
  transactionsBetween,
  upcomingDeadlines,
  type Deadline,
  type ReviewItem,
} from "@/lib/hub/summary";

export const metadata = {
  title: "Home · AG Workspace",
};

export const dynamic = "force-dynamic";

/** Numeri utili per il riquadro di un'area (caricati qui, disegnati sotto). */
async function areaLines(area: NavArea["key"]): Promise<string[]> {
  const today = todayIso();
  switch (area) {
    case "lavoro": {
      const [players, setPieces] = await Promise.all([countWhere("players", {}), countWhere("set_pieces", {})]);
      return [`${players} giocatori nello Scouting`, `${setPieces} calci piazzati`];
    }
    case "studi": {
      const [reading, courses] = await Promise.all([
        countWhere("study_books", { stato: "in_lettura" }),
        countWhere("study_courses", { stato: "in_corso" }),
      ]);
      return [`${reading} libri in lettura`, `${courses} corsi in corso`];
    }
    case "benessere": {
      const [weight, log] = await Promise.all([latestMetric("peso"), nutritionLog(today, today)]);
      const kcal = Math.round(sumNutrition(log).kcal);
      return [
        weight ? `Peso: ${String(weight.valore).replace(".", ",")} kg (${formatDate(weight.data)})` : "Nessun peso registrato",
        `${kcal} kcal oggi`,
      ];
    }
    case "finanze": {
      const now = new Date();
      const { from, to } = monthBounds(now.getFullYear(), now.getMonth() + 1);
      const { entrate, uscite } = sumByType(await transactionsBetween(from, to));
      return [`Uscite del mese: ${formatMoney(uscite)}`, `Saldo del mese: ${formatMoney(entrate - uscite)}`];
    }
  }
}

async function AreaStats({ area }: { area: NavArea["key"] }) {
  let lines: string[];
  try {
    lines = await areaLines(area);
  } catch (err) {
    logSafeError(`Home · ${area}`, err);
    lines = ["Dati non disponibili ora"];
  }
  return <Lines lines={lines} />;
}

function Lines({ lines }: { lines: string[] }) {
  return (
    <ul className="space-y-0.5 text-xs text-muted-foreground">
      {lines.map((l) => (
        <li key={l}>{l}</li>
      ))}
    </ul>
  );
}

async function Deadlines() {
  let items: Deadline[] | null = null;
  try {
    items = await upcomingDeadlines(6);
  } catch (err) {
    logSafeError("Home · scadenze", err);
  }
  if (items === null) return <p className="text-sm text-muted-foreground">Scadenze non disponibili ora.</p>;
    if (items.length === 0) {
      return <p className="text-sm text-muted-foreground">Nessun esame o scadenza in arrivo.</p>;
    }
    return (
      <ul className="divide-y divide-border/60">
        {items.map((d) => (
          <li key={`${d.kind}-${d.id}`}>
            <Link href={d.href} className="flex items-center gap-3 py-2.5 hover:text-primary-text">
              <span className="grid w-14 shrink-0 place-items-center rounded-lg bg-primary/10 py-1 text-center text-primary-text">
                <span className="text-lg font-semibold leading-none tabular-nums">{Math.max(0, d.days)}</span>
                <span className="text-[10px]">{d.days === 1 ? "giorno" : "giorni"}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{d.title}</span>
                <span className="text-xs text-muted-foreground">
                  {d.kind} · {d.days <= 0 ? "oggi" : formatDate(d.date)}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    );
}

async function Reviews() {
  let due: ReviewItem[] | null = null;
  try {
    due = (await reviewQueue()).filter((r) => r.days <= 0);
  } catch (err) {
    logSafeError("Home · ripassi", err);
  }
  if (due === null) return <p className="text-sm text-muted-foreground">Ripassi non disponibili ora.</p>;
    if (due.length === 0) return <p className="text-sm text-muted-foreground">Niente da ripassare oggi.</p>;
    return (
      <div className="space-y-2">
        <ul className="space-y-1.5">
          {due.slice(0, 5).map((r) => (
            <li key={`${r.key}-${r.id}`}>
              <Link href={r.href} className="block rounded-lg px-2 py-1.5 hover:bg-muted/40">
                <span className="block truncate text-sm">{r.title}</span>
                <span className="text-xs text-muted-foreground">
                  {r.context} · ripasso {r.step} di 3
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/studi/ripasso" className="inline-flex items-center gap-1 text-xs text-primary-text hover:underline">
          {due.length > 5 ? `Tutti i ${due.length} ripassi` : "Vai ai ripassi"} <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    );
}

const Placeholder = () => <div className="h-16 animate-pulse rounded-lg bg-muted/50" />;

/**
 * Home: le 4 aree come grandi riquadri, poi esami e scadenze con il conto
 * alla rovescia e i ripassi del giorno.
 */
export default async function HomePage() {
  const workspace = await getCurrentWorkspace();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-10">
      <SectionHeader icon={Home} eyebrow="Home" title="AG Workspace" subtitle="Lavoro, studi, benessere e finanze in un solo posto." />

      {workspace?.isOwner && <BackupReminder />}

      <nav aria-label="Aree" className="grid gap-4 sm:grid-cols-2">
        {AREAS.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.key}
              href={a.href}
              className="group flex min-h-36 flex-col justify-between gap-4 rounded-2xl border border-border bg-card/40 p-5 transition-colors hover:border-primary/50 hover:bg-muted/30"
            >
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary-text ring-1 ring-primary/30">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="flex items-center gap-1.5 text-lg font-semibold">
                    {a.label}
                    <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                  </h2>
                  <p className="text-sm text-muted-foreground">{a.description}</p>
                </div>
              </div>
              <Suspense fallback={<Placeholder />}>
                <AreaStats area={a.key} />
              </Suspense>
            </Link>
          );
        })}
      </nav>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card/40 p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <CalendarClock className="h-4 w-4 text-primary-text" /> Esami e scadenze
          </h2>
          <Suspense fallback={<Placeholder />}>
            <Deadlines />
          </Suspense>
        </section>
        <section className="rounded-2xl border border-border bg-card/40 p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <RotateCcw className="h-4 w-4 text-primary-text" /> Da ripassare oggi
          </h2>
          <Suspense fallback={<Placeholder />}>
            <Reviews />
          </Suspense>
        </section>
      </div>
    </div>
  );
}
