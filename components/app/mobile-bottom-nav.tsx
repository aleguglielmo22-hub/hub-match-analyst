"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV, isNavItemActive } from "./nav-items";
import { LinkPendingIcon } from "@/components/app/link-pending-icon";

/** Pagine con un form: al posto della barra compare la barra "Salva" del form. */
export function isFormRoute(pathname: string): boolean {
  return /\/(nuovo|modifica)$/.test(pathname);
}

const ITEMS = NAV.filter((item) => item.inBottomNav);

/**
 * Barra di navigazione in basso, solo su mobile (< 768 px).
 * Impostazioni ed esci restano nel menu ☰ in alto.
 * Rispetta l'area sicura dell'iPhone (safe-area-inset-bottom).
 */
export function MobileBottomNav() {
  const pathname = usePathname();
  if (isFormRoute(pathname)) return null;

  return (
    <nav
      aria-label="Sezioni"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-5">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = isNavItemActive(item, pathname);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <LinkPendingIcon className="h-5 w-5 shrink-0">
                  <Icon className="h-5 w-5 shrink-0" />
                </LinkPendingIcon>
                <span className="max-w-full truncate">
                  {item.shortLabel ?? item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
