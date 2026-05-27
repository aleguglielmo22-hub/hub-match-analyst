import Link from "next/link";
import {
  Users,
  Crown,
  Target,
  Brain,
  ArrowUpRight,
  Goal,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { loadDashboardKpis } from "@/app/(app)/dashboard-queries";

/** Singola card KPI riusabile. */
function KpiCard({
  icon: Icon,
  label,
  value,
  href,
  accent,
  children,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  href: string;
  /** Se true, evidenzia in emerald (es. Profili Elite). */
  accent?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex flex-col gap-3 rounded-2xl border bg-card/40 p-5 transition-all hover:bg-card/70 hover:shadow-lg hover:shadow-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        accent
          ? "border-emerald-400/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent hover:border-emerald-400/50"
          : "border-border/60 hover:border-primary/40",
      )}
    >
      <div className="flex items-start justify-between">
        <span
          className={cn(
            "grid h-10 w-10 place-items-center rounded-xl ring-1",
            accent
              ? "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30"
              : "bg-primary/10 text-primary ring-primary/20",
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <ArrowUpRight
          className={cn(
            "h-4 w-4 transition-all",
            accent
              ? "text-emerald-300/40 group-hover:text-emerald-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              : "text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5",
          )}
        />
      </div>
      <div className="space-y-1">
        <p
          className={cn(
            "text-3xl font-semibold tabular-nums tracking-tight",
            accent ? "text-emerald-100" : "text-foreground",
          )}
        >
          {value.toLocaleString("it-IT")}
        </p>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
      </div>
      {children}
    </Link>
  );
}

/** Server Component asincrono che carica gli KPI in parallelo. */
export async function KpiCards() {
  const k = await loadDashboardKpis();

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        icon={Users}
        label="Database Calciatori"
        value={k.playersTotal}
        href="/scouting"
      >
        <p className="text-[11px] text-muted-foreground">
          Profili a sistema
        </p>
      </KpiCard>

      <KpiCard
        icon={Crown}
        label="Profili Élite (A1 / A2)"
        value={k.playersElite}
        href="/scouting?voto=A1,A2"
        accent
      >
        <p className="text-[11px] text-emerald-200/70">
          Top target sotto monitoraggio
        </p>
      </KpiCard>

      <KpiCard
        icon={Target}
        label="Schemi Calci Piazzati"
        value={k.setPiecesTotal}
        href="/set-pieces"
      >
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Goal className="h-3 w-3 text-emerald-400" />
            <span className="font-semibold text-foreground">
              {k.setPiecesOffensivi}
            </span>{" "}
            Off.
          </span>
          <span className="opacity-30">·</span>
          <span className="inline-flex items-center gap-1">
            <Shield className="h-3 w-3 text-sky-400" />
            <span className="font-semibold text-foreground">
              {k.setPiecesDifensivi}
            </span>{" "}
            Dif.
          </span>
        </div>
      </KpiCard>

      <KpiCard
        icon={Brain}
        label="Catalogo Tattico"
        value={k.situationalTotal}
        href="/situational"
      >
        <p className="text-[11px] text-muted-foreground">
          Situazioni ed esercitazioni
        </p>
      </KpiCard>
    </div>
  );
}
