"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
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
import { softDeleteArchiveItem } from "@/app/(app)/archivio/actions";

export function TrashButton({ itemId }: { itemId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleConfirm() {
    startTransition(async () => {
      try {
        await softDeleteArchiveItem(itemId);
        toast.success("Voce spostata nel cestino");
        setOpen(false);
        router.push("/archivio");
        router.refresh();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Errore sconosciuto";
        toast.error("Operazione fallita", { description: message });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card/40 px-3 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Sposta nel cestino
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Spostare nel cestino?</DialogTitle>
          <DialogDescription>
            La voce uscirà dalla lista principale ma resterà recuperabile dal
            cestino per 30 giorni. I file allegati rimangono salvati.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Annulla
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending}
          >
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
