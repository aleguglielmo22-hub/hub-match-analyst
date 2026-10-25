"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV, isNavItemActive } from "./nav-items";

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
        const isActive = isNavItemActive(item, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors max-md:min-h-11",
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
