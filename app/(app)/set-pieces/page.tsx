import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { SetPiecesList } from "@/components/set-pieces/set-pieces-list";
import { SetPiecesFiltersSidebar } from "@/components/set-pieces/set-pieces-filters-sidebar";
import { SetPiecesFiltersMobileTrigger } from "@/components/set-pieces/set-pieces-filters-mobile-trigger";
import { SearchInput } from "@/components/archivio/search-input";
import { loadSetPiecesPage } from "./actions";
import {
  countActiveSetPiecesFilters,
  parseSetPiecesFiltersFromSearchParams,
} from "@/lib/schemas/set-pieces-filters";

export const metadata = {
  title: "Set Pieces · Hub Match Analyst",
};

export const dynamic = "force-dynamic";

export default async function SetPiecesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseSetPiecesFiltersFromSearchParams(sp);

  const initialPage = await loadSetPiecesPage({
    sort: "recent",
    page: 0,
    filters,
  });

  const activeCount = countActiveSetPiecesFilters(filters);
  const hasActiveSearchOrFilters = activeCount > 0 || !!filters.q;
  const stateKey = JSON.stringify(filters);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.25em] text-primary font-semibold">
            Sezione
          </p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Set Pieces
          </h1>
        </div>
        <Link
          href="/set-pieces/nuovo"
          className={buttonVariants({ size: "lg" })}
        >
          <Plus className="mr-2 h-4 w-4" />
          Aggiungi schema
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <SetPiecesFiltersSidebar
          filters={filters}
          className="hidden lg:block"
        />

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <SearchInput basePath="/set-pieces" initialQuery={filters.q} />
            </div>
            <div className="lg:hidden">
              <SetPiecesFiltersMobileTrigger filters={filters} />
            </div>
          </div>

          <SetPiecesList
            key={stateKey}
            initialItems={initialPage.items}
            initialHasMore={initialPage.hasMore}
            filters={filters}
            hasActiveSearchOrFilters={hasActiveSearchOrFilters}
          />
        </div>
      </div>
    </div>
  );
}
