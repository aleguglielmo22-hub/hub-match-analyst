import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Archive,
  ArrowRight,
  Brain,
  Link2,
  Search,
  Smartphone,
  Target,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import {
  DashboardPreview,
  PlayerPreview,
  SearchPreview,
  SetPiecesPreview,
} from "@/components/landing/previews";

export const metadata = {
  title: "AG Workspace — Scouting & Analisi per Match Analyst",
  description:
    "Database scouting e palle inattive, training e catalogo di partite, clip e documenti in un unico hub per il match analyst.",
};

// La home è pubblica: la rendiamo dinamica perché controlliamo la sessione.
export const dynamic = "force-dynamic";

/** Le 4 sezioni operative, stesse icone della navigazione interna. */
const FEATURES = [
  {
    icon: Users,
    title: "Scouting DB",
    desc: "Schede giocatore con 47 voti e osservazioni datate: lo storico mostra come cresce ogni profilo. Filtri per ruolo, scadenza e potenziale.",
  },
  {
    icon: Target,
    title: "Set Pieces DB",
    desc: "Angoli, punizioni, rimesse e rigori, offensivi e difensivi. Giocatori coinvolti, esito ed efficacia separata per fase.",
  },
  {
    icon: Brain,
    title: "Training",
    desc: "Catalogo di esercitazioni e situazioni di gioco. Pattern offensivi e difensivi organizzati per fase e obiettivo.",
  },
  {
    icon: Archive,
    title: "Cloud",
    desc: "Catalogo di partite, clip e documenti con link ai tuoi archivi esterni. Tag, stagioni e collegamenti a giocatori, piazzati ed esercitazioni.",
  },
];

/** Cosa tiene insieme le quattro aree. */
const HIGHLIGHTS = [
  {
    icon: Link2,
    title: "Sezioni collegate",
    desc: "Un giocatore porta ai suoi piazzati e ai materiali del Cloud, e viceversa.",
  },
  {
    icon: Search,
    title: "Ricerca globale",
    desc: "Una sola barra (⌘K / Ctrl+K) cerca in tutte le sezioni, anche senza accenti.",
  },
  {
    icon: Smartphone,
    title: "App installabile",
    desc: "Si aggiunge alla schermata Home del telefono e si apre come un'app.",
  },
];

/** Anteprime fatte con i componenti dell'app e dati di esempio inventati. */
const SHOTS = [
  { caption: "Dashboard — numeri e azioni rapide", Preview: DashboardPreview },
  { caption: "Scheda giocatore — voti e osservazioni nel tempo", Preview: PlayerPreview },
  { caption: "Set Pieces DB — efficacia per fase", Preview: SetPiecesPreview },
  { caption: "Ricerca globale — risultati da tutte le sezioni", Preview: SearchPreview },
];

export default async function LandingPage() {
  // Senza configurazione la landing resta visibile (il messaggio compare al login).
  const user = getSupabaseConfig()
    ? (await (await createClient()).auth.getUser()).data.user
    : null;

  // Utente già autenticato sulla home → lo portiamo alla dashboard.
  if (user) redirect("/dashboard");

  return (
    <div className="flex min-h-full flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
          <Logo />
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
              AG Workspace
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Database scouting e palle inattive, training e un catalogo di
              partite, clip e documenti con link ai tuoi archivi: sezioni
              collegate tra loro, una ricerca unica e un&apos;app da installare
              anche sul telefono.
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
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/30">
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
          <ul className="mt-6 grid gap-4 sm:grid-cols-3">
            {HIGHLIGHTS.map((h) => {
              const Icon = h.icon;
              return (
                <li
                  key={h.title}
                  className="flex gap-3 rounded-2xl border border-border/60 bg-card/20 p-4"
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-semibold tracking-tight">{h.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {h.desc}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Anteprime con dati di esempio */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-8">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Uno sguardo all&apos;interno
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Anteprime delle schermate principali, con dati di esempio.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {SHOTS.map(({ caption, Preview }) => (
              <figure
                key={caption}
                className="flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/40"
              >
                <div className="flex-1 bg-gradient-to-br from-primary/10 via-card/30 to-background">
                  <Preview />
                </div>
                <figcaption className="border-t border-border/40 px-4 py-3 text-xs text-muted-foreground">
                  {caption}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      </main>

      {/* Footer minimale */}
      <footer className="border-t border-border/60 bg-card/20">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 py-8 text-sm sm:flex-row sm:items-center sm:px-8">
          <div className="space-y-1">
            <p className="font-semibold tracking-tight">AG Workspace</p>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} · Tutti i diritti riservati
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <p className="text-xs text-muted-foreground/70">
              Alessandro Guglielmo · Match Analyst
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
