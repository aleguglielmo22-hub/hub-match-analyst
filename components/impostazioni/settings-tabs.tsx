import Link from "next/link";
import { DatabaseBackup, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "collaboratori", href: "/impostazioni/collaboratori", label: "Collaboratori", icon: Users },
  { key: "backup", href: "/impostazioni/backup", label: "Backup", icon: DatabaseBackup },
] as const;

/** Schede delle Impostazioni (solo owner). Target touch da 44 px. */
export function SettingsTabs({ active }: { active: (typeof TABS)[number]["key"] }) {
  return (
    <nav className="flex gap-2" aria-label="Sezioni impostazioni">
      {TABS.map((t) => {
        const Icon = t.icon;
        const isActive = t.key === active;
        return (
          <Link
            key={t.key}
            href={t.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors",
              isActive
                ? "border-primary/60 bg-primary/15 text-primary"
                : "border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
