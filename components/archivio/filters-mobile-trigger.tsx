"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { FiltersSidebar } from "@/components/archivio/filters-sidebar";
import {
  countActiveFilters,
  type ArchiveFilters,
} from "@/lib/schemas/filters";
import type { LookupOption } from "@/app/(app)/archivio/actions";

/**
 * Trigger compatto su mobile (<lg) che apre i filtri in un drawer laterale.
 */
export function FiltersMobileTrigger({
  filters,
  lookups,
}: {
  filters: ArchiveFilters;
  lookups: {
    teams: LookupOption[];
    competitions: LookupOption[];
    seasons: LookupOption[];
    tags: LookupOption[];
  };
}) {
  const [open, setOpen] = useState(false);
  const count = countActiveFilters(filters);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card/30 px-3 text-xs font-medium text-foreground/80 transition-colors hover:bg-muted">
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Filtri
        {count > 0 && (
          <span className="rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold text-primary">
            {count}
          </span>
        )}
      </SheetTrigger>
      <SheetContent side="left" className="w-80 overflow-y-auto p-5">
        <SheetTitle className="sr-only">Filtri</SheetTitle>
        <FiltersSidebar filters={filters} lookups={lookups} />
      </SheetContent>
    </Sheet>
  );
}
