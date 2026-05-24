"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import {
  RotateCcw,
  Trash2,
  Loader2,
  Video,
  Film,
  FileText,
  Presentation,
  FileSpreadsheet,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  AMBITO_LABEL,
  CATEGORIA_LAVORO_LABEL,
  type TipoMediaEnum,
} from "@/lib/types/archivio";
import {
  hardDeleteArchiveItem,
  restoreArchiveItem,
} from "@/app/(app)/archivio/actions";
import type { ArchiveListItem } from "@/app/(app)/archivio/types";

const TIPO_MEDIA_META: Record<
  TipoMediaEnum,
  { icon: LucideIcon; label: string; tint: string }
> = {
  VIDEO_CLIP: {
    icon: Video,
    label: "Clip",
    tint: "from-emerald-500/15 to-emerald-500/5 text-emerald-300",
  },
  INTERA_PARTITA: {
    icon: Film,
    label: "Partita",
    tint: "from-cyan-500/15 to-cyan-500/5 text-cyan-300",
  },
  PDF_REPORT: {
    icon: FileText,
    label: "PDF",
    tint: "from-rose-500/15 to-rose-500/5 text-rose-300",
  },
  SLIDE_PRESENTAZIONE: {
    icon: Presentation,
    label: "Slide",
    tint: "from-amber-500/15 to-amber-500/5 text-amber-300",
  },
  EXCEL_DATI: {
    icon: FileSpreadsheet,
    label: "Excel",
    tint: "from-violet-500/15 to-violet-500/5 text-violet-300",
  },
};

export function TrashCard({
  item,
  onRemoved,
}: {
  item: ArchiveListItem;
  onRemoved: (id: string) => void;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    null | "restore" | "delete"
  >(null);
  const [, startTransition] = useTransition();

  const primaryMedia = item.tipo_media[0] ?? "PDF_REPORT";
  const meta = TIPO_MEDIA_META[primaryMedia];
  const Icon = meta.icon;
  const dataFormatted = format(parseISO(item.data_lavoro), "d MMM yyyy", {
    locale: it,
  });

  function handleRestore() {
    setPendingAction("restore");
    startTransition(async () => {
      try {
        await restoreArchiveItem(item.id);
        toast.success("Voce ripristinata");
        onRemoved(item.id);
        router.refresh();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Errore sconosciuto";
        toast.error("Ripristino fallito", { description: message });
      } finally {
        setPendingAction(null);
      }
    });
  }

  function handleHardDelete() {
    setPendingAction("delete");
    startTransition(async () => {
      try {
        await hardDeleteArchiveItem(item.id);
        toast.success("Voce eliminata definitivamente");
        setConfirmOpen(false);
        onRemoved(item.id);
        router.refresh();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Errore sconosciuto";
        toast.error("Eliminazione fallita", { description: message });
      } finally {
        setPendingAction(null);
      }
    });
  }

  const home = item.team_principale?.nome;
  const away = item.team_avversario?.nome;

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card/50">
      <div
        className={`relative flex h-16 items-center justify-between bg-gradient-to-br px-4 ${meta.tint}`}
      >
        <Icon className="h-5 w-5 opacity-80" aria-hidden />
        <span className="text-[10px] uppercase tracking-[0.18em] font-semibold opacity-70">
          {meta.label}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-1">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
            {item.titolo_archivio}
          </h3>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {dataFormatted}
          </p>
        </div>
        {(home || away) && (
          <p className="truncate text-xs text-foreground/80">
            {home && <span className="font-medium">{home}</span>}
            {home && away && (
              <span className="mx-1.5 text-muted-foreground">·</span>
            )}
            {away}
          </p>
        )}
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="text-[10px] font-medium">
            {CATEGORIA_LAVORO_LABEL[item.categoria_lavoro]}
          </Badge>
          <Badge variant="outline" className="text-[10px] font-medium">
            {AMBITO_LABEL[item.ambito]}
          </Badge>
        </div>

        <div className="mt-auto flex items-center gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1"
            disabled={!!pendingAction}
            onClick={handleRestore}
          >
            {pendingAction === "restore" ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            )}
            Ripristina
          </Button>
          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!!pendingAction}
              onClick={() => setConfirmOpen(true)}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              aria-label="Elimina definitivamente"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Eliminare definitivamente?</DialogTitle>
                <DialogDescription>
                  Questa azione è <strong>irreversibile</strong>. Verranno
                  eliminati anche i file allegati a questa voce. Non potranno
                  essere recuperati.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => setConfirmOpen(false)}
                  disabled={pendingAction === "delete"}
                >
                  Annulla
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleHardDelete}
                  disabled={pendingAction === "delete"}
                >
                  {pendingAction === "delete" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Elimino…
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Sì, elimina definitivamente
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </article>
  );
}
