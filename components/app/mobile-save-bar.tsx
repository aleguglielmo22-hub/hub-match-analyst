"use client";

import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Barra "Salva" fissa in basso, solo su mobile: sempre raggiungibile col pollice.
 * Prende il posto della barra di navigazione nelle pagine con un form
 * (vedi isFormRoute in mobile-bottom-nav.tsx). Va messa DENTRO il <form>.
 */
export function MobileSaveBar({
  label,
  submitting,
  onCancel,
}: {
  label: string;
  submitting: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-border/60 bg-background/95 px-4 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur md:hidden">
      <Button
        type="button"
        variant="ghost"
        className="h-11 px-4"
        disabled={submitting}
        onClick={onCancel}
      >
        Annulla
      </Button>
      <Button type="submit" className="h-11 flex-1" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Salvataggio…
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            {label}
          </>
        )}
      </Button>
    </div>
  );
}
