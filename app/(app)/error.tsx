"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, LayoutDashboard, Loader2, RefreshCw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

/**
 * Rete di sicurezza per errori imprevisti nell'area riservata.
 * I dettagli tecnici restano nei log del server (identificati da `digest`).
 */
export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    console.error("[Errore imprevisto]", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-8">
      <div
        role="alert"
        className="space-y-4 rounded-2xl border border-destructive/40 bg-destructive/10 p-6"
      >
        <p className="flex items-center gap-2 text-base font-semibold">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Qualcosa è andato storto
        </p>
        <p className="text-sm text-muted-foreground">
          Si è verificato un errore imprevisto durante il caricamento della
          pagina. I tuoi dati non sono andati persi.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            className="h-11 px-4"
            disabled={retrying}
            onClick={() => {
              setRetrying(true);
              unstable_retry();
            }}
          >
            {retrying ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Riprova
          </Button>
          <Link
            href="/dashboard"
            className={buttonVariants({ variant: "outline", className: "h-11 px-4" })}
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Vai alla Dashboard
          </Link>
        </div>
        {error.digest && (
          <p className="text-xs text-muted-foreground/70">
            Codice errore: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
