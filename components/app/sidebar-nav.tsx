"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Archive,
  Brain,
  LayoutDashboard,
  Settings,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Prefisso usato per il match attivo (es. /impostazioni → /impostazioni/*). */
  matchPrefix?: string;
  /** Se true, l'attivo richiede match esatto su href invece di startsWith. */
  exact?: boolean;
  /** Se true, mostrato solo se isOwner è true. */
  ownerOnly?: boolean;
};

/**
 * Navigazione globale. L'IA primaria è:
 *   Dashboard → Scouting → Set Pieces → Situazionali → Archivio → Impostazioni
 * Archivio resta in nav come sezione storica/repository ma sotto le 3 verticali
 * tattiche. Solo l'OWNER vede Impostazioni.
 */
const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/scouting", label: "Scouting", icon: Users },
  { href: "/set-pieces", label: "Set Pieces", icon: Target },
  { href: "/situational", label: "Situazionali", icon: Brain },
  { href: "/archivio", label: "Archivio", icon: Archive },
  {
    href: "/impostazioni/collaboratori",
    label: "Impostazioni",
    icon: Settings,
    matchPrefix: "/impostazioni",
    ownerOnly: true,
  },
];

export function SidebarNav({
  isOwner,
  onNavigate,
}: {
  isOwner: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = NAV.filter((item) => !item.ownerOnly || isOwner);

  return (
    <nav className="flex flex-col gap-1 px-2 py-2">
      {items.map((item) => {
        const Icon = item.icon;
        // "/" → match esatto (altrimenti matcherebbe sempre).
        // Altri → startsWith su matchPrefix o href.
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.matchPrefix ?? item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 shrink-0 transition-colors",
                isActive
                  ? "text-primary"
                  : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80",
              )}
            />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
