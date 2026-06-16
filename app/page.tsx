import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Archive,
  ArrowRight,
  Brain,
  ImageIcon,
  Mail,
  Target,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Football Hub — Scouting & Analisi per Match Analyst",
  description:
    "Database scouting e palle inattive, training e cloud video in un unico hub per il match analyst.",
};

// La home è pubblica: la rendiamo dinamica perché controlliamo la sessione.
export const dynamic = "force-dynamic";

/** Le 4 sezioni operative, stesse icone della navigazione interna. */
const FEATURES = [
  {
    icon: Users,
    title: "Scouting DB",
    desc: "Database di giocatori osservati con schede complete e valutazioni dettagliate. Filtri avanzati per ruolo, scadenza e potenziale.",
  },
  {
    icon: Target,
    title: "Set Pieces DB",
    desc: "Database delle palle inattive: angoli, punizioni e rimesse. Schemi, esecutori ed efficacia misurata nel tempo.",
  },
  {
    icon: Brain,
    title: "Training",
    desc: "Catalogo di esercitazioni e situazioni di gioco. Pattern offensivi e difensivi organizzati per fase e obiettivo.",
  },
  {
    icon: Archive,
    title: "Cloud",
    desc: "Archivio cloud per video e documenti. Tag, stagioni e ricerca per ritrovare ogni file in pochi secondi.",
  },
];

/**
 * Segnaposto screenshot.
 * Per sostituirli: metti le immagini in /public/landing/ (es. dashboard.png)
 * e rimpiazza il <div> segnaposto con:
 *   <img src="/landing/dashboard.png" alt="Dashboard" className="h-full w-full object-cover" />
 */
const SHOTS = [
  { caption: "Dashboard — centro di controllo" },
  { caption: "Scheda giocatore — Scouting DB" },
  { caption: "Analisi palle inattive — Set Pieces DB" },
  { caption: "Cloud — video & documenti" },
];

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Utente già autenticato sulla home → lo portiamo alla dashboard.
  if (user) redirect("/dashboard");

  return (
    <div className="flex min-h-full flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
          <div className="flex items-center gap-2.5">
            <span className="relative grid h-8 w-8 place-items-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
              <span className="absolute inset-1 rounded-md bg-gradient-to-br from-primary/80 to-primary/40" />
              <span className="relative text-[11px] font-bold tracking-tight text-primary-foreground">
                FH
              </span>
            </span>
            <span className="text-sm font-semibold tracking-tight">
              Football Hub
            </span>
          </div>
          <Link href="/login" className={buttonVariants({ size: "default" })}>
            Accedi
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          {/* Glow arancio + verde di sfondo */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 left-1/4 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/25 blur-[120px]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -top-16 right-1/4 h-72 w-72 translate-x-1/2 rounded-full bg-chart-2/30 blur-[120px]"
          />
          <div className="relative mx-auto max-w-6xl px-4 py-20 text-center sm:px-8 sm:py-28">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-primary">
              Performance · Scouting
            </p>
            <h1 className="mx-auto max-w-4xl text-4xl font-semibold tracking-tight sm:text-6xl">
              Football Hub
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Database scouting e palle inattive, catalogo training e cloud
              video: tutto in un&apos;unica piattaforma per il match analyst.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/login"
                className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}
              >
                Accedi alla piattaforma
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <a
                href="#cosa-puoi-fare"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "w-full sm:w-auto",
                )}
              >
                Scopri le sezioni
              </a>
            </div>
          </div>
        </section>

        {/* Cosa puoi fare */}
        <section
          id="cosa-puoi-fare"
          className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-8"
        >
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Cosa puoi fare
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Quattro aree di lavoro integrate in un unico flusso.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <article
                  key={f.title}
                  className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/40 p-5 transition-colors hover:border-primary/40 hover:bg-card/60"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="text-base font-semibold tracking-tight">
                    {f.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {f.desc}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        {/* Screenshot (segnaposto) */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-8">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Uno sguardo all&apos;interno
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Anteprime delle schermate principali.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {SHOTS.map((s) => (
              <figure
                key={s.caption}
                className="overflow-hidden rounded-2xl border border-border/60 bg-card/40"
              >
                {/* SEGNAPOSTO — sostituire con <img src="/landing/..."> reale */}
                <div className="relative flex aspect-video items-center justify-center bg-gradient-to-br from-primary/10 via-card/30 to-background">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground/70">
                    <ImageIcon className="h-8 w-8" />
                    <span className="text-[11px] uppercase tracking-[0.2em]">
                      Segnaposto
                    </span>
                  </div>
                </div>
                <figcaption className="border-t border-border/40 px-4 py-3 text-xs text-muted-foreground">
                  {s.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      </main>

      {/* Footer minimale con contatti */}
      <footer className="border-t border-border/60 bg-card/20">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 py-8 text-sm sm:flex-row sm:items-center sm:px-8">
          <div className="space-y-1">
            <p className="font-semibold tracking-tight">Football Hub</p>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} · Tutti i diritti riservati
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <a
              href="mailto:aleguglielmo22@gmail.com"
              className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-primary"
            >
              <Mail className="h-4 w-4" />
              aleguglielmo22@gmail.com
            </a>
            <p className="text-xs text-muted-foreground/70">
              Alessandro Guglielmo · Match Analyst
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
