import {
  Archive,
  Brain,
  LayoutDashboard,
  Settings,
  Target,
  Trash2,
  Users,
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
  /** Se true, compare anche nella barra di navigazione in basso (mobile). */
  inBottomNav?: boolean;
};

/**
 * Navigazione globale. L'IA primaria è:
 *   Dashboard → Scouting DB → Set Pieces DB → Training → Cloud → Impostazioni
 * Cloud resta in nav come repository file ma sotto le verticali operative.
 * Il Cestino (unico per tutte le sezioni) sta in fondo, prima delle
 * Impostazioni; su mobile è nel menu ☰, non nella barra in basso.
 * Solo l'OWNER vede Impostazioni.
 * NB: le label sono solo testo; gli slug URL restano invariati.
 */
export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", shortLabel: "Dashboard", icon: LayoutDashboard, exact: true, inBottomNav: true },
  { href: "/scouting", label: "Scouting DB", shortLabel: "Scouting", icon: Users, inBottomNav: true },
  { href: "/set-pieces", label: "Set Pieces DB", shortLabel: "Set Pieces", icon: Target, inBottomNav: true },
  { href: "/situational", label: "Training", shortLabel: "Training", icon: Brain, inBottomNav: true },
  { href: "/archivio", label: "Cloud", shortLabel: "Cloud", icon: Archive, inBottomNav: true },
  { href: "/cestino", label: "Cestino", icon: Trash2 },
  {
    href: "/impostazioni/collaboratori",
    label: "Impostazioni",
    icon: Settings,
    matchPrefix: "/impostazioni",
    ownerOnly: true,
  },
];

// exact → match esatto (es. /dashboard, altrimenti matcherebbe i figli).
// Altri → startsWith su matchPrefix o href.
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  return item.exact
    ? pathname === item.href
    : pathname.startsWith(item.matchPrefix ?? item.href);
}
