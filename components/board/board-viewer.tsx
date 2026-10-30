"use client";

import { useState } from "react";
import { Maximize2 } from "lucide-react";
import type { BoardData } from "@/lib/board/model";
import { LazyBoardEditor, LocalBoardPreview } from "./board-field";

/**
 * Dettaglio: anteprima grande della lavagna; un tocco la apre a tutto
 * schermo in sola lettura. Senza PNG salvato l'anteprima si disegna nel browser.
 */
export function BoardViewer({
  board,
  previewUrl,
  title,
}: {
  board: BoardData;
  previewUrl: string | null;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative block w-full overflow-hidden rounded-xl border border-border/60 text-left"
        aria-label="Apri la lavagna a tutto schermo"
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt={`Lavagna: ${title}`} className="w-full" />
        ) : (
          <LocalBoardPreview board={board} alt={`Lavagna: ${title}`} />
        )}
        <span className="absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-md bg-background/85 px-2 py-1 text-xs font-medium shadow">
          <Maximize2 className="h-3.5 w-3.5" />
          Apri
        </span>
      </button>
      {open && <LazyBoardEditor initial={board} readOnly title={title} onClose={() => setOpen(false)} />}
    </>
  );
}
