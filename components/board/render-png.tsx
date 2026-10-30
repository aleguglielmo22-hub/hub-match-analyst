"use client";

import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { viewSize, type BoardData } from "@/lib/board/model";
import { BoardStage, readBoardColors } from "./board-stage";

const PREVIEW_WIDTH = 1200;

/**
 * Immagine PNG della lavagna, disegnata fuori dallo schermo con lo stesso
 * componente dell'editor. Usata per l'anteprima salvata nel bucket "media".
 */
export function renderBoardPng(board: BoardData, width = PREVIEW_WIDTH): Promise<Blob> {
  const view = viewSize(board.field);
  const height = Math.round((width * view.h) / view.w);
  const host = document.createElement("div");
  const root = createRoot(host);
  return new Promise<Blob>((resolve, reject) => {
    const finish = (err: Error | null, blob?: Blob) => {
      // Smontato dopo il disegno, fuori dal ciclo di render.
      setTimeout(() => root.unmount(), 0);
      if (err || !blob) reject(err ?? new Error("Anteprima vuota"));
      else resolve(blob);
    };
    try {
      flushSync(() => {
        root.render(
          <BoardStage
            board={board}
            width={width}
            height={height}
            colors={readBoardColors()}
            onReady={(stage) => {
              stage
                .toBlob({ pixelRatio: 1, mimeType: "image/png" })
                .then((b) => finish(null, b as Blob))
                .catch((e: unknown) => finish(e instanceof Error ? e : new Error(String(e))));
            }}
          />,
        );
      });
    } catch (e) {
      finish(e instanceof Error ? e : new Error(String(e)));
    }
  });
}
