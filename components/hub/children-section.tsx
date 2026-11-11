"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { daysUntil, formatValue, initialValues, nextReviewDate, type Option } from "@/lib/hub/fields";
import { COLLECTIONS, isCollectionKey, newLabel } from "@/lib/hub/registry";
import { statusBadgeClass } from "@/lib/hub/status";
import { deleteChildItem, markReviewed } from "@/app/(app)/hub/actions";
import { moveChild } from "@/app/(app)/hub/workout-actions";
import { ItemForm } from "./item-form";

type Row = Record<string, unknown> & { id: string };

/**
 * Sotto-voci di un elemento (capitoli di un libro, lezioni di un corso,
 * serie di un allenamento…): elenco con aggiunta e modifica in una finestra.
 */
export function ChildrenSection({
  parentCollection,
  parentId,
  childKey,
  parentField,
  label,
  rows,
  refOptions,
}: {
  parentCollection: string;
  parentId: string;
  childKey: string;
  parentField: string;
  label: string;
  rows: Row[];
  refOptions: Record<string, Option[]>;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Row | null>(null);
  const [isPending, startTransition] = useTransition();
  const c = isCollectionKey(childKey) ? COLLECTIONS[childKey] : null;
  if (!c) return null;

  const refLabels: Record<string, Record<string, string>> = {};
  for (const f of c.fields) {
    if (f.type === "ref" && f.ref) refLabels[f.key] = Object.fromEntries((refOptions[f.ref] ?? []).map((o) => [o.value, o.label]));
  }
  const cols = c.fields.filter((f) => f.inTable);

  function review(row: Row) {
    startTransition(async () => {
      const res = await markReviewed(childKey, row.id);
      if (res.ok) {
        toast.success("Ripasso segnato");
        router.refresh();
      } else toast.error("Non è stato possibile segnare il ripasso.");
    });
  }

  function move(row: Row, direction: "up" | "down") {
    startTransition(async () => {
      const res = await moveChild(childKey, row.id, direction);
      if (!res.ok) toast.error("Non è stato possibile spostare la voce.");
      router.refresh();
    });
  }

  function remove(row: Row) {
    startTransition(async () => {
      const res = await deleteChildItem(childKey, row.id);
      setConfirmDelete(null);
      if (res.ok) {
        toast.success("Eliminato");
        router.refresh();
      } else toast.error(res.message ?? "Eliminazione non riuscita.");
    });
  }

  return (
    <section className="space-y-3" aria-label={label}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">
          {label} <span className="font-normal text-muted-foreground">({rows.length})</span>
        </h2>
        <Button type="button" size="sm" variant="outline" onClick={() => setEditing("new")} className="max-md:min-h-11">
          <Plus className="mr-1 h-4 w-4" /> Aggiungi
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">Nessun elemento.</p>
      ) : (
        <ul className="divide-y divide-border/60 rounded-xl border border-border">
          {rows.map((r, idx) => {
            const due = c.reviewable ? nextReviewDate((r.completato_il as string) ?? null, Number(r.ripassi ?? 0)) : null;
            const dueIn = due ? daysUntil(due) : null;
            return (
              <li key={r.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start">
                <dl className="grid min-w-0 flex-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-[repeat(auto-fit,minmax(8rem,1fr))]">
                  {cols.map((f) => {
                    const text = formatValue(f, r[f.key], refLabels[f.key]);
                    if (!text) return null;
                    return (
                      <div key={f.key} className={cn("min-w-0", f.type === "longtext" && "sm:col-span-full")}>
                        <dt className="text-[11px] text-muted-foreground">{f.label}</dt>
                        <dd className={cn("break-words", f.type === "longtext" && "whitespace-pre-line")}>
                          {f.type === "select" && f.key === "stato" ? (
                            <span className={cn("rounded-full px-2 py-0.5 text-xs", statusBadgeClass(r[f.key]))}>{text}</span>
                          ) : (
                            text
                          )}
                        </dd>
                      </div>
                    );
                  })}
                  {c.reviewable && (
                    <div className="sm:col-span-full text-xs text-muted-foreground">
                      {Number(r.ripassi ?? 0) >= 3
                        ? "Tutti i ripassi fatti ✓"
                        : due
                          ? dueIn! <= 0
                            ? "Da ripassare oggi"
                            : `Prossimo ripasso tra ${dueIn} ${dueIn === 1 ? "giorno" : "giorni"}`
                          : "Ripassi: inizia quando lo segni come completato"}
                    </div>
                  )}
                </dl>
                <div className="flex shrink-0 items-center gap-1">
                  {c.reorderable && (
                    <>
                      <Button size="icon-sm" variant="ghost" aria-label="Sposta su" disabled={isPending || idx === 0} onClick={() => move(r, "up")} className="max-md:size-11">
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button size="icon-sm" variant="ghost" aria-label="Sposta giù" disabled={isPending || idx === rows.length - 1} onClick={() => move(r, "down")} className="max-md:size-11">
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {due && dueIn! <= 0 && (
                    <Button size="sm" variant="outline" onClick={() => review(r)} disabled={isPending} className="max-md:min-h-11">
                      <Check className="mr-1 h-3.5 w-3.5" /> Ripassato
                    </Button>
                  )}
                  <Button size="icon-sm" variant="ghost" aria-label="Modifica" onClick={() => setEditing(r)} className="max-md:size-11">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon-sm" variant="ghost" aria-label="Elimina" onClick={() => setConfirmDelete(r)} className="text-destructive max-md:size-11">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? newLabel(c) : `Modifica ${c.singular}`}</DialogTitle>
            <DialogDescription className="sr-only">Compila i campi e salva.</DialogDescription>
          </DialogHeader>
          {editing !== null && (
            <ItemForm
              key={editing === "new" ? "new" : editing.id}
              collectionKey={childKey}
              id={editing === "new" ? null : editing.id}
              initial={initialValues(c.fields, editing === "new" ? null : editing)}
              refOptions={refOptions}
              parent={editing === "new" ? { collection: parentCollection, field: parentField, id: parentId } : undefined}
              onDone={() => setEditing(null)}
              onCancel={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete !== null} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminare questo elemento?</DialogTitle>
            <DialogDescription>Le sotto-voci non passano dal cestino: l&apos;eliminazione è definitiva.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(null)} disabled={isPending}>
              Annulla
            </Button>
            <Button variant="destructive" onClick={() => confirmDelete && remove(confirmDelete)} disabled={isPending}>
              Sì, elimina
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
