"use client";

import { useEffect, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Loader2, Maximize2, PencilLine, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { emptyBoard, isBoardEmpty, type BoardData, type BoardEntity } from "@/lib/board/model";
import { uploadBoardPreview } from "./upload-preview";

/** Editor caricato solo quando si apre la lavagna (Konva non pesa sulle altre pagine). */
export const LazyBoardEditor = dynamic(() => import("./board-editor"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-background/90">
      <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Caricamento lavagna" />
    </div>
  ),
});

/** Anteprima disegnata nel browser dai dati (prima del salvataggio o se manca il PNG). */
export function LocalBoardPreview({ board, alt }: { board: BoardData; alt: string }) {
  const [url, setUrl] = useState<{ for: BoardData; src: string } | null>(null);
  useEffect(() => {
    let cancelled = false;
    let src: string | null = null;
    import("./render-png")
      .then(({ renderBoardPng }) => renderBoardPng(board, 800))
      .then((blob) => {
        if (cancelled) return;
        src = URL.createObjectURL(blob);
        setUrl({ for: board, src });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (src) URL.revokeObjectURL(src);
    };
  }, [board]);
  if (!url || url.for !== board) {
    return (
      <div className="grid aspect-[3/2] w-full place-items-center rounded-lg bg-muted/40">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url.src} alt={alt} className="w-full rounded-lg border border-border/60" />;
}

/**
 * Sezione "Lavagna" dei form di piazzati ed esercitazioni: anteprima,
 * "Apri lavagna", "Rimuovi". I dati stanno nei valori del form (bozza inclusa).
 * Con `previewMissing` (lavagna salvata ma anteprima non generata) propone
 * "Rigenera anteprima" sui dati salvati.
 */
export function BoardField({
  value,
  onChange,
  title,
  entity,
  itemId,
  savedBoard,
  previewMissing,
}: {
  value: BoardData | null;
  onChange: (next: BoardData | null) => void;
  title: string;
  entity: BoardEntity;
  itemId: string | null;
  savedBoard?: BoardData | null;
  previewMissing?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [regenerating, startRegenerate] = useTransition();
  const router = useRouter();
  const hasBoard = !!value && !isBoardEmpty(value);

  function regenerate() {
    if (!itemId || !savedBoard) return;
    startRegenerate(async () => {
      const ok = await uploadBoardPreview(entity, itemId, savedBoard);
      if (ok) {
        toast.success("Anteprima della lavagna generata");
        router.refresh();
      } else {
        toast.error("Anteprima non generata", { description: "Riprova tra poco." });
      }
    });
  }

  return (
    <div className="space-y-3">
      {hasBoard ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="block w-full max-w-xl overflow-hidden rounded-lg text-left"
          aria-label="Apri lavagna"
        >
          <LocalBoardPreview board={value} alt={`Lavagna: ${title}`} />
        </button>
      ) : (
        <p className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-sm text-muted-foreground">
          Nessuna lavagna. Disegna lo schema con giocatori, frecce e zone, oppure parti da uno schema pronto.
        </p>
      )}

      {previewMissing && savedBoard && itemId && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-tone-warning/40 bg-tone-warning-soft px-3 py-2 text-xs text-tone-warning-fg">
          <span className="flex-1">Lavagna salvata, anteprima non generata.</span>
          <Button type="button" size="sm" variant="outline" onClick={regenerate} disabled={regenerating}>
            {regenerating ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
            Rigenera anteprima
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => setOpen(true)} className="max-md:min-h-11">
          {hasBoard ? <Maximize2 className="mr-1.5 h-4 w-4" /> : <PencilLine className="mr-1.5 h-4 w-4" />}
          {hasBoard ? "Apri lavagna" : "Disegna lavagna"}
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              if (window.confirm("Rimuovere la lavagna? Verrà tolta al salvataggio del form.")) onChange(null);
            }}
            className="text-destructive max-md:min-h-11"
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            Rimuovi
          </Button>
        )}
      </div>

      {open && (
        <LazyBoardEditor
          initial={value ?? emptyBoard("half")}
          title={title}
          onClose={() => setOpen(false)}
          onDone={(board) => {
            onChange(isBoardEmpty(board) ? null : board);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}
