import { LogOut, User as UserIcon } from "lucide-react";

/**
 * Footer della sidebar con email utente e logout.
 * Il logout è un form POST verso /auth/sign-out (Server Component-friendly).
 */
export function SidebarUser({ email }: { email: string }) {
  const initial = email.trim().charAt(0).toUpperCase();
  return (
    <div className="border-t border-sidebar-border/60 p-3">
      <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/15 ring-1 ring-primary/30 text-xs font-semibold text-primary">
          {initial || <UserIcon className="h-4 w-4" />}
        </span>
        <div className="flex-1 overflow-hidden">
          <p
            className="truncate text-xs font-medium text-sidebar-foreground"
            title={email}
          >
            {email}
          </p>
          <p className="text-[10px] uppercase tracking-[0.15em] text-sidebar-foreground/50">
            Connesso
          </p>
        </div>
        <form action="/auth/sign-out" method="post" className="shrink-0">
          <button
            type="submit"
            aria-label="Esci"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
