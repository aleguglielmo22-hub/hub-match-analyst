"use client";

import { format } from "date-fns";
import { AlertTriangle, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PendingDraft } from "./use-form-draft";

/** Avviso "bozza non salvata" in cima al form, con Ripristina e Scarta. */
export function DraftBanner({
  draft,
  onRestore,
  onDiscard,
}: {
  draft: PendingDraft | null;
  onRestore: () => void;
  onDiscard: () => void;
}) {
  if (!draft) return null;
  const when = format(draft.savedAt, "dd/MM HH:mm");
  const warn = draft.itemChangedAfter;
  const Icon = warn ? AlertTriangle : History;

  return (
    <div
      role="status"
      className={cn(
        "flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        warn
          ? "border-tone-warning/40 bg-tone-warning-soft text-tone-warning-fg"
          : "border-tone-info/40 bg-tone-info-soft text-tone-info-fg",
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="space-y-1 text-sm">
          <p className="font-medium">Hai una bozza non salvata del {when}.</p>
          {warn && (
            <p className="text-xs">
              Attenzione: questo elemento è stato modificato dopo la tua bozza.
              Ripristinandola sovrascriverai le modifiche più recenti.
            </p>
          )}
          <p className="text-xs opacity-80">
            Gli allegati non fanno parte della bozza: i file andranno riselezionati.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        {/* Con un elemento più recente l'azione evidenziata è Scarta. */}
        <Button
          type="button"
          variant={warn ? "outline" : "default"}
          onClick={onRestore}
          className="max-md:min-h-11 max-md:flex-1"
        >
          Ripristina
        </Button>
        <Button
          type="button"
          variant={warn ? "default" : "outline"}
          onClick={onDiscard}
          className="max-md:min-h-11 max-md:flex-1"
        >
          Scarta
        </Button>
      </div>
    </div>
  );
}
