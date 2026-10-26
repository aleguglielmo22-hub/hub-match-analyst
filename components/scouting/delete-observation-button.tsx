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
import { deleteObservation } from "@/app/(app)/scouting/osservazioni/actions";

/** Elimina un'osservazione (creatore o owner), con conferma. */
export function DeleteObservationButton({ id, dateLabel }: { id: string; dateLabel: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleConfirm() {
    startTransition(async () => {
      try {
        await deleteObservation(id);
        setOpen(false);
        toast.success("Osservazione eliminata");
        router.refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Errore sconosciuto";
        toast.error("Eliminazione non riuscita", { description: message });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        aria-label="Elimina osservazione"
        title="Elimina"
        className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive max-md:h-11 max-md:w-11"
      >
        <Trash2 className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminare l&apos;osservazione?</DialogTitle>
          <DialogDescription>
            L&apos;osservazione del <strong>{dateLabel}</strong> verrà eliminata
            definitivamente. Il profilo del giocatore non cambia.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
            Annulla
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Elimina
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
