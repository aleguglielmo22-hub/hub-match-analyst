import Link from "next/link";
import { formatDistanceToNow, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import {
  Brain,
  ChevronRight,
  Crown,
  Target,
  User as UserIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  loadRecentPlayers,
  loadRecentSchemes,
  type RecentItem,
  type RecentPlayer,
} from "@/app/(app)/dashboard-queries";
import {
  RUOLO_LABEL,
  VOTO_POTENZIALE_SHORT,
} from "@/lib/types/scouting";

/** Riga giocatore recente. */
function PlayerRow({ p }: { p: RecentPlayer }) {
  const initials = `${(p.nome ?? "").charAt(0)}${(p.cognome ?? "").charAt(0)}`.toUpperCase();
  const isElite = p.voto_potenziale === "A1" || p.voto_potenziale === "A2";

  return (
    <Link
      href={`/scouting/${p.id}`}
      className="group flex items-center gap-3 rounded-lg border border-border/40 bg-card/30 px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-card/60"
    >
      {p.foto_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={p.foto_url}
          alt=""
          loading="lazy"
          className="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-border/50"
        />
      ) : (
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-xs font-bold uppercase text-primary ring-1 ring-primary/30">
          {initials || <UserIcon className="h-4 w-4" />}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {p.nome} <span className="uppercase">{p.cognome}</span>
        </p>
        <p className="truncate text-[11px] text-muted-foreground">
          {p.ruolo_principale
            ? RUOLO_LABEL[p.ruolo_principale]
            : "Ruolo non specificato"}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {p.voto_potenziale && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1",
              isElite
                ? "bg-emerald-500/15 text-emerald-200 ring-emerald-400/30"
                : "bg-muted/40 text-muted-foreground ring-border/40",
            )}
          >
            {isElite && <Crown className="h-2.5 w-2.5" />}
            {p.voto_potenziale}
          </span>
        )}
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-foreground" />
      </div>
    </Link>
  );
}

/** Riga schema/situazionale recente. */
function SchemeRow({ item }: { item: RecentItem }) {
  const Icon = item.kind === "set_piece" ? Target : Brain;
  const href =
    item.kind === "set_piece"
      ? `/set-pieces/${item.id}`
      : `/situational/${item.id}`;
  const timeAgo = formatDistanceToNow(parseISO(item.updated_at), {
    locale: it,
    addSuffix: true,
  });

  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-lg border border-border/40 bg-card/30 px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-card/60"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.titolo}</p>
        <p className="truncate text-[11px] text-muted-foreground">
          {item.subtitle} · {timeAgo}
        </p>
      </div>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 group-hover:text-foreground" />
    </Link>
  );
}

/** Server Component asincrono: carica e renderizza l'attività recente. */
export async function RecentActivity() {
  const [recentPlayers, recentSchemes] = await Promise.all([
    loadRecentPlayers(),
    loadRecentSchemes(3),
  ]);

  return (
    <section className="rounded-2xl border border-border/60 bg-card/40 p-5">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight">
          Attività recente
        </h2>
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Ultimi inserimenti
        </p>
      </header>

      <div className="space-y-5">
        {/* Players block */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80">
              Giocatori
            </h3>
            <Link
              href="/scouting"
              className="text-[10px] text-muted-foreground hover:text-foreground"
            >
              Vedi tutti →
            </Link>
          </div>
          {recentPlayers.length === 0 ? (
            <p className="rounded-md border border-dashed border-border/40 bg-card/20 px-3 py-3 text-[11px] text-muted-foreground">
              Nessun giocatore inserito ancora.
            </p>
          ) : (
            <div className="space-y-1.5">
              {recentPlayers.map((p) => (
                <PlayerRow key={p.id} p={p} />
              ))}
            </div>
          )}
        </div>

        {/* Schemes block */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80">
              Schemi & esercitazioni
            </h3>
          </div>
          {recentSchemes.length === 0 ? (
            <p className="rounded-md border border-dashed border-border/40 bg-card/20 px-3 py-3 text-[11px] text-muted-foreground">
              Nessuno schema o esercitazione ancora.
            </p>
          ) : (
            <div className="space-y-1.5">
              {recentSchemes.map((item) => (
                <SchemeRow key={`${item.kind}-${item.id}`} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// silenzio eventuale unused
void VOTO_POTENZIALE_SHORT;
