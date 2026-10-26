"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Archive, Brain, Loader2, Plus, Search, Target, Users, X, type LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  searchLinkTargets,
  type LinkKind,
  type LinkTarget,
} from "@/app/(app)/collegamenti/actions";

export const LINK_KIND_ICON: Record<LinkKind, LucideIcon> = {
  player: Users,
  set_piece: Target,
  situational: Brain,
  archive: Archive,
};

const SEARCH_PLACEHOLDER: Record<LinkKind, string> = {
  player: "Cerca un giocatore per nome, squadra o ruolo…",
  set_piece: "Cerca un piazzato per titolo o squadra…",
  situational: "Cerca un'esercitazione per titolo…",
  archive: "Cerca nel Cloud per titolo…",
};

/**
 * Ricerca di elementi da collegare (mentre scrivi; a campo vuoto i più
 * recenti). Esclude quelli già collegati.
 */
export function LinkPicker({
  kind,
  excludeIds,
  onPick,
  disabled,
}: {
  kind: LinkKind;
  excludeIds: string[];
  onPick: (target: LinkTarget) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LinkTarget[] | null>(null);
  const [error, setError] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const t = setTimeout(() => {
      searchLinkTargets(kind, query)
        .then((r) => {
          if (!active) return;
          setResults(r);
          setError(false);
        })
        .catch(() => active && setError(true));
    }, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [kind, query, open]);

  // Chiude la lista toccando fuori.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const visible = (results ?? []).filter((r) => !excludeIds.includes(r.id));
  const Icon = LINK_KIND_ICON[kind];

  return (
    <div ref={boxRef} className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={query}
        disabled={disabled}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          // Invio qui non invia il form che contiene il selettore.
          if (e.key === "Enter") {
            e.preventDefault();
            if (visible[0]) {
              onPick(visible[0]);
              setQuery("");
            }
          }
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder={SEARCH_PLACEHOLDER[kind]}
        aria-label={SEARCH_PLACEHOLDER[kind]}
        autoComplete="off"
        className="h-10 pl-9 max-md:h-11"
      />
      {open && (
        <div className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-xl border border-border/60 bg-popover shadow-lg shadow-overlay/20">
          {error ? (
            <p className="px-3 py-3 text-xs text-destructive">Ricerca non riuscita. Riprova.</p>
          ) : results === null ? (
            <p className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carico…
            </p>
          ) : visible.length === 0 ? (
            <p className="px-3 py-3 text-xs text-muted-foreground">
              {query ? "Nessun risultato." : "Niente da collegare."}
            </p>
          ) : (
            <ul>
              {!query && (
                <li className="px-3 pb-1 pt-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Recenti
                </li>
              )}
              {visible.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(t);
                      setQuery("");
                    }}
                    className="flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/60"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{t.title}</span>
                      {t.subtitle && (
                        <span className="block truncate text-[11px] text-muted-foreground">{t.subtitle}</span>
                      )}
                    </span>
                    <Plus className="h-4 w-4 shrink-0 text-primary" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/** Riga di un collegamento: cliccabile verso l'elemento, con rimozione facoltativa. */
export function LinkRow({
  target,
  onRemove,
  removing,
  children,
}: {
  target: LinkTarget;
  onRemove?: () => void;
  removing?: boolean;
  /** Contenuto extra a destra (es. ruolo o esito). */
  children?: React.ReactNode;
}) {
  const Icon = LINK_KIND_ICON[target.kind];
  return (
    <li className="flex items-center gap-2 py-1.5">
      <Link
        href={target.href}
        className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/50"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{target.title}</span>
          {target.subtitle && (
            <span className="block truncate text-[11px] text-muted-foreground">{target.subtitle}</span>
          )}
        </span>
      </Link>
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={removing}
          aria-label={`Togli il collegamento con ${target.title}`}
          title="Togli collegamento"
          className={cn(
            "grid h-9 w-9 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive max-md:h-11 max-md:w-11",
            removing && "opacity-50",
          )}
        >
          {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
        </button>
      )}
    </li>
  );
}
