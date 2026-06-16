"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SituationalFiltersSidebar } from "@/components/situational/situational-filters-sidebar";
import {
  countActiveSituationalFilters,
  type SituationalFilters,
} from "@/lib/schemas/situational-filters";

export function SituationalFiltersMobileTrigger({
  filters,
  availableFocusTags,
}: {
  filters: SituationalFilters;
  availableFocusTags: string[];
}) {
  const [open, setOpen] = useState(false);
  const count = countActiveSituationalFilters(filters);
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
        <SheetTitle className="sr-only">Filtri Training</SheetTitle>
        <SituationalFiltersSidebar
          filters={filters}
          availableFocusTags={availableFocusTags}
        />
      </SheetContent>
    </Sheet>
  );
}
