"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import {
  Archive,
  Brain,
  Clock,
  Eye,
  Loader2,
  Plus,
  Search,
  Target,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { LoadErrorBox } from "@/components/app/load-error";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { globalSearch } from "@/app/(app)/ricerca/actions";
import {
  groupSearchResults,
  highlightParts,
  type SearchGroup,
  type SearchKind,
  type SearchResult,
} from "@/lib/search/global-results";
import {
  recentOpened,
  recentQueries,
  rememberOpened,
  rememberQuery,
  type RecentItem,
} from "@/lib/search/recent";

const KIND_ICON: Record<SearchKind, LucideIcon> = {
  player: Users,
  observation: Eye,
  set_piece: Target,
  situational: Brain,
  archive: Archive,
};

const MIN_CHARS = 2;
const DELAY_MS = 250;

/* ============================================================
 * Contesto: apertura del pannello da qualsiasi punto (+ Cmd/Ctrl+K)
 * ============================================================ */

const SearchContext = createContext<{ open: () => void }>({ open: () => {} });

export function GlobalSearchProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const value = useMemo(() => ({ open: () => setIsOpen(true) }), []);

  return (
    <SearchContext.Provider value={value}>
      {children}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          showCloseButton={false}
          className={cn(
            "flex flex-col gap-0 overflow-hidden p-0 sm:top-[12vh] sm:max-w-xl sm:-translate-y-0",
            // Su mobile a tutto schermo.
            "max-sm:inset-0 max-sm:h-dvh max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none",
          )}
        >
          <DialogTitle className="sr-only">Cerca in tutte le sezioni</DialogTitle>
          {isOpen && <SearchPanel onClose={() => setIsOpen(false)} />}
        </DialogContent>
      </Dialog>
    </SearchContext.Provider>
  );
}

export function useGlobalSearch() {
  return useContext(SearchContext);
}

/** Casella "Cerca…" nella sidebar (desktop). */
export function SidebarSearchTrigger() {
  const { open } = useGlobalSearch();
  return (
    <button
      type="button"
      onClick={open}
      className="mx-2 mb-1 flex items-center gap-2 rounded-lg border border-sidebar-border/70 bg-sidebar-accent/30 px-3 py-2 text-left text-sm text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground max-md:min-h-11"
    >
      <Search className="h-4 w-4 shrink-0" />
      <span className="flex-1">Cerca…</span>
      <kbd className="rounded border border-sidebar-border px-1.5 text-[10px] font-medium text-sidebar-foreground/50 max-md:hidden">
        ⌘K
      </kbd>
    </button>
  );
}

/** Icona di ricerca nella barra in alto (mobile). */
export function MobileSearchButton() {
  const { open } = useGlobalSearch();
  return (
    <button
      type="button"
      onClick={open}
      aria-label="Cerca in tutte le sezioni"
      className="ml-auto inline-flex h-11 w-11 items-center justify-center rounded-md text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
    >
      <Search className="h-5 w-5" />
    </button>
  );
}

/* ============================================================
 * Pannello
 * ============================================================ */

type Status = "idle" | "loading" | "done" | "error";

function SearchPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [active, setActive] = useState(0);
  // Letti una volta all'apertura (il pannello esiste solo nel browser).
  const [recentQ] = useState(recentQueries);
  const [recentO] = useState(recentOpened);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);
  const listRef = useRef<HTMLDivElement | null>(null);

  const run = useCallback(async (q: string) => {
    const id = ++requestId.current;
    setStatus("loading");
    const res = await globalSearch(q).catch(() => ({ ok: false as const }));
    // Una risposta vecchia non sovrascrive quella della ricerca più recente.
    if (id !== requestId.current) return;
    if (!res.ok) {
      setStatus("error");
      return;
    }
    setGroups(groupSearchResults(res.rows));
    setActive(0);
    setStatus("done");
  }, []);

  function onChange(value: string) {
    setQuery(value);
    if (timer.current) clearTimeout(timer.current);
    const q = value.trim();
    if (q.length < MIN_CHARS) {
      requestId.current++;
      setStatus("idle");
      setGroups([]);
      setActive(0);
      return;
    }
    timer.current = setTimeout(() => void run(q), DELAY_MS);
  }

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const searching = query.trim().length >= MIN_CHARS;
  // Elementi navigabili con le frecce: risultati, oppure i recenti a campo vuoto.
  const flat: { href: string; item: RecentItem }[] = searching
    ? groups.flatMap((g) => g.results.map((r) => ({ href: r.href, item: toRecent(r) })))
    : recentO.map((r) => ({ href: r.href, item: r }));

  function openItem(item: RecentItem) {
    if (searching) rememberQuery(query);
    rememberOpened(item);
    onClose();
    router.push(item.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!flat.length) return;
      const next = (active + (e.key === "ArrowDown" ? 1 : -1) + flat.length) % flat.length;
      setActive(next);
      listRef.current
        ?.querySelector(`[data-index="${next}"]`)
        ?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = flat[active];
      if (target) openItem(target.item);
    }
  }

  let index = -1;
  const nextIndex = () => ++index;

  return (
    <div className="flex min-h-0 flex-1 flex-col" onKeyDown={onKeyDown}>
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          autoFocus
          type="search"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Cerca giocatori, osservazioni, piazzati, esercitazioni, Cloud…"
          aria-label="Cerca in tutte le sezioni"
          autoComplete="off"
          enterKeyHint="search"
          className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground sm:text-sm"
        />
        {status === "loading" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        <button
          type="button"
          onClick={onClose}
          aria-label="Chiudi ricerca"
          className="grid h-11 w-11 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-2 sm:max-h-[60vh]">
        {!searching ? (
          <EmptyState
            queries={recentQ}
            opened={recentO}
            active={active}
            onQuery={(q) => onChange(q)}
            onOpen={openItem}
          />
        ) : status === "error" ? (
          <div className="p-2">
            <LoadErrorBox onRetry={() => void run(query.trim())} />
          </div>
        ) : status === "done" && groups.length === 0 ? (
          <NoResults query={query} onNavigate={onClose} />
        ) : (
          groups.map((g) => (
            <section key={g.key} className="mb-2">
              <h3 className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {g.label}
              </h3>
              <ul>
                {g.results.map((r) => {
                  const i = nextIndex();
                  return (
                    <li key={r.key}>
                      <ResultButton
                        result={r}
                        query={query}
                        index={i}
                        active={i === active}
                        onHover={() => setActive(i)}
                        onOpen={() => openItem(toRecent(r))}
                      />
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>

      <p className="border-t border-border/60 px-3 py-2 text-[10px] text-muted-foreground max-sm:hidden">
        ↑ ↓ per scegliere · Invio per aprire · Esc per chiudere
      </p>
    </div>
  );
}

function toRecent(r: SearchResult): RecentItem {
  return { kind: r.kind, id: r.id, title: r.title, subtitle: r.subtitle, href: r.href };
}

function Highlight({ text, query }: { text: string; query: string }) {
  return (
    <>
      {highlightParts(text, query).map((p, i) =>
        p.match ? (
          <mark key={i} className="rounded-sm bg-tone-warning-soft px-0.5 text-foreground">
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

function ResultButton({
  result,
  query,
  index,
  active,
  onHover,
  onOpen,
}: {
  result: SearchResult;
  query: string;
  index: number;
  active: boolean;
  onHover: () => void;
  onOpen: () => void;
}) {
  const Icon = KIND_ICON[result.kind];
  return (
    <button
      type="button"
      data-index={index}
      onClick={onOpen}
      onMouseMove={onHover}
      className={cn(
        "flex min-h-12 w-full items-center gap-3 rounded-lg px-2 py-2 text-left",
        active ? "bg-muted" : "hover:bg-muted/60",
      )}
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          <Highlight text={result.title} query={query} />
        </span>
        {result.subtitle && (
          <span className="block truncate text-[11px] text-muted-foreground">
            <Highlight text={result.subtitle} query={query} />
          </span>
        )}
      </span>
      {result.date && (
        <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
          {format(parseISO(result.date), "dd/MM/yyyy")}
        </span>
      )}
    </button>
  );
}

function EmptyState({
  queries,
  opened,
  active,
  onQuery,
  onOpen,
}: {
  queries: string[];
  opened: RecentItem[];
  active: number;
  onQuery: (q: string) => void;
  onOpen: (item: RecentItem) => void;
}) {
  if (!queries.length && !opened.length) {
    return (
      <p className="px-3 py-8 text-center text-sm text-muted-foreground">
        Scrivi almeno 2 lettere: cerco in giocatori, osservazioni, piazzati, esercitazioni e Cloud.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {queries.length > 0 && (
        <section>
          <h3 className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Ricerche recenti
          </h3>
          <div className="flex flex-wrap gap-2 px-2">
            {queries.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => onQuery(q)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border/60 px-3 text-xs text-foreground/80 hover:bg-muted max-md:min-h-11"
              >
                <Clock className="h-3 w-3 text-muted-foreground" />
                {q}
              </button>
            ))}
          </div>
        </section>
      )}
      {opened.length > 0 && (
        <section>
          <h3 className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Aperti di recente
          </h3>
          <ul>
            {opened.map((o, i) => (
              <li key={o.href}>
                <ResultButton
                  result={{ ...o, key: o.href, date: null }}
                  query=""
                  index={i}
                  active={i === active}
                  onHover={() => {}}
                  onOpen={() => onOpen(o)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function NoResults({ query, onNavigate }: { query: string; onNavigate: () => void }) {
  const actions = [
    { href: "/scouting/osservazioni/nuova", label: "+ Osservazione" },
    { href: "/scouting/nuovo", label: "+ Giocatore" },
    { href: "/set-pieces/nuovo", label: "+ Piazzato" },
  ];
  return (
    <div className="space-y-4 px-3 py-8 text-center">
      <div className="space-y-1">
        <p className="text-sm font-medium">Nessun risultato per «{query.trim()}»</p>
        <p className="text-xs text-muted-foreground">
          Controlla l&apos;ortografia o prova con meno parole. Se non esiste ancora, aggiungilo:
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {actions.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            onClick={onNavigate}
            className={buttonVariants({ variant: "outline", size: "default" })}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            {a.label.replace("+ ", "")}
          </Link>
        ))}
      </div>
    </div>
  );
}
