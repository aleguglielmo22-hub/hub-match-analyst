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
import { Logo } from "@/components/brand/logo";

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
        "sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-sidebar-border bg-sidebar px-4 text-sidebar-foreground",
        className,
      )}
    >
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          aria-label="Apri menu"
          className="inline-flex h-11 w-11 items-center justify-center rounded-md text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Menu di navigazione</SheetTitle>
          <SheetDescription className="sr-only">
            Sezioni di AG Workspace
          </SheetDescription>
          <AppSidebar
            email={email}
            isOwner={isOwner}
            className="h-full w-full border-r-0"
            onNavigate={() => setOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <Logo size={28} />
    </header>
  );
}
