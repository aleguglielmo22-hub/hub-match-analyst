import Link from "next/link";
import { Plus, Archive } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export function ArchiveEmpty() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-border/70 bg-card/30 py-16 text-center">
      <div className="relative">
        <span className="absolute -inset-6 -z-10 rounded-full bg-primary/10 blur-2xl" />
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/15 ring-1 ring-primary/30 text-primary">
          <Archive className="h-7 w-7" />
        </span>
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">
          Archivio vuoto
        </h2>
        <p className="text-sm text-muted-foreground">
          Aggiungi la prima voce: una partita analizzata, un report, una clip
          di studio.
        </p>
      </div>
      <Link
        href="/archivio/nuovo"
        className={buttonVariants({ size: "lg" })}
      >
        <Plus className="mr-2 h-4 w-4" />
        Aggiungi la prima voce
      </Link>
    </div>
  );
}
