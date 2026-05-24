import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PlayersList } from "@/components/scouting/players-list";
import { ScoutingFiltersSidebar } from "@/components/scouting/scouting-filters-sidebar";
import { ScoutingFiltersMobileTrigger } from "@/components/scouting/scouting-filters-mobile-trigger";
import { SearchInput } from "@/components/archivio/search-input";
import { loadPlayersPage } from "./actions";
import {
  countActiveScoutingFilters,
  parseScoutingFiltersFromSearchParams,
} from "@/lib/schemas/scouting-filters";

export const metadata = {
  title: "Scouting · Hub Match Analyst",
};

export const dynamic = "force-dynamic";

export default async function ScoutingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseScoutingFiltersFromSearchParams(sp);

  const initialPage = await loadPlayersPage({
    sort: "recent",
    page: 0,
    filters,
  });

  const activeCount = countActiveScoutingFilters(filters);
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
            Scouting
          </h1>
        </div>
        <Link
          href="/scouting/nuovo"
          className={buttonVariants({ size: "lg" })}
        >
          <Plus className="mr-2 h-4 w-4" />
          Aggiungi giocatore
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <ScoutingFiltersSidebar
          filters={filters}
          className="hidden lg:block"
        />

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <SearchInput basePath="/scouting" initialQuery={filters.q} />
            </div>
            <div className="lg:hidden">
              <ScoutingFiltersMobileTrigger filters={filters} />
            </div>
          </div>

          <PlayersList
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
