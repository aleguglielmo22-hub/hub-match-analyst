"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { moveToTrash, restoreFromTrash } from "@/app/(app)/cestino/actions";
import { TRASH_SECTION, type TrashSection } from "@/lib/trash/sections";

const UNDO_MS = 8000;

/**
 * "Sposta nel cestino" dal dettaglio: conferma, poi torna alla lista e mostra
 * una notifica con "Annulla" per qualche secondo.
 */
export function MoveToTrashButton({
  section,
  id,
  title,
}: {
  section: TrashSection;
  id: string;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const cfg = TRASH_SECTION[section];

  function handleConfirm() {
    startTransition(async () => {
      try {
        await moveToTrash(section, id);
        setOpen(false);
        router.push(cfg.listHref);
        router.refresh();
        toast.success("Spostato nel cestino", {
          description: title,
          duration: UNDO_MS,
          action: {
            label: "Annulla",
            onClick: async () => {
              try {
                await restoreFromTrash(section, id);
                toast.success("Ripristinato");
                router.push(cfg.detailHref(id));
                router.refresh();
              } catch (err) {
                const message = err instanceof Error ? err.message : "Errore sconosciuto";
                toast.error("Ripristino non riuscito", { description: message });
              }
            },
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Errore sconosciuto";
        toast.error("Operazione non riuscita", { description: message });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card/40 px-3 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 hover:text-destructive max-md:min-h-11">
        <Trash2 className="h-3.5 w-3.5" />
        Sposta nel cestino
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Spostare nel cestino?</DialogTitle>
          <DialogDescription>
            <strong>{title}</strong> uscirà da liste, ricerche e Dashboard ma
            resterà nel cestino, da dove potrai ripristinarlo. Gli allegati
            restano salvati.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
            Annulla
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sposto…
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Sì, sposta nel cestino
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
