"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Riquadro "errore di caricamento" con pulsante Riprova (44 px).
 * Senza `onRetry` ricarica i dati della pagina dal server (router.refresh).
 */
export function LoadErrorBox({
  onRetry,
  retrying = false,
  className,
}: {
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const busy = retrying || refreshing;

  function retry() {
    if (onRetry) onRetry();
    else startRefresh(() => router.refresh());
  }

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-5 sm:flex-row sm:items-center",
        className,
      )}
    >
      <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
      <div className="flex-1 space-y-0.5">
        <p className="text-sm font-semibold">Impossibile caricare i dati.</p>
        <p className="text-sm text-muted-foreground">
          I tuoi dati non sono andati persi: il server non ha risposto.
        </p>
      </div>
      <Button
        variant="outline"
        className="h-11 px-4"
        disabled={busy}
        onClick={retry}
      >
        {busy ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="mr-2 h-4 w-4" />
        )}
        Riprova
      </Button>
    </div>
  );
}

/** Versione a pagina intera per dettaglio e modifica. */
export function PageLoadError() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-10">
      <LoadErrorBox />
    </div>
  );
}
