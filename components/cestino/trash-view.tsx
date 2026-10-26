"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import {
  Archive,
  Brain,
  Loader2,
  RotateCcw,
  Target,
  Trash,
  Trash2,
  Users,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadErrorBox } from "@/components/app/load-error";
import {
  deleteForever,
  restoreFromTrash,
  type TrashItem,
  type TrashListResult,
} from "@/app/(app)/cestino/actions";
import { TRASH_SECTION, type TrashSection } from "@/lib/trash/sections";

const SECTION_ICON: Record<TrashSection, LucideIcon> = {
  scouting: Users,
  "set-pieces": Target,
  training: Brain,
  cloud: Archive,
};

export function TrashView({
  initial,
  isOwner,
  filtered,
}: {
  initial: TrashListResult;
  isOwner: boolean;
  /** True se è attiva una ricerca (cambia il messaggio "vuoto"). */
  filtered: boolean;
}) {
  const [items, setItems] = useState(initial.items);
  const [confirm, setConfirm] = useState<TrashItem | null>(null);
  const router = useRouter();

  const remove = (item: TrashItem) =>
    setItems((prev) => prev.filter((i) => !(i.id === item.id && i.section === item.section)));

  return (
    <div className="flex flex-col gap-4">
      {initial.failed.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-destructive">
            Non è stato possibile caricare:{" "}
            {initial.failed.map((s) => TRASH_SECTION[s].label).join(", ")}.
          </p>
          <LoadErrorBox />
        </div>
      )}

      {items.length === 0 && initial.failed.length === 0 ? (
        <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-dashed border-border/60 bg-card/20 px-6 py-12 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <Trash className="h-5 w-5" />
          </span>
          <p className="text-sm font-medium">
            {filtered ? "Nessun risultato nel cestino" : "Il cestino è vuoto"}
          </p>
          {filtered && (
            <p className="text-xs text-muted-foreground">Prova un&apos;altra ricerca.</p>
          )}
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {items.length === 1 ? "1 elemento" : `${items.length} elementi`}
            {initial.truncated && " (mostrati i più recenti)"}
          </p>
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <TrashRow
                key={`${item.section}:${item.id}`}
                item={item}
                isOwner={isOwner}
                onRestored={() => {
                  remove(item);
                  router.refresh();
                }}
                onAskDelete={() => setConfirm(item)}
              />
            ))}
          </ul>
        </>
      )}

      <DeleteForeverDialog
        item={confirm}
        onClose={() => setConfirm(null)}
        onDeleted={(item) => {
          remove(item);
          setConfirm(null);
          router.refresh();
        }}
      />
    </div>
  );
}

function TrashRow({
  item,
  isOwner,
  onRestored,
  onAskDelete,
}: {
  item: TrashItem;
  isOwner: boolean;
  onRestored: () => void;
  onAskDelete: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const Icon = SECTION_ICON[item.section];
  const deletedFmt = format(parseISO(item.deleted_at), "d MMM yyyy, HH:mm", { locale: it });

  function handleRestore() {
    startTransition(async () => {
      try {
        await restoreFromTrash(item.section, item.id);
        toast.success("Ripristinato", { description: item.title });
        onRestored();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Errore sconosciuto";
        toast.error("Ripristino non riuscito", { description: message });
      }
    });
  }

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-card/40 p-3 sm:flex-nowrap">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" title={item.title}>
          {item.title}
        </p>
        <p className="truncate text-[11px] text-muted-foreground">
          {TRASH_SECTION[item.section].label}
          {item.subtitle && ` · ${item.subtitle}`} · nel cestino dal {deletedFmt}
        </p>
      </div>
      <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
        {item.can_restore && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-none max-md:min-h-11"
            disabled={isPending}
            onClick={handleRestore}
          >
            {isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            )}
            Ripristina
          </Button>
        )}
        {isOwner && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={onAskDelete}
            className="flex-1 text-destructive hover:bg-destructive/10 hover:text-destructive sm:flex-none max-md:min-h-11"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Elimina definitivamente
          </Button>
        )}
      </div>
    </li>
  );
}

function DeleteForeverDialog({
  item,
  onClose,
  onDeleted,
}: {
  item: TrashItem | null;
  onClose: () => void;
  onDeleted: (item: TrashItem) => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!item) return;
    startTransition(async () => {
      try {
        await deleteForever(item.section, item.id);
        toast.success("Eliminato definitivamente", { description: item.title });
        onDeleted(item);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Errore sconosciuto";
        toast.error("Eliminazione non riuscita", { description: message });
      }
    });
  }

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && !isPending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminare definitivamente?</DialogTitle>
          <DialogDescription>
            Stai per eliminare <strong>«{item?.title}»</strong> (
            {item ? TRASH_SECTION[item.section].label : ""}) insieme a tutti i
            suoi file allegati. L&apos;azione è <strong>irreversibile</strong>.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Annulla
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Elimino…
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4 shrink-0" />
                <span className="max-w-[14rem] truncate">Elimina «{item?.title}»</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
