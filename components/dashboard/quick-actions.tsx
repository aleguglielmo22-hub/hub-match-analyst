import Link from "next/link";
import { UserPlus, Target, Brain, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Box azioni rapide: tre CTA visive che lanciano i workflow principali.
 * Non richiede dati lato server quindi è un Server Component sincrono.
 */
export function QuickActions() {
  return (
    <section className="rounded-2xl border border-border/60 bg-card/40 p-5">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight">
          Azioni rapide
        </h2>
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Inserisci al volo
        </p>
      </header>

      <div className="space-y-2.5">
        <ActionCard
          href="/scouting/nuovo"
          icon={UserPlus}
          title="Inserisci nuovo giocatore"
          subtitle="Scheda valutazione completa, 71 metriche"
          tone="emerald"
        />
        <ActionCard
          href="/set-pieces/nuovo"
          icon={Target}
          title="Disegna nuovo piazzato"
          subtitle="Form condizionale offensivo / difensivo"
          tone="sky"
        />
        <ActionCard
          href="/situational/nuovo"
          icon={Brain}
          title="Aggiungi esercitazione"
          subtitle="Catalogo tattico, cascata macro → sotto"
          tone="amber"
        />
      </div>
    </section>
  );
}

function ActionCard({
  href,
  icon: Icon,
  title,
  subtitle,
  tone,
}: {
  href: string;
  icon: typeof UserPlus;
  title: string;
  subtitle: string;
  tone: "emerald" | "sky" | "amber";
}) {
  const toneCls = {
    emerald: "from-emerald-500/15 to-emerald-500/5 text-emerald-200 ring-emerald-400/30",
    sky: "from-sky-500/15 to-sky-500/5 text-sky-200 ring-sky-400/30",
    amber: "from-amber-500/15 to-amber-500/5 text-amber-200 ring-amber-400/30",
  }[tone];

  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-xl border border-border/60 bg-gradient-to-br p-3 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-black/20",
        toneCls,
      )}
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-black/30 ring-1 ring-white/10">
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
    </Link>
  );
}
