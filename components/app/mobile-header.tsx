"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AppSidebar } from "./app-sidebar";
import { cn } from "@/lib/utils";

/**
 * Barra in alto visibile solo su mobile (<md). Apre la sidebar in un drawer laterale.
 */
export function MobileHeader({
  email,
  isOwner,
  className,
}: {
  email: string;
  isOwner: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur",
        className,
      )}
    >
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          aria-label="Apri menu"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
        >
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Menu di navigazione</SheetTitle>
          <SheetDescription className="sr-only">
            Sezioni dell&apos;Hub Match Analyst
          </SheetDescription>
          <AppSidebar
            email={email}
            isOwner={isOwner}
            className="h-full w-full border-r-0"
            onNavigate={() => setOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-primary/15 ring-1 ring-primary/30">
          <span className="text-[9px] font-bold tracking-tight text-primary">
            HMA
          </span>
        </span>
        <span className="text-sm font-semibold tracking-tight">
          Hub Match Analyst
        </span>
      </div>
    </header>
  );
}
