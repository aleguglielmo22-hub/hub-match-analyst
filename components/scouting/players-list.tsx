"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { Loader2, ArrowDownUp, Users } from "lucide-react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { loadPlayersPage, type ScoutingSort } from "@/app/(app)/scouting/actions";
import { PlayerCard } from "@/components/scouting/player-card";
import { buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PlayerListItem } from "@/lib/types/scouting";
import type { ScoutingFilters } from "@/lib/schemas/scouting-filters";

const SORT_OPTIONS: { value: ScoutingSort; label: string }[] = [
  { value: "recent", label: "Aggiornati di recente" },
  { value: "alpha", label: "A → Z (cognome)" },
  { value: "scadenza", label: "Scadenza vicina" },
];

export function PlayersList({
  initialItems,
  initialHasMore,
  filters,
  hasActiveSearchOrFilters,
  currentUserId,
  isOwner,
}: {
  initialItems: PlayerListItem[];
  initialHasMore: boolean;
  filters: ScoutingFilters;
  hasActiveSearchOrFilters?: boolean;
  currentUserId: string | null;
  isOwner: boolean;
}) {
  const [items, setItems] = useState<PlayerListItem[]>(initialItems);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [sort, setSort] = useState<ScoutingSort>("recent");
  const [isPending, startTransition] = useTransition();
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const handleSortChange = useCallback(
    (value: string | null) => {
      if (!value) return;
      const next = value as ScoutingSort;
      setSort(next);
      setPage(0);
      setItems([]);
      setHasMore(true);
      startTransition(async () => {
        const res = await loadPlayersPage({ sort: next, page: 0, filters });
        setItems(res.items);
        setHasMore(res.hasMore);
      });
    },
    [filters],
  );

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    const next = page + 1;
    const res = await loadPlayersPage({ sort, page: next, filters });
    setItems((prev) => [...prev, ...res.items]);
    setHasMore(res.hasMore);
    setPage(next);
    setIsLoadingMore(false);
  }, [hasMore, isLoadingMore, page, sort, filters]);

  useEffect(() => {
    const target = sentinelRef.current;
    if (!target || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "200px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  const isEmpty = !isPending && items.length === 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {items.length === 0
            ? "Nessun giocatore"
            : items.length === 1
              ? "1 giocatore"
              : `${items.length} giocatori${hasMore ? "+" : ""}`}
        </p>
        <div className="flex items-center gap-2">
          <ArrowDownUp className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={sort} onValueChange={handleSortChange}>
            <SelectTrigger className="h-8 w-52 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isEmpty ? (
        hasActiveSearchOrFilters ? (
          <div className="mx-auto max-w-md rounded-2xl border border-dashed border-border/60 bg-card/20 py-12 text-center">
            <p className="text-sm font-medium">Nessun risultato</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Prova ad allargare i filtri o a riformulare la ricerca.
            </p>
          </div>
        ) : (
          <div className="mx-auto flex max-w-md flex-col items-center gap-5 rounded-2xl border border-dashed border-border/60 bg-card/20 py-12 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 ring-1 ring-primary/30 text-primary">
              <Users className="h-6 w-6" />
            </span>
            <div className="space-y-1">
              <p className="text-sm font-semibold">Database vuoto</p>
              <p className="text-xs text-muted-foreground">
                Aggiungi il primo giocatore al tuo network di osservazione.
              </p>
            </div>
            <Link
              href="/scouting/nuovo"
              className={buttonVariants({ size: "lg" })}
            >
              <Plus className="mr-2 h-4 w-4" />
              Aggiungi giocatore
            </Link>
          </div>
        )
      ) : (
        <>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
            {items.map((p) => (
              <PlayerCard
                key={p.id}
                player={p}
                canEdit={isOwner || p.created_by === currentUserId}
              />
            ))}
            {isPending &&
              Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={`skel-${i}`}
                  className="h-44 animate-pulse rounded-2xl border border-border/40 bg-card/30"
                />
              ))}
          </div>

          {hasMore && (
            <div
              ref={sentinelRef}
              className="flex items-center justify-center py-6"
            >
              {isLoadingMore ? (
                <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Carico altri giocatori…
                </span>
              ) : (
                <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">
                  Scorri per altri giocatori
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
