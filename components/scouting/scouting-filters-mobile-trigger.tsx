"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScoutingFiltersSidebar } from "@/components/scouting/scouting-filters-sidebar";
import {
  countActiveScoutingFilters,
  type ScoutingFilters,
} from "@/lib/schemas/scouting-filters";

export function ScoutingFiltersMobileTrigger({
  filters,
}: {
  filters: ScoutingFilters;
}) {
  const [open, setOpen] = useState(false);
  const count = countActiveScoutingFilters(filters);

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
        <SheetTitle className="sr-only">Filtri Scouting</SheetTitle>
        <ScoutingFiltersSidebar filters={filters} />
      </SheetContent>
    </Sheet>
  );
}
