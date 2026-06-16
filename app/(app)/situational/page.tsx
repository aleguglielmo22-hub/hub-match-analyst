import Link from "next/link";
import { Plus, Brain } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { SectionHeader } from "@/components/app/section-header";
import { SituationalList } from "@/components/situational/situational-list";
import { SituationalFiltersSidebar } from "@/components/situational/situational-filters-sidebar";
import { SituationalFiltersMobileTrigger } from "@/components/situational/situational-filters-mobile-trigger";
import { SearchInput } from "@/components/archivio/search-input";
import { listFocusTags, loadSituationalPage } from "./actions";
import {
  countActiveSituationalFilters,
  parseSituationalFiltersFromSearchParams,
} from "@/lib/schemas/situational-filters";

export const metadata = {
  title: "Training · Football Hub",
};

export const dynamic = "force-dynamic";

export default async function SituationalPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseSituationalFiltersFromSearchParams(sp);

  const [initialPage, focusTags] = await Promise.all([
    loadSituationalPage({ sort: "recent", page: 0, filters }),
    listFocusTags(),
  ]);

  const activeCount = countActiveSituationalFilters(filters);
  const hasActiveSearchOrFilters = activeCount > 0 || !!filters.q;
  const stateKey = JSON.stringify(filters);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-10">
      <SectionHeader
        icon={Brain}
        title="Training"
        subtitle="Catalogo esercitazioni e situazioni di gioco"
        actions={
          <Link href="/situational/nuovo" className={buttonVariants({ size: "lg" })}>
            <Plus className="mr-2 h-4 w-4" />
            Nuova situazione
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <SituationalFiltersSidebar
          filters={filters}
          availableFocusTags={focusTags}
          className="hidden lg:block"
        />

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <SearchInput basePath="/situational" initialQuery={filters.q} />
            </div>
            <div className="lg:hidden">
              <SituationalFiltersMobileTrigger
                filters={filters}
                availableFocusTags={focusTags}
              />
            </div>
          </div>

          <SituationalList
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
