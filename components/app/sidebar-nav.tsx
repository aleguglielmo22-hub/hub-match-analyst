"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { AREAS, FOOTER_NAV, HOME, areaForPath, isNavItemActive, type NavItem } from "./nav-items";
import { LinkPendingIcon } from "@/components/app/link-pending-icon";

const OPEN_KEY = "ag.sidebar.aree-aperte";

function readOpen(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(OPEN_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function NavLink({
  item,
  pathname,
  onNavigate,
  nested,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
  nested?: boolean;
}) {
  const Icon = item.icon;
  const isActive = isNavItemActive(item, pathname);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-colors max-md:min-h-11",
        nested ? "pl-9 pr-3 text-[13px]" : "px-3",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
      )}
    >
      <LinkPendingIcon className="h-4 w-4 shrink-0 text-sidebar-primary">
        <Icon
          className={cn(
            "h-4 w-4 shrink-0 transition-colors",
            isActive ? "text-sidebar-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80",
          )}
        />
      </LinkPendingIcon>
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

/**
 * Barra laterale ad albero: le 4 aree si aprono e si chiudono; l'area della
 * pagina corrente resta aperta. Le aree aperte sono ricordate dal browser.
 */
export function SidebarNav({
  isOwner,
  onNavigate,
}: {
  isOwner: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const current = areaForPath(pathname);
  const [open, setOpen] = useState<string[]>([]);

  useEffect(() => {
    // localStorage esiste solo nel browser: lettura al montaggio.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(readOpen());
  }, []);

  function toggle(key: string) {
    setOpen((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      try {
        localStorage.setItem(OPEN_KEY, JSON.stringify(next));
      } catch {
        // Archivio del browser non disponibile: si ricorda solo fino alla chiusura.
      }
      return next;
    });
  }

  const footer = FOOTER_NAV.filter((item) => !item.ownerOnly || isOwner);

  return (
    <nav className="flex flex-col gap-1 px-2 py-2" aria-label="Navigazione">
      <NavLink item={HOME} pathname={pathname} onNavigate={onNavigate} />

      <div className="mt-2 flex flex-col gap-0.5">
        {AREAS.map((area) => {
          const isOpen = open.includes(area.key) || current?.key === area.key;
          const areaActive = pathname === area.href;
          const inArea = current?.key === area.key;
          const Icon = area.icon;
          const listId = `nav-${area.key}`;
          return (
            <div key={area.key}>
              <div
                className={cn(
                  "flex items-center rounded-lg transition-colors",
                  areaActive ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/60",
                )}
              >
                <button
                  type="button"
                  onClick={() => toggle(area.key)}
                  aria-expanded={isOpen}
                  aria-controls={listId}
                  aria-label={isOpen ? `Chiudi ${area.label}` : `Apri ${area.label}`}
                  className="grid h-9 w-8 shrink-0 place-items-center rounded-lg text-sidebar-foreground/50 hover:text-sidebar-foreground max-md:h-11"
                >
                  <ChevronRight className={cn("h-4 w-4 transition-transform", isOpen && "rotate-90")} />
                </button>
                <Link
                  href={area.href}
                  onClick={onNavigate}
                  aria-current={areaActive ? "page" : undefined}
                  className={cn(
                    "flex flex-1 items-center gap-2.5 py-2 pr-3 text-sm font-semibold max-md:min-h-11",
                    inArea ? "text-sidebar-foreground" : "text-sidebar-foreground/80",
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", inArea ? "text-sidebar-primary" : "text-sidebar-foreground/50")} />
                  {area.label}
                </Link>
              </div>
              {isOpen && (
                <div id={listId} className="flex flex-col gap-0.5 py-0.5">
                  {area.children.map((item) => (
                    <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} nested />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-col gap-1 border-t border-sidebar-border/60 pt-3">
        {footer.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
        ))}
      </div>
    </nav>
  );
}
