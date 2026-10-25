import { Settings } from "lucide-react";
import { MISSING_SUPABASE_CONFIG_MESSAGE } from "@/lib/supabase/config";

/** Messaggio a pagina intera quando mancano le variabili Supabase. */
export function MissingConfigNotice() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div
        role="alert"
        className="max-w-lg space-y-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-6"
      >
        <p className="flex items-center gap-2 text-base font-semibold">
          <Settings className="h-5 w-5 text-destructive" />
          Configurazione mancante
        </p>
        <p className="text-sm text-muted-foreground">
          {MISSING_SUPABASE_CONFIG_MESSAGE}
        </p>
      </div>
    </div>
  );
}
