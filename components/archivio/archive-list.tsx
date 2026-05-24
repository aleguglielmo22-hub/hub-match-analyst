"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { Loader2, ArrowDownUp } from "lucide-react";
import { loadArchivePage } from "@/app/(app)/archivio/actions";
import {
  type ArchiveListItem,
  type ArchiveSort,
  SORT_LABEL,
} from "@/app/(app)/archivio/types";
import { ArchiveCard } from "@/components/archivio/archive-card";
import { ArchiveEmpty } from "@/components/archivio/archive-empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ArchiveFilters } from "@/lib/schemas/filters";

const SORT_OPTIONS: ArchiveSort[] = ["recent", "oldest", "az"];

type Props = {
  initialItems: ArchiveListItem[];
  initialHasMore: boolean;
  initialSort: ArchiveSort;
  filters: ArchiveFilters;
  query?: string;
  inTrash?: boolean;
  /** Mostra l'empty state come "nessun risultato" invece di "archivio vuoto" se filtri/query attivi. */
  hasActiveSearchOrFilters?: boolean;
};

export function ArchiveList({
  initialItems,
  initialHasMore,
  initialSort,
  filters,
  query,
  inTrash,
  hasActiveSearchOrFilters,
}: Props) {
  const [items, setItems] = useState<ArchiveListItem[]>(initialItems);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [sort, setSort] = useState<ArchiveSort>(initialSort);
  const [isPending, startTransition] = useTransition();
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const handleSortChange = useCallback(
    (value: string | null) => {
      if (!value) return;
      const nextSort = value as ArchiveSort;
      setSort(nextSort);
      setPage(0);
      setItems([]);
      setHasMore(true);
      startTransition(async () => {
        const res = await loadArchivePage({
          sort: nextSort,
          page: 0,
          filters,
          query,
          inTrash,
        });
        setItems(res.items);
        setHasMore(res.hasMore);
      });
    },
    [filters, query, inTrash],
  );

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;
    const res = await loadArchivePage({
      sort,
      page: nextPage,
      filters,
      query,
      inTrash,
    });
    setItems((prev) => [...prev, ...res.items]);
    setHasMore(res.hasMore);
    setPage(nextPage);
    setIsLoadingMore(false);
  }, [hasMore, isLoadingMore, page, sort, filters, query, inTrash]);

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

  const showEmpty = !isPending && items.length === 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {items.length === 0
            ? "Nessuna voce"
            : items.length === 1
              ? "1 voce"
              : `${items.length} voci${hasMore ? "+" : ""}`}
        </p>
        <div className="flex items-center gap-2">
          <ArrowDownUp className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={sort} onValueChange={handleSortChange}>
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt} className="text-xs">
                  {SORT_LABEL[opt]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {showEmpty ? (
        hasActiveSearchOrFilters ? (
          <div className="mx-auto max-w-md rounded-2xl border border-dashed border-border/60 bg-card/20 py-12 text-center">
            <p className="text-sm font-medium">Nessun risultato</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Prova ad allargare i filtri o a riformulare la ricerca.
            </p>
          </div>
        ) : (
          <ArchiveEmpty />
        )
      ) : (
        <>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <ArchiveCard key={item.id} item={item} />
            ))}
            {isPending &&
              Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={`skel-${i}`}
                  className="h-56 animate-pulse rounded-xl border border-border/40 bg-card/30"
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
                  Carico altre voci…
                </span>
              ) : (
                <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">
                  Scorri per altre voci
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
