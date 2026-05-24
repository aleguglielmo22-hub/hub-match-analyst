"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { Loader2, ArrowDownUp, Trash } from "lucide-react";
import { loadArchivePage } from "@/app/(app)/archivio/actions";
import {
  type ArchiveListItem,
  type ArchiveSort,
  SORT_LABEL,
} from "@/app/(app)/archivio/types";
import { TrashCard } from "@/components/archivio/trash-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EMPTY_FILTERS } from "@/lib/schemas/filters";

const SORT_OPTIONS: ArchiveSort[] = ["recent", "oldest", "az"];

export function TrashList({
  initialItems,
  initialHasMore,
  query,
}: {
  initialItems: ArchiveListItem[];
  initialHasMore: boolean;
  query?: string;
}) {
  const [items, setItems] = useState<ArchiveListItem[]>(initialItems);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [sort, setSort] = useState<ArchiveSort>("recent");
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
          filters: EMPTY_FILTERS,
          query,
          inTrash: true,
        });
        setItems(res.items);
        setHasMore(res.hasMore);
      });
    },
    [query],
  );

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;
    const res = await loadArchivePage({
      sort,
      page: nextPage,
      filters: EMPTY_FILTERS,
      query,
      inTrash: true,
    });
    setItems((prev) => [...prev, ...res.items]);
    setHasMore(res.hasMore);
    setPage(nextPage);
    setIsLoadingMore(false);
  }, [hasMore, isLoadingMore, page, sort, query]);

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

  const handleRemoved = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const isEmpty = !isPending && items.length === 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {items.length === 0
            ? "Cestino vuoto"
            : items.length === 1
              ? "1 voce nel cestino"
              : `${items.length} voci nel cestino${hasMore ? "+" : ""}`}
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

      {isEmpty ? (
        <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-dashed border-border/60 bg-card/20 py-12 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <Trash className="h-5 w-5" />
          </span>
          <p className="text-sm font-medium">
            {query ? "Nessun risultato nel cestino" : "Il cestino è vuoto"}
          </p>
          <p className="text-xs text-muted-foreground">
            {query
              ? "Prova un&apos;altra ricerca."
              : "Le voci che sposti qui resteranno per 30 giorni prima dell&apos;eliminazione definitiva."}
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <TrashCard
                key={item.id}
                item={item}
                onRemoved={handleRemoved}
              />
            ))}
            {isPending &&
              Array.from({ length: 3 }).map((_, i) => (
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
