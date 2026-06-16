import Link from "next/link";
import { Plus, Archive } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { SectionHeader } from "@/components/app/section-header";
import { ArchiveList } from "@/components/archivio/archive-list";
import { FiltersSidebar } from "@/components/archivio/filters-sidebar";
import { FiltersMobileTrigger } from "@/components/archivio/filters-mobile-trigger";
import { SearchInput } from "@/components/archivio/search-input";
import {
  getLookupOptions,
  loadArchivePage,
} from "./actions";
import {
  countActiveFilters,
  parseFiltersFromSearchParams,
} from "@/lib/schemas/filters";

export const metadata = {
  title: "Cloud · Football Hub",
};

export const dynamic = "force-dynamic";

export default async function ArchivioPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseFiltersFromSearchParams(sp);
  const queryRaw = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const query = queryRaw?.trim() || undefined;

  const [lookups, initialPage] = await Promise.all([
    getLookupOptions(),
    loadArchivePage({ sort: "recent", page: 0, filters, query }),
  ]);

  const activeCount = countActiveFilters(filters);
  const hasActiveSearchOrFilters = activeCount > 0 || !!query;

  // Stringa filtri+query: usata come key di ArchiveList per resettare paginazione
  // quando l'utente cambia un filtro nella sidebar (cambia l'URL).
  const stateKey = JSON.stringify({ filters, query });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-10">
      <SectionHeader
        icon={Archive}
        title="Cloud"
        subtitle="Archivio video e documenti del workspace"
        actions={
          <>
            <Link
              href="/archivio/cestino"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Cestino
            </Link>
            <Link href="/archivio/nuovo" className={buttonVariants({ size: "lg" })}>
              <Plus className="mr-2 h-4 w-4" />
              Nuova voce
            </Link>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <FiltersSidebar
          filters={filters}
          lookups={lookups}
          className="hidden lg:block"
        />

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <SearchInput basePath="/archivio" initialQuery={query} />
            </div>
            <div className="lg:hidden">
              <FiltersMobileTrigger filters={filters} lookups={lookups} />
            </div>
          </div>

          <ArchiveList
            key={stateKey}
            initialItems={initialPage.items}
            initialHasMore={initialPage.hasMore}
            initialSort="recent"
            filters={filters}
            query={query}
            hasActiveSearchOrFilters={hasActiveSearchOrFilters}
          />
        </div>
      </div>
    </div>
  );
}
