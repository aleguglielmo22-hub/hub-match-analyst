import Link from "next/link";
import { LayoutDashboard, SearchX } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function AppNotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-8">
      <div className="space-y-4 rounded-2xl border border-border/60 bg-card/40 p-6">
        <p className="flex items-center gap-2 text-base font-semibold">
          <SearchX className="h-5 w-5 text-muted-foreground" />
          Pagina non trovata
        </p>
        <p className="text-sm text-muted-foreground">
          L&apos;elemento che cerchi non esiste, è stato eliminato oppure
          l&apos;indirizzo non è corretto.
        </p>
        <Link
          href="/dashboard"
          className={buttonVariants({ variant: "outline", className: "h-11 px-4" })}
        >
          <LayoutDashboard className="mr-2 h-4 w-4" />
          Vai alla Dashboard
        </Link>
      </div>
    </div>
  );
}
