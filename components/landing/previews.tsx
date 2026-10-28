import { Brain, Eye, FileText, Search, Target, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { ESITO_TONE, STATUS_OSSERVAZIONE_TONE, TONE, ratingTone } from "@/lib/tones";
import { computeSetPiecesEfficacy, type EfficacyRow } from "@/lib/set-pieces/efficacy";
import { highlightParts, SECTION_LABEL } from "@/lib/search/global-results";
import { STATUS_OSSERVAZIONE_LABEL } from "@/lib/types/scouting";
import { PhaseBlock } from "@/components/dashboard/set-pieces-efficacy";
import { VoteSparkline } from "@/components/scouting/vote-sparkline";

/**
 * Anteprime della landing ("Uno sguardo all'interno"): componenti e colori
 * dell'app con dati di esempio inventati. Nessun dato reale, nessun link
 * verso le pagine protette.
 */

function Frame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none select-none p-4 sm:p-5", className)}>
      {children}
    </div>
  );
}

/* Dashboard ---------------------------------------------------------------- */

const KPIS = [
  { icon: Users, label: "Giocatori", value: 128 },
  { icon: Eye, label: "Osservazioni", value: 342 },
  { icon: Target, label: "Piazzati", value: 64 },
  { icon: Brain, label: "Esercitazioni", value: 37 },
];

export function DashboardPreview() {
  return (
    <Frame className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {KPIS.map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-xl border border-border/60 bg-card/60 p-3">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              <Icon className="h-3.5 w-3.5 text-primary" />
              {label}
            </div>
            <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/10 p-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/30">
          <Eye className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">+ Osservazione</p>
          <p className="truncate text-[11px] text-muted-foreground">
            Giocatore, partita, voto e nota in 30 secondi
          </p>
        </div>
      </div>
    </Frame>
  );
}

/* Scheda giocatore ------------------------------------------------------------ */

const VOTI = [
  { date: "2026-02-08", voto: 6 },
  { date: "2026-03-01", voto: 6.5 },
  { date: "2026-03-22", voto: 7 },
  { date: "2026-04-12", voto: 6.5 },
  { date: "2026-05-03", voto: 8 },
];

export function PlayerPreview() {
  const last = VOTI[VOTI.length - 1].voto;
  return (
    <Frame className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold tracking-tight">Marco Esempio</p>
          <p className="truncate text-xs text-muted-foreground">Difensore centrale · FC Demo · 2005</p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-md px-2 py-0.5 text-sm font-semibold tabular-nums ring-1",
            TONE[ratingTone(last)].badge,
          )}
        >
          {last}
        </span>
      </div>
      <span
        className={cn(
          "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ring-1",
          TONE[STATUS_OSSERVAZIONE_TONE.IN_OSSERVAZIONE].badge,
        )}
      >
        {STATUS_OSSERVAZIONE_LABEL.IN_OSSERVAZIONE}
      </span>
      <VoteSparkline points={VOTI} />
      <p className="rounded-lg border border-border/50 bg-card/60 px-3 py-2 text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground">3 mag 2026 · voto 8</span> — Domina
        nel gioco aereo, prima uscita palla al piede pulita sotto pressione.
      </p>
    </Frame>
  );
}

/* Piazzati ------------------------------------------------------------------ */

const SET_PIECES: EfficacyRow[] = [
  ...Array.from({ length: 5 }, () => ({ fase: "OFFENSIVO", tipo_piazzato: "ANGOLO", esito_finale: "TIRO_IN_PORTA" }) as const),
  ...Array.from({ length: 2 }, () => ({ fase: "OFFENSIVO", tipo_piazzato: "ANGOLO", esito_finale: "GOL" }) as const),
  ...Array.from({ length: 4 }, () => ({ fase: "OFFENSIVO", tipo_piazzato: "ANGOLO", esito_finale: "LIBERATO_DIFESA" }) as const),
  ...Array.from({ length: 3 }, () => ({ fase: "OFFENSIVO", tipo_piazzato: "PUNIZIONE", esito_finale: "TIRO_IN_PORTA" }) as const),
  ...Array.from({ length: 1 }, () => ({ fase: "OFFENSIVO", tipo_piazzato: "PUNIZIONE", esito_finale: "GOL" }) as const),
  ...Array.from({ length: 3 }, () => ({ fase: "OFFENSIVO", tipo_piazzato: "PUNIZIONE", esito_finale: "TIRO_FUORI" }) as const),
];

export function SetPiecesPreview() {
  const efficacy = computeSetPiecesEfficacy(SET_PIECES, ESITO_TONE);
  return (
    <Frame>
      <PhaseBlock
        data={efficacy.OFFENSIVO}
        title="Efficacia offensiva"
        riuscitiLabel="esiti positivi"
        golLabel="gol fatti"
        linkToList={false}
      />
    </Frame>
  );
}

/* Ricerca globale ------------------------------------------------------------ */

const QUERY = "esempio";

const RESULTS: { section: string; icon: typeof Users; title: string; subtitle: string }[] = [
  { section: SECTION_LABEL.player, icon: Users, title: "Marco Esempio", subtitle: "Difensore centrale · FC Demo" },
  { section: SECTION_LABEL.set_piece, icon: Target, title: "Angolo a rientrare – Esempio sul 1° palo", subtitle: "FC Demo vs Atletico Prova" },
  { section: "Collegati a Marco Esempio", icon: FileText, title: "Report FC Demo – Atletico Prova", subtitle: "Cloud · Report partita" },
];

function Highlighted({ text }: { text: string }) {
  return highlightParts(text, QUERY).map((p, i) =>
    p.match ? (
      <mark key={i} className="rounded-sm bg-primary/20 px-0.5 text-foreground">
        {p.text}
      </mark>
    ) : (
      <span key={i}>{p.text}</span>
    ),
  );
}

export function SearchPreview() {
  return (
    <Frame className="space-y-3">
      <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-3 py-2 text-sm">
        <Search className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1">{QUERY}</span>
        <kbd className="rounded border border-border/60 px-1.5 text-[10px] text-muted-foreground">⌘K</kbd>
      </div>
      <ul className="space-y-2">
        {RESULTS.map(({ section, icon: Icon, title, subtitle }) => (
          <li key={title}>
            <p className="mb-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{section}</p>
            <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-card/60 px-3 py-2">
              <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">
                  <Highlighted text={title} />
                </p>
                <p className="truncate text-[10px] text-muted-foreground">{subtitle}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Frame>
  );
}
