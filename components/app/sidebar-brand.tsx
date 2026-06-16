import Link from "next/link";

/**
 * Lockup brand della sidebar: logo emerald + nome.
 * In futuro qui sotto può comparire un selettore di workspace.
 */
export function SidebarBrand() {
  return (
    <Link
      href="/dashboard"
      className="flex items-center gap-2.5 px-4 py-4 transition-opacity hover:opacity-90"
    >
      <span className="relative grid h-8 w-8 place-items-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
        <span className="absolute inset-1 rounded-md bg-gradient-to-br from-primary/80 to-primary/40" />
        <span className="relative text-[11px] font-bold tracking-tight text-primary-foreground">
          FH
        </span>
      </span>
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
          Football Hub
        </span>
        <span className="text-[10px] uppercase tracking-[0.2em] text-sidebar-foreground/50">
          Performance · Scouting
        </span>
      </div>
    </Link>
  );
}
