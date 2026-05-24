import Link from "next/link";
import { ArrowLeft, Info } from "lucide-react";
import { TrashList } from "@/components/archivio/trash-list";
import { SearchInput } from "@/components/archivio/search-input";
import { loadArchivePage } from "@/app/(app)/archivio/actions";
import { EMPTY_FILTERS } from "@/lib/schemas/filters";

export const metadata = {
  title: "Cestino · Archivio",
};

export const dynamic = "force-dynamic";

export default async function CestinoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const queryRaw = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const query = queryRaw?.trim() || undefined;

  const initialPage = await loadArchivePage({
    sort: "recent",
    page: 0,
    filters: EMPTY_FILTERS,
    query,
    inTrash: true,
  });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-10">
      <div className="space-y-2">
        <Link
          href="/archivio"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Torna all&apos;archivio
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Cestino
        </h1>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-amber-200">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p className="text-xs leading-relaxed">
          Le voci nel cestino vengono eliminate definitivamente dopo{" "}
          <strong>30 giorni</strong>. Puoi ripristinarle in qualunque momento o
          rimuoverle subito in modo permanente. L&apos;eliminazione
          definitiva rimuove anche i file allegati dallo storage.
        </p>
      </div>

      <div>
        <SearchInput basePath="/archivio/cestino" initialQuery={query} />
      </div>

      <TrashList
        key={query ?? ""}
        initialItems={initialPage.items}
        initialHasMore={initialPage.hasMore}
        query={query}
      />
    </div>
  );
}
