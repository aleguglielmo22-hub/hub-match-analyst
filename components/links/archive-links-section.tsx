"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LoadErrorBox } from "@/components/app/load-error";
import {
  addArchiveLink,
  removeArchiveLink,
  type LinkKind,
  type LinkTarget,
} from "@/app/(app)/collegamenti/actions";
import { LinkPicker, LinkRow } from "./link-picker";

type OtherKind = Exclude<LinkKind, "archive">;

/**
 * Sezione "Collegamenti" con salvataggio immediato tra una voce del Cloud e
 * un'altra sezione. Si usa da entrambi i lati:
 *  - dal Cloud: `archiveId` fisso, si scelgono giocatori/piazzati/esercitazioni;
 *  - da giocatore/piazzato/esercitazione: `other` fisso, si scelgono voci del Cloud.
 */
export function ArchiveLinksSection({
  title,
  emptyText,
  canEdit,
  initial,
  ...side
}: {
  title: string;
  emptyText: string;
  canEdit: boolean;
  /** null = errore di caricamento. */
  initial: LinkTarget[] | null;
} & (
  | { archiveId: string; pick: OtherKind }
  | { other: { kind: OtherKind; id: string } }
)) {
  const [items, setItems] = useState(initial ?? []);
  const [busy, setBusy] = useState<string | null>(null);
  const router = useRouter();
  const pickKind: LinkKind = "archiveId" in side ? side.pick : "archive";

  // Coppia (voce del Cloud, altro elemento) per un collegamento.
  const pair = (t: LinkTarget) =>
    "archiveId" in side
      ? { archiveId: side.archiveId, kind: side.pick, otherId: t.id }
      : { archiveId: t.id, kind: side.other.kind, otherId: side.other.id };

  async function add(t: LinkTarget) {
    setItems((prev) => [...prev, t]);
    const p = pair(t);
    try {
      await addArchiveLink(p.archiveId, p.kind, p.otherId);
      router.refresh();
    } catch (err) {
      setItems((prev) => prev.filter((x) => x.id !== t.id));
      toast.error("Collegamento non salvato", {
        description: err instanceof Error ? err.message : "Errore sconosciuto",
      });
    }
  }

  async function remove(t: LinkTarget) {
    setBusy(t.id);
    const p = pair(t);
    try {
      await removeArchiveLink(p.archiveId, p.kind, p.otherId);
      setItems((prev) => prev.filter((x) => x.id !== t.id));
      router.refresh();
    } catch (err) {
      toast.error("Collegamento non tolto", {
        description: err instanceof Error ? err.message : "Errore sconosciuto",
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border/60 bg-card/40 p-5">
      <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {title}
        {initial ? ` (${items.length})` : ""}
      </h2>
      {initial === null ? (
        <LoadErrorBox />
      ) : (
        <>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">{emptyText}</p>
          ) : (
            <ul className="divide-y divide-border/40">
              {items.map((t) => (
                <LinkRow
                  key={t.id}
                  target={t}
                  onRemove={canEdit ? () => remove(t) : undefined}
                  removing={busy === t.id}
                />
              ))}
            </ul>
          )}
          {canEdit && (
            <LinkPicker kind={pickKind} excludeIds={items.map((t) => t.id)} onPick={add} />
          )}
        </>
      )}
    </section>
  );
}
