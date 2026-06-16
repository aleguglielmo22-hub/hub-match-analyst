import type { LucideIcon } from "lucide-react";

/**
 * Header di pagina condiviso da Dashboard e dalle sezioni operative
 * (Scouting DB, Set Pieces DB, Training, Cloud).
 *
 * Struttura uniforme: badge icona + eyebrow + titolo + sottotitolo,
 * con uno slot `actions` allineato a destra per i pulsanti di sezione.
 * Centralizzare qui garantisce coerenza visiva tra tutte le pagine.
 */
export function SectionHeader({
  icon: Icon,
  eyebrow = "Sezione",
  title,
  subtitle,
  actions,
}: {
  icon?: LucideIcon;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/30">
              <Icon className="h-5 w-5" />
            </span>
          )}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-primary">
              {eyebrow}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {title}
            </h1>
          </div>
        </div>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
