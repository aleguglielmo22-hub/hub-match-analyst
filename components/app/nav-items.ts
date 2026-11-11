import {
  Apple,
  Archive,
  BarChart3,
  BookOpen,
  Brain,
  Briefcase,
  CalendarClock,
  CalendarDays,
  Dumbbell,
  GraduationCap,
  HeartPulse,
  Home,
  Landmark,
  ListChecks,
  Newspaper,
  NotebookPen,
  PiggyBank,
  Repeat,
  RotateCcw,
  Salad,
  Settings,
  Tags,
  Target,
  Trash2,
  Users,
  UtensilsCrossed,
  Wallet,
  Activity,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  /** Etichetta breve per la barra in basso su mobile. */
  shortLabel?: string;
  icon: LucideIcon;
  /** Prefisso usato per il match attivo (es. /impostazioni → /impostazioni/*). */
  matchPrefix?: string;
  /** Se true, l'attivo richiede match esatto su href invece di startsWith. */
  exact?: boolean;
  /** Se true, mostrato solo se isOwner è true. */
  ownerOnly?: boolean;
};

export type NavArea = {
  key: "lavoro" | "studi" | "benessere" | "finanze";
  href: string;
  label: string;
  icon: LucideIcon;
  /** Descrizione breve per i riquadri della home. */
  description: string;
  children: NavItem[];
};

/**
 * Navigazione globale ad albero, ispirata a Notion:
 *   Home → Lavoro · Studi · Benessere · Finanze (espandibili) → Cestino · Impostazioni
 * Gli indirizzi del Lavoro restano quelli di sempre (/scouting, /archivio…):
 * "Lavoro" è solo un raggruppamento, così nessun link si rompe.
 */
export const HOME: NavItem = { href: "/dashboard", label: "Home", shortLabel: "Home", icon: Home, exact: true };

export const AREAS: NavArea[] = [
  {
    key: "lavoro",
    href: "/lavoro",
    label: "Lavoro",
    icon: Briefcase,
    description: "Scouting, calci piazzati, training, lavagna e Cloud.",
    children: [
      { href: "/scouting", label: "Scouting DB", icon: Users },
      { href: "/set-pieces", label: "Set Pieces DB", icon: Target },
      { href: "/situational", label: "Training", icon: Brain },
      { href: "/archivio", label: "Cloud", icon: Archive },
    ],
  },
  {
    key: "studi",
    href: "/studi",
    label: "Studi",
    icon: GraduationCap,
    description: "Libri, corsi, esami, riviste e ripassi.",
    children: [
      { href: "/studi/libri", label: "Libri", icon: BookOpen },
      { href: "/studi/corsi", label: "Corsi e università", icon: NotebookPen },
      { href: "/studi/esami", label: "Esami e scadenze", icon: CalendarClock },
      { href: "/studi/letture", label: "Riviste e letture", icon: Newspaper },
      { href: "/studi/ripasso", label: "Da ripassare", icon: RotateCcw },
    ],
  },
  {
    key: "benessere",
    href: "/benessere",
    label: "Benessere",
    icon: HeartPulse,
    description: "Parametri vitali, allenamenti e alimentazione.",
    children: [
      { href: "/benessere/allenati", label: "Allenati", icon: Dumbbell },
      { href: "/benessere/settimana", label: "La settimana", icon: CalendarDays },
      { href: "/benessere/parametri", label: "Parametri vitali", icon: Activity },
      { href: "/benessere/alimentazione", label: "Diario dei pasti", icon: UtensilsCrossed },
      { href: "/benessere/alimenti", label: "Alimenti", icon: Apple },
      { href: "/benessere/piani", label: "Piani alimentari", icon: Salad },
      { href: "/benessere/allenamenti", label: "Allenamenti svolti", icon: ClipboardList },
      { href: "/benessere/schede", label: "Schede", icon: ListChecks },
      { href: "/benessere/esercizi", label: "Esercizi", icon: Activity },
    ],
  },
  {
    key: "finanze",
    href: "/finanze",
    label: "Finanze",
    icon: Wallet,
    description: "Entrate, uscite, abbonamenti e risparmi.",
    children: [
      { href: "/finanze/riepilogo", label: "Riepilogo", icon: BarChart3 },
      { href: "/finanze/movimenti", label: "Entrate e uscite", icon: Wallet },
      { href: "/finanze/ricorrenti", label: "Ricorrenti e abbonamenti", icon: Repeat },
      { href: "/finanze/obiettivi", label: "Obiettivi di risparmio", icon: PiggyBank },
      { href: "/finanze/conti", label: "Conti", icon: Landmark },
      { href: "/finanze/categorie", label: "Categorie", icon: Tags },
    ],
  },
];

export const FOOTER_NAV: NavItem[] = [
  { href: "/cestino", label: "Cestino", icon: Trash2 },
  {
    href: "/impostazioni/preferenze",
    label: "Impostazioni",
    icon: Settings,
    matchPrefix: "/impostazioni",
    ownerOnly: true,
  },
];

// exact → match esatto (es. /dashboard, altrimenti matcherebbe i figli).
// Altri → startsWith su matchPrefix o href (al confine di segmento).
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.href;
  const prefix = item.matchPrefix ?? item.href;
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** L'area a cui appartiene una pagina (per evidenziarla e tenerla aperta). */
export function areaForPath(pathname: string): NavArea | null {
  return (
    AREAS.find(
      (a) =>
        isNavItemActive({ href: a.href, label: a.label, icon: a.icon }, pathname) ||
        a.children.some((c) => isNavItemActive(c, pathname)),
    ) ?? null
  );
}
